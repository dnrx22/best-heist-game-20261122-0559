// Keyboard + mouse input. WASD and arrows move, Shift sneaks, E grabs the loot,
// Enter/click starts, R restarts. The game also listens for a click anywhere so a
// mouse-only player can start and restart.
export function createInput() {
  const keys = new Set();
  let interactQueued = false;
  let startQueued = false;
  let restartQueued = false;

  const MOVE_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];

  function onKeyDown(event) {
    if (MOVE_KEYS.includes(event.code) || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyE' || event.code === 'Space') interactQueued = true;
    if (event.code === 'Enter') startQueued = true;
    if (event.code === 'KeyR') restartQueued = true;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerDown() {
    startQueued = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointerdown', onPointerDown);

  return {
    read() {
      const state = {
        up: keys.has('ArrowUp') || keys.has('KeyW'),
        down: keys.has('ArrowDown') || keys.has('KeyS'),
        left: keys.has('ArrowLeft') || keys.has('KeyA'),
        right: keys.has('ArrowRight') || keys.has('KeyD'),
        sneak: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        interact: interactQueued,
        start: startQueued,
        restart: restartQueued,
      };
      interactQueued = false;
      startQueued = false;
      restartQueued = false;
      return state;
    },
  };
}
