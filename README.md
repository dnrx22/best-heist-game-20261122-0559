# Midnight Vault

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/dnrx22/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/dnrx22/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Midnight Vault** is a one-room stealth heist game for the desktop browser. You are
a thief in a museum gallery after closing time: three guards patrol with vision
cones, two security cameras sweep the hall, and a golden idol worth $5,000 sits
in the vault alcove. Sneak past every cone, grab the idol with `E`, and slip out
the green EXIT door — if the alarm meter hits 100%, the building locks down and
the night is over.

- **Stealth, not combat:** guards and cameras spot you only inside their vision
  cones with a clear line of sight. Sneaking (Shift) shrinks how far they can
  see you, but you move slower.
- **Heat:** being seen raises the alarm; hiding lets it cool. Past 50%, the
  nearest guard gives chase — and a chasing guard is faster than a sneaking
  thief, so run.
- **Scoring:** $5,000 for the idol plus a time bonus for a fast, quiet getaway.
- **Sound:** synthesized WebAudio bleeps for spotting, grabbing, winning and
  getting busted — no audio files, no network.
- **Deterministic:** the same seed always plays the same way; `?shot=start|play|end&seed=1`
  stages the three screenshot scenes from real play.

## Run it

Serve `game/` with any static server and open it in a desktop browser:

```sh
node serve.ts   # serves game/ on http://localhost:8080
```

Or open `game/index.html` directly from a static host. No build step, no
libraries, no network requests — just `index.html` and its ES modules.

**Controls:** WASD / arrow keys to move · Shift to sneak · E to grab the idol ·
Enter / click to start · R to restart.

## Files

- `main.ts` — the Node 22 hand-in program: copies `game/` and `screenshots/`
  to the output directory and writes `dossier.json` via the vendored
  `vendor/makefun-game.ts`.
- `game/` — the playable game: `index.html` plus `src/` (config, world
  simulation, renderer, input, sound, screenshot staging).
- `screenshots/` — three real renders of the game's own code: title, mid-heist
  play, and the clean getaway.

<sub>Entered on [make.fun](https://make.fun/?ref=xanns8j9&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
