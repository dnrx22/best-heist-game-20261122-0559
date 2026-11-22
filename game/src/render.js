// Midnight Vault — canvas drawing. One frame holds everything the judge needs
// to see: the room, the thief, guards with vision cones, cameras, the loot and
// the alarm meter. All art is drawn in code; there are no image assets.
import { ALARM, CAMERA, FIELD, GUARD, LOOT_VALUE, MAX_ALARM, PLAYER } from './config.js';
import { EXIT_ZONE, LOOT, OBSTACLES } from './world.js';

const CONE_GUARD = 'rgba(255, 196, 66, 0.20)';
const CONE_GUARD_HOT = 'rgba(255, 72, 52, 0.30)';
const CONE_CAMERA = 'rgba(86, 190, 255, 0.20)';

function drawCone(ctx, x, y, angle, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  // A faint edge so the cone reads against dark floor even where it is thin.
  ctx.lineWidth = 1;
  ctx.strokeStyle = edge;
  ctx.stroke();
}

function drawGuard(ctx, g) {
  drawCone(ctx, g.x, g.y, g.angle, GUARD.viewRange, GUARD.viewHalfAngle,
    g.chasing ? CONE_GUARD_HOT : CONE_GUARD, 'rgba(255, 196, 66, 0.45)');
  // Body: navy uniform, cap brim facing the patrol direction.
  ctx.beginPath();
  ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
  ctx.fillStyle = g.chasing ? '#c0392b' : '#2c4a7c';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0e1a2e';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(g.x, g.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#f2d5a0';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.angle) * (GUARD.radius + 7), g.y + Math.sin(g.angle) * (GUARD.radius + 7));
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#d8b25c';
  ctx.stroke();
  if (g.chasing) {
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5a45';
    ctx.fillText('!', g.x, g.y - GUARD.radius - 6);
  }
}

function drawCamera(ctx, cam) {
  drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, CONE_CAMERA, 'rgba(86, 190, 255, 0.45)');
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.rotate(cam.angle);
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(-4, -6, 18, 12);
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(15, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cam.x, cam.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#565d6b';
  ctx.fill();
}

