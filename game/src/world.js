// Midnight Vault — the simulation. One gallery room, a thief, patrolling guards
// with vision cones, sweeping security cameras, one golden idol to steal and an
// alarm meter that decides whether the night ends in a clean getaway or cuffs.
import { ALARM, CAMERA, FIELD, GUARD, LOOT_VALUE, MAX_ALARM, PLAYER, STEP, TIME_BONUS_PER_SECOND } from './config.js';
import { mulberry32 } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_GRAB = 1;
export const EVENT_WIN = 2;
export const EVENT_BUSTED = 4;
export const EVENT_SPOTTED = 8;

const TAU = Math.PI * 2;

// Interior walls and display cases. They block movement and block sight.
const OBSTACLES = [
  { x: 210, y: 0, w: 26, h: 170 }, // north-west partition
  { x: 210, y: 430, w: 26, h: 170 }, // south-west partition
  { x: 470, y: 130, w: 26, h: 200 }, // central pillar wall
  { x: 700, y: 330, w: 26, h: 270 }, // south-east partition
  { x: 330, y: 430, w: 150, h: 26 }, // display case row, lower hall
  { x: 560, y: 130, w: 150, h: 26 }, // display case row, upper hall
  { x: 800, y: 200, w: 130, h: 26 }, // case guarding the vault approach
];

const GUARD_ROUTES = [
  { waypoints: [[330, 90], [640, 90], [740, 90], [740, 180], [520, 180], [520, 360], [360, 360], [360, 90]], start: 0 },
  { waypoints: [[760, 470], [900, 470], [900, 250], [760, 250]], start: 1 },
  { waypoints: [[120, 300], [120, 120], [380, 120], [380, 380], [200, 380], [200, 480], [120, 480]], start: 2 },
];

const CAMERAS = [
  { x: 480, y: 8, baseAngle: Math.PI / 2, phase: 0 },
  { x: 952, y: 300, baseAngle: Math.PI, phase: 1.7 },
];

export const LOOT = { x: 868, y: 92, radius: 16 };
export const EXIT_ZONE = { x: 0, y: 516, w: 64, h: 84 };
export const SPAWN = { x: 96, y: 552 };

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

// True when segment (x1,y1)-(x2,y2) touches rectangle r.
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

function hasLineOfSight(x1, y1, x2, y2) {
  for (let i = 0; i < OBSTACLES.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, OBSTACLES[i])) return false;
  }
  return true;
}

