// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a cautious
// autopilot that sneaks along a fixed route, grabs the idol and heads for the exit,
// backing off to the previous waypoint whenever a guard or camera spots it — so
// the frame is what a short real game looks like and the same seed always gives
// the same frame.
import { EVENT_BUSTED, EVENT_WIN, LOOT } from './world.js';
import { PLAYER, SCREEN_BUSTED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, STEP } from './config.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 300;
const SAMPLE = STEP;

// The sneaking route in: left corridor, across the middle hall, up the right side
// to the vault. The way out reverses it and finishes at the EXIT door.
const ROUTE_IN = [
  [150, 300], [300, 300], [420, 380], [560, 380], [660, 300],
  [760, 280], [760, 180], [840, 170], [868, 120],
];
const ROUTE_OUT = [
  [760, 280], [660, 300], [560, 380], [420, 380], [300, 300], [150, 300], [40, 552],
];

function directionTo(world, tx, ty) {
  const dx = tx - world.player.x;
  const dy = ty - world.player.y;
  const dist = Math.hypot(dx, dy);
  // Arrive within a generous radius: a tight per-axis threshold leaves a dead
  // zone where neither axis moves yet the target is still out of reach.
  if (dist < 8) return { up: false, down: false, left: false, right: false, arrived: true };
  return {
    up: dy < -1, down: dy > 1, left: dx < -1, right: dx > 1, arrived: false,
  };
}

/**
 * Steer the thief one step. `route` is the waypoint list, `index` the waypoint
 * being chased, `home` the safe spot to fall back to when spotted at the first
 * waypoint (the spawn on the way in, the vault alcove on the way out). While
 * spotted the thief backs up along the route it already walked — ground the
 * guards have already swept — until the alarm cools, then carries on.
 */
function autopilot(world, route, index, home) {
  const p = world.player;
  // Run, don't sneak, once a guard is actively chasing — the thief at full
  // speed (175) outruns a chasing guard (118); sneaking (88) does not.
  const chased = world.alarm >= 40 || world.guards.some((g) => g.chasing);
  const input = { up: false, down: false, left: false, right: false, sneak: !chased, interact: false };
  if (!world.hasLoot && Math.hypot(p.x - LOOT.x, p.y - LOOT.y) <= PLAYER.grabRange) {
    input.interact = true;
    return { input, index };
  }
  if (world.spotted && world.alarm > 8) {
    // Fall back: previous waypoint, or home when already at the first one.
    const [hx, hy] = index > 0 ? route[index - 1] : home;
    const move = directionTo(world, hx, hy);
    if (!move.arrived) Object.assign(input, move);
    return { input, index };
  }
  let target = index;
  // Timing gate at the crossing past guard 2's beat: the thief only steps onto
  // the (760, 280) waypoint while guard 2 is on the far half of its patrol,
  // and waits at the previous waypoint until then.
  if (target < route.length && route[target][0] === 760 && route[target][1] === 280 && !chased) {
    const g2 = world.guards[1];
    if (Math.hypot(g2.x - 760, g2.y - 280) < 170) return { input, index };
  }
  if (target >= route.length) return { input, index };
  if (target >= route.length) return { input, index };
  const [tx, ty] = route[target];
  const move = directionTo(world, tx, ty);
  if (move.arrived) {
    index = Math.min(target + 1, route.length);
    if (index >= route.length) return { input, index };
    const next = directionTo(world, route[index][0], route[index][1]);
    Object.assign(input, next);
  } else {
    Object.assign(input, move);
  }
  return { input, index };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { up: false, down: false, left: false, right: false, sneak: false, interact: false });
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let index = 0;
  let route = ROUTE_IN;
  let home = [96, 552];
  for (let i = 0; i < limit / STEP; i += 1) {
    if (world.hasLoot && route === ROUTE_IN) {
      route = ROUTE_OUT;
      home = [868, 120];
      index = 0;
    }
    const step = autopilot(world, route, index, home);
    index = step.index;
    const events = world.step(STEP, step.input);
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.score };
    if (events & EVENT_BUSTED) return { screen: SCREEN_BUSTED, best: world.score };
    if (name === 'play' && world.hasLoot && route === ROUTE_OUT && index >= ROUTE_OUT.length) break;
  }
  return { screen: world.over ? (world.won ? SCREEN_WIN : SCREEN_BUSTED) : SCREEN_PLAY, best: world.score };
}
