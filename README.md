# RunSight

RunSight is a football film-analysis prototype that compares a ball carrier's actual route with an explainable best-estimated lane. It includes a behind-the-quarterback view and a synchronized simulated running-back perspective.

## Run locally in VS Code

1. Open this folder in VS Code.
2. Open the integrated terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local address printed in the terminal.

## What is implemented

- All 32 NFL teams in the selector
- Ten generated demo rushing plays per team
- Random play selection without immediately repeating the current play
- Synchronized behind-QB and simulated RB views
- Animated jersey-and-helmet player figures with team-inspired, logo-free uniforms
- Directional body rotation, speed-based stride animation, blocking steps, and defender pursuit
- WebGL 3D stadium, field depth, lighting, soft shadows, player contact poses, and glowing analysis routes
- Stabilized helmet-height RB camera with subtle head bob, sway, and smooth camera transitions
- Lazy-loaded 3D engine and selectable 0.5x–2x playback speed
- Risk-adjusted yardage estimates with blocker influence, defender arrival, decision separation, and movement-cost rationale
- End-of-play result review with replay support
- Team/organization snapshots that distinguish simulated samples from verified imported film
- Play, pause, step, and scrub controls
- Actual route and model-recommended path overlays
- Defender threat visualization
- An interpretable baseline spatial model with path ranking and explanation
- A rights-aware import manifest and catalog builder
- Responsive desktop and mobile layouts

The demo catalog is simulated and clearly labeled. It does not contain or scrape NFL footage.

## Real play data

Read [`docs/DATA_ACQUISITION.md`](docs/DATA_ACQUISITION.md) before adding footage. Place authorized play packages under `public/data/plays/<play-id>/`, copy `manifest.example.json` to `manifest.json`, add corrected `frames.json`, and run:

```sh
npm run catalog
```

The catalog builder skips footage that is not explicitly cleared for public display and derivative visualization.

## Model status

The current model scores inside, left-bounce, and right-bounce paths using projected defender distance, immediate collision risk, expected forward yards, and cut cost. It is intentionally interpretable. Blocking engagement, leverage, runner-specific movement limits, and calibrated video overlays are the next accuracy milestones.