function circleHitsObstacle(x, y, radius) {
  if (x - radius < 0 || x + radius > FIELD.width || y - radius < 0 || y + radius > FIELD.height) return true;
  for (let i = 0; i < OBSTACLES.length; i += 1) {
    const r = OBSTACLES[i];
    const cx = Math.max(r.x, Math.min(x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(y, r.y + r.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

function moveCircle(body, dx, dy, radius) {
  const nx = body.x + dx;
  if (!circleHitsObstacle(nx, body.y, radius)) body.x = nx;
  const ny = body.y + dy;
  if (!circleHitsObstacle(body.x, ny, radius)) body.y = ny;
}

function makeGuard(route) {
  const [sx, sy] = route.waypoints[route.start];
  return {
    x: sx,
    y: sy,
    angle: 0,
    waypoint: (route.start + 1) % route.waypoints.length,
    route: route.waypoints,
    chasing: false,
  };
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.reset();
  }

  reset() {
    this.rng = mulberry32(this.seed);
    this.time = 0;
    this.alarm = 0;
    this.score = 0;
    this.hasLoot = false;
    this.over = false;
    this.won = false;
    this.spotted = false;
    this.wasSpotted = false;
    this.grabFlash = 0;
    this.player = { x: SPAWN.x, y: SPAWN.y, angle: -Math.PI / 2, moving: false, sneaking: false };
    this.guards = GUARD_ROUTES.map(makeGuard);
    this.cameras = CAMERAS.map((c) => ({ ...c, angle: c.baseAngle }));
    this.sparkles = [];
    for (let i = 0; i < 14; i += 1) {
      this.sparkles.push({
        a: this.rng() * TAU,
        r: 20 + this.rng() * 26,
        speed: 0.6 + this.rng() * 1.4,
        size: 1 + this.rng() * 2,
      });
    }
  }

  // A detector (guard or camera) sees the thief when the thief is inside its
  // cone, within range, and no wall or case stands between them.
  seesPlayer(detector, range, halfAngle) {
    const dx = this.player.x - detector.x;
    const dy = this.player.y - detector.y;
    const dist = Math.hypot(dx, dy);
    const reach = this.player.sneaking ? range * PLAYER.sneakSpotFactor : range;
    if (dist > reach) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), detector.angle)) > halfAngle) return false;
    return hasLineOfSight(detector.x, detector.y, this.player.x, this.player.y);
  }

  step(dt, input) {
    if (this.over) return EVENT_NONE;
    this.time += dt;
    let events = EVENT_NONE;

    // --- player ---
    const p = this.player;
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    p.sneaking = Boolean(input.sneak);
    p.moving = mx !== 0 || my !== 0;
    if (p.moving) {
      const len = Math.hypot(mx, my);
      const speed = p.sneaking ? PLAYER.sneakSpeed : PLAYER.speed;
      moveCircle(p, (mx / len) * speed * dt, (my / len) * speed * dt, PLAYER.radius);
      p.angle = Math.atan2(my, mx);
    }

    // --- cameras sweep ---
    for (const cam of this.cameras) {
      cam.angle = cam.baseAngle + Math.sin(this.time * CAMERA.sweepSpeed + cam.phase) * CAMERA.sweepArc;
    }

    // --- detection ---
    let seen = false;
    for (const g of this.guards) if (this.seesPlayer(g, GUARD.viewRange, GUARD.viewHalfAngle)) { seen = true; break; }
    if (!seen) {
      for (const cam of this.cameras) if (this.seesPlayer(cam, CAMERA.viewRange, CAMERA.viewHalfAngle)) { seen = true; break; }
    }
    this.spotted = seen;
    if (seen && !this.wasSpotted) events |= EVENT_SPOTTED;
    this.wasSpotted = seen;
    this.alarm = Math.max(0, Math.min(MAX_ALARM,
      this.alarm + (seen ? ALARM.risePerSecond : -ALARM.decayPerSecond) * dt));

    // --- guards: patrol, or chase while the alarm is hot ---
    const chasing = this.alarm >= ALARM.chaseAt;
    for (const g of this.guards) {
      const wasChasing = g.chasing;
      g.chasing = chasing || (wasChasing && this.alarm >= ALARM.calmAt);
      if (g.chasing) {
        const dx = p.x - g.x;
        const dy = p.y - g.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          const speed = GUARD.chaseSpeed;
          moveCircle(g, (dx / dist) * speed * dt, (dy / dist) * speed * dt, GUARD.radius);
          g.angle = Math.atan2(dy, dx);
        }
      } else {
        const [tx, ty] = g.route[g.waypoint];
        const dx = tx - g.x;
        const dy = ty - g.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) {
          g.waypoint = (g.waypoint + 1) % g.route.length;
        } else {
          moveCircle(g, (dx / dist) * GUARD.patrolSpeed * dt, (dy / dist) * GUARD.patrolSpeed * dt, GUARD.radius);
          g.angle = Math.atan2(dy, dx);
        }
      }
      // Caught in the open: a guard touching the thief ends the night.
      if (Math.hypot(p.x - g.x, p.y - g.y) < GUARD.radius + PLAYER.radius - 2) {
        this.over = true;
        this.won = false;
        return events | EVENT_BUSTED;
      }
    }

    // --- loot ---
    if (!this.hasLoot && input.interact) {
      const d = Math.hypot(p.x - LOOT.x, p.y - LOOT.y);
      if (d <= PLAYER.grabRange) {
        this.hasLoot = true;
        this.score += LOOT_VALUE;
        this.grabFlash = 1;
        events |= EVENT_GRAB;
      }
    }
    this.grabFlash = Math.max(0, this.grabFlash - dt * 2);

    // --- win: loot in hand, back out the service door ---
    if (this.hasLoot && p.x >= EXIT_ZONE.x && p.x <= EXIT_ZONE.x + EXIT_ZONE.w
      && p.y >= EXIT_ZONE.y && p.y <= EXIT_ZONE.y + EXIT_ZONE.h) {
      this.score += Math.max(0, Math.round(TIME_BONUS_PER_SECOND * Math.max(0, 240 - this.time)));
      this.over = true;
      this.won = true;
      return events | EVENT_WIN;
    }

    // --- alarm maxes out: the whole building locks down ---
    if (this.alarm >= MAX_ALARM) {
      this.over = true;
      this.won = false;
      return events | EVENT_BUSTED;
    }

    // Loot sparkles drift for the renderer's glow.
    for (const s of this.sparkles) s.a += s.speed * dt;
    return events;
  }
}

export { FIELD, OBSTACLES, STEP };