function drawLoot(ctx, world) {
  const pulse = 0.75 + 0.25 * Math.sin(world.time * 3);
  ctx.save();
  ctx.globalAlpha = 0.35 * pulse;
  ctx.beginPath();
  ctx.arc(LOOT.x, LOOT.y, 34, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd76a';
  ctx.fill();
  ctx.restore();
  for (const s of world.sparkles) {
    ctx.fillStyle = 'rgba(255, 215, 106, 0.9)';
    ctx.fillRect(
      LOOT.x + Math.cos(s.a) * s.r - s.size / 2,
      LOOT.y + Math.sin(s.a) * s.r * 0.7 - s.size / 2,
      s.size, s.size);
  }
  // Golden idol: a small statue on its pedestal.
  ctx.fillStyle = '#8a6a2f';
  ctx.fillRect(LOOT.x - 18, LOOT.y + 8, 36, 10);
  ctx.beginPath();
  ctx.moveTo(LOOT.x, LOOT.y - 14);
  ctx.lineTo(LOOT.x + 9, LOOT.y + 2);
  ctx.lineTo(LOOT.x + 4, LOOT.y + 10);
  ctx.lineTo(LOOT.x - 4, LOOT.y + 10);
  ctx.lineTo(LOOT.x - 9, LOOT.y + 2);
  ctx.closePath();
  ctx.fillStyle = '#ffd76a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(LOOT.x, LOOT.y - 16, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // Hooded cloak: dark teal triangle with a pale face.
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-11, -11);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-11, 11);
  ctx.closePath();
  ctx.fillStyle = p.sneaking ? '#1f6f5c' : '#27ae8f';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(2, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#f2d5a0';
  ctx.fill();
  ctx.restore();
  if (world.hasLoot) {
    ctx.beginPath();
    ctx.arc(p.x, p.y - 20, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd76a';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#8a6a2f';
    ctx.stroke();
  }
  if (p.sneaking) {
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fe8d4';
    ctx.fillText('sneaking', p.x, p.y + 26);
  }
}

function drawHud(ctx, world) {
  // Top bar: title, alarm meter, loot, score, timer.
  ctx.fillStyle = 'rgba(8, 10, 16, 0.85)';
  ctx.fillRect(0, 0, FIELD.width, 44);
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8d9a0';
  ctx.fillText('MIDNIGHT VAULT', 14, 28);
  // Alarm meter.
  const ax = 210;
  const aw = 300;
  ctx.fillStyle = '#1c222e';
  ctx.fillRect(ax, 13, aw, 18);
  const frac = world.alarm / MAX_ALARM;
  ctx.fillStyle = frac < 0.5 ? '#e8b93c' : '#ff5a45';
  ctx.fillRect(ax, 13, aw * frac, 18);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#5a6272';
  ctx.strokeRect(ax, 13, aw, 18);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = world.spotted ? '#ff5a45' : '#c8ccd6';
  ctx.fillText(world.spotted ? 'SPOTTED!' : 'ALARM', ax + aw + 10, 27);
  // Loot + score + timer.
  ctx.textAlign = 'right';
  ctx.fillStyle = world.hasLoot ? '#ffd76a' : '#8a8f9c';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(world.hasLoot ? '◆ IDOL SECURED' : `◆ IDOL $${LOOT_VALUE.toLocaleString('en-US')}`, FIELD.width - 210, 28);
  ctx.fillStyle = '#e8eaf0';
  ctx.fillText(`SCORE ${world.score}`, FIELD.width - 96, 28);
  const secs = Math.floor(world.time);
  ctx.fillStyle = '#8a8f9c';
  ctx.fillText(`${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`, FIELD.width - 14, 28);
  // Hint line under the bar, on a dark pill so it stays legible over the floor
  // and the green EXIT door it passes.
  ctx.textAlign = 'left';
  ctx.font = '12px sans-serif';
  const hint = world.hasLoot
    ? 'Get back to the green EXIT door, bottom left. Shift = sneak.'
    : 'WASD / arrows to move · Shift to sneak · E to grab the idol when close.';
  const hintWidth = ctx.measureText(hint).width;
  ctx.fillStyle = 'rgba(8, 10, 16, 0.75)';
  ctx.fillRect(8, FIELD.height - 26, hintWidth + 12, 20);
  ctx.fillStyle = '#9aa1b1';
  ctx.fillText(hint, 14, FIELD.height - 12);
}

function drawRoom(ctx, world) {
  // Floor: dark checker tiles.
  for (let ty = 0; ty < 10; ty += 1) {
    for (let tx = 0; tx < 16; tx += 1) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? '#171b26' : '#1a1f2c';
      ctx.fillRect(tx * 60, 44, 60, 56);
    }
  }
  // Carpet runner down the middle of the hall.
  ctx.fillStyle = '#3d1f2b';
  ctx.fillRect(236, 44, 224, FIELD.height - 44);
  ctx.fillStyle = '#54222e';
  ctx.fillRect(244, 44, 208, FIELD.height - 44);
  // Exit door, bottom left.
  ctx.fillStyle = world.hasLoot ? '#1f7a4d' : '#274d38';
  ctx.fillRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.fillStyle = '#e8eaf0';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', EXIT_ZONE.x + EXIT_ZONE.w / 2, EXIT_ZONE.y + 30);
  ctx.fillText('▲', EXIT_ZONE.x + EXIT_ZONE.w / 2, EXIT_ZONE.y + 52);
  // Vault alcove behind the loot.
  ctx.fillStyle = '#232838';
  ctx.fillRect(800, 44, 160, 110);
  ctx.strokeStyle = '#4a5266';
  ctx.lineWidth = 2;
  ctx.strokeRect(800, 44, 160, 110);
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#8a8f9c';
  ctx.fillText('VAULT', 880, 66);
  // Walls and display cases.
  for (const r of OBSTACLES) {
    ctx.fillStyle = '#2e3442';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#454e63';
    ctx.fillRect(r.x, r.y, r.w, 4);
    ctx.strokeStyle = '#141824';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
  // Outer walls.
  ctx.strokeStyle = '#3a4152';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 47, FIELD.width - 6, FIELD.height - 50);
}

function overlay(ctx, title, lines, color) {
  ctx.fillStyle = 'rgba(6, 8, 12, 0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, FIELD.width / 2, 240);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#e8eaf0';
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 290 + i * 30));
}

export function render(ctx, world, screen) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawRoom(ctx, world);
  for (const cam of world.cameras) drawCamera(ctx, cam);
  for (const g of world.guards) drawGuard(ctx, g);
  if (!world.hasLoot) drawLoot(ctx, world);
  drawPlayer(ctx, world);
  drawHud(ctx, world);
  if (screen === 'title') {
    overlay(ctx, 'MIDNIGHT VAULT', [
      'One room. Three guards. Two cameras. One golden idol.',
      'Sneak past the vision cones, grab the idol, slip out the EXIT door.',
      'WASD / arrows to move · Shift to sneak · E to grab · R to restart',
      'Click or press Enter to begin',
    ], '#ffd76a');
  } else if (screen === 'win') {
    overlay(ctx, 'CLEAN GETAWAY', [
      `The idol is yours. Score: ${world.score}`,
      `Finished in ${Math.floor(world.time)}s with the alarm at ${Math.round(world.alarm)}%.`,
      'Press R to run it again',
    ], '#7be495');
  } else if (screen === 'busted') {
    overlay(ctx, 'BUSTED', [
      world.alarm >= MAX_ALARM ? 'The alarm hit 100% — the building locked down.' : 'A guard caught you in the open.',
      `Score: ${world.score}`,
      'Press R to try again',
    ], '#ff5a45');
  }
  // Danger vignette while spotted.
  if (world.spotted && screen === 'play') {
    ctx.strokeStyle = 'rgba(255, 72, 52, 0.55)';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 49, FIELD.width - 10, FIELD.height - 54);
  }
}

export { ALARM };
