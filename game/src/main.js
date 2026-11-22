// Midnight Vault — entry point. Runs the fixed-step simulation, draws each frame,
// and stages screenshot scenes when the page is opened with ?shot=start|play|end.
import { FIELD, SCREEN_BUSTED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, STEP } from './config.js';
import { World, EVENT_BUSTED, EVENT_GRAB, EVENT_SPOTTED, EVENT_WIN } from './world.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';
import { sound } from './sound.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shot = params.get('shot');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width = FIELD.width * dpr;
canvas.height = FIELD.height * dpr;
canvas.style.aspectRatio = `${FIELD.width} / ${FIELD.height}`;
ctx.scale(dpr, dpr);

const world = new World(seed);
const input = createInput();
let screen = SCREEN_TITLE;
let best = 0;

function setScreen(next) {
  screen = next;
  const status = document.getElementById('status');
  if (status) {
    status.textContent = next === SCREEN_TITLE ? 'Midnight Vault. Press Enter to begin.'
      : next === SCREEN_WIN ? `Clean getaway. Score ${world.score}.`
      : next === SCREEN_BUSTED ? 'Busted. Press R to try again.'
      : `Playing. Alarm ${Math.round(world.alarm)} percent.`;
  }
}

if (shot) {
  // Screenshot mode: stage the scene deterministically, draw once, stop.
  const staged = stageShot(shot, world);
  screen = staged.screen;
  best = staged.best;
  render(ctx, world, screen);
  document.title = `Midnight Vault — ${shot}`;
  // Debug handle for the screenshot driver: the staged scene's real state.
  window.__shot = {
    shot, screen, score: world.score, time: Math.round(world.time),
    alarm: Math.round(world.alarm), hasLoot: world.hasLoot,
    player: { x: Math.round(world.player.x), y: Math.round(world.player.y) },
  };
} else {
  let last = performance.now();
  let accumulator = 0;
  let started = false;

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    const state = input.read();
    if (state.restart && (screen === SCREEN_WIN || screen === SCREEN_BUSTED || screen === SCREEN_PLAY)) {
      world.reset();
      setScreen(SCREEN_TITLE);
      started = false;
    }
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { up: false, down: false, left: false, right: false, sneak: false, interact: false });
      if (state.start) {
        started = true;
        sound.unlock();
        setScreen(SCREEN_PLAY);
      }
    } else if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, state);
        if (events & EVENT_SPOTTED) sound.spotted();
        if (events & EVENT_GRAB) sound.grab();
        if (events & EVENT_WIN) { sound.win(); setScreen(SCREEN_WIN); }
        if (events & EVENT_BUSTED) { sound.busted(); setScreen(SCREEN_BUSTED); }
      }
    }
    render(ctx, world, screen);
    // Debug handle for the play-test driver: the live scene's real state.
    window.__shot = {
      shot: null, screen, score: world.score, time: Math.round(world.time),
      alarm: Math.round(world.alarm), hasLoot: world.hasLoot,
      player: { x: Math.round(world.player.x), y: Math.round(world.player.y) },
    };
    if (!started && screen === SCREEN_TITLE) {
      // Keep the title scene alive behind the overlay.
      world.time += 0;
    }
  }
  setScreen(SCREEN_TITLE);
  requestAnimationFrame(frame);
}

export { best, screen, world };
