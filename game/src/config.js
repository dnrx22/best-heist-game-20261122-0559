// Midnight Vault — field and tuning constants. Everything the world, render and
// shot-staging modules share lives here so a single number changes one behaviour.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 12,
  speed: 175,
  sneakSpeed: 88,
  // Sneaking shrinks how far a detector can spot the thief.
  sneakSpotFactor: 0.62,
  grabRange: 40,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 62,
  chaseSpeed: 118,
  viewRange: 185,
  viewHalfAngle: 0.61, // ~35 degrees each side
};

export const CAMERA = {
  viewRange: 205,
  viewHalfAngle: 0.5, // ~29 degrees each side
  sweepSpeed: 0.55, // radians per second
  sweepArc: 1.1, // radians each side of the base angle
};

export const ALARM = {
  risePerSecond: 46,
  decayPerSecond: 13,
  chaseAt: 50,
  calmAt: 25,
};

export const LOOT_VALUE = 5000;
export const TIME_BONUS_PER_SECOND = 25;
export const MAX_ALARM = 100;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_BUSTED = 'busted';
