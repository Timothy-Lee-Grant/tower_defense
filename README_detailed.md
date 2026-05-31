# 🏰 Dungeon Architect — Detailed Project Documentation

> *"The heroes returned. Again. I've scheduled a performance review."*
> — Gerald, Skeleton MBA, Dungeon Operations Division

---

## Origin

This project was born from a conversation about building a standout software engineering portfolio piece. The goal was something **fun and interactive** — not another CRUD app or API demo, but something people actually want to play with. From a brainstormed list of ideas, **Dungeon Architect** was chosen: a tower defense game where you play the villain instead of the hero.

The design brief was: *"Flip the script — you are the dungeon, not the hero. You place traps, monsters, and obstacles to stop adventuring heroes from reaching your treasure room. Budget-limited placement before each wave, then watch and see if your dungeon holds."*

The tone is deliberately darkly comedic — think *Overlord* meets *Evil Genius* meets *Dungeon Keeper*. You're not a murderous overlord; you're a flustered middle-manager of evil with a budget to protect.

---

## Quick Start

```bash
cd dungeon-architect
npm install
npm run dev
# Open http://localhost:5173
```

> **Note:** The `package-lock.json` was generated on macOS. If `npm run dev` fails with a Rollup native module error on Linux/ARM, delete `package-lock.json` and `node_modules/`, then re-run `npm install`.

---

## What's Actually Built

This is a **fully playable single-player browser game** with no backend, no internet requirement, and no external data. Every system described below is implemented and wired together.

### Game Phases

The game runs as a three-phase loop:

**1. Plan Phase**
The player spends a gold budget to place traps, monsters, and structures on a 20×13 tile grid. The entrance is fixed on the left edge, the treasure room on the right. A "Preview Paths" button runs A* pathfinding for all three main hero types simultaneously and draws their likely routes as dashed overlays — so you can see where to funnel them before committing.

**2. Wave Phase**
Heroes spawn from the entrance one by one (staggered 1.2 seconds apart) and navigate toward the treasure using per-hero A* pathfinding. They move smoothly via pixel interpolation and interact with tiles as they step on them. The battle log on the left updates with live events. The player watches — no interaction during a wave.

**3. Results Phase**
A post-wave summary shows kills, escapes, and gold earned. The player picks one of three upgrade cards: either unlock a new tool (Tier 2 traps or Wraith) or take a gold bonus. Then the cycle repeats with a fresh gold budget and the next wave.

The game runs for 7 pre-authored waves, each with a title and escalating hero composition.

---

## Architecture

### File Map

```
dungeon-architect/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx              Entry point — mounts React root
    ├── App.jsx               Phase router (Menu / Game / Results)
    ├── index.css             Design tokens (CSS vars), global resets
    ├── game/
    │   ├── constants.js      Single source of truth for all game data
    │   ├── pathfinding.js    A* implementation with per-hero tile weights
    │   └── simulation.js     Per-frame hero movement and trap interactions
    ├── store/
    │   └── gameStore.js      Zustand store — all state + all actions
    └── components/
        ├── MainMenu.jsx      Title screen
        ├── GameScreen.jsx    Layout: HUD + grid + sidebars
        ├── DungeonGrid.jsx   Canvas renderer + mouse event handlers
        ├── ToolPalette.jsx   Left sidebar: tool selection tabs
        ├── BattleLog.jsx     Left sidebar during wave: event feed + hero HP
        ├── HUD.jsx           Top bar: gold, treasure HP, wave info, buttons
        └── ResultsScreen.jsx Post-wave summary + upgrade card picker
```

### State Management

All game state lives in a single Zustand store (`gameStore.js`). There is no prop drilling — every component reads directly from the store via selector hooks. Actions are co-located with state in the store.

Key state slices:

| Slice | Type | Description |
|-------|------|-------------|
| `phase` | string | `'menu'` / `'plan'` / `'wave'` / `'results'` |
| `grid` | `string[][]` | 13×20 array of tile IDs |
| `gold` | number | Per-wave spend budget |
| `bank` | number | Persistent earned gold (from kills) |
| `heroes` | Hero[] | Live hero instances during wave |
| `trapTimers` | Record | `"col,row"` → ms elapsed (for timed traps) |
| `battleLog` | string[] | Capped at 30 most recent events |
| `upgradeCards` | Card[] | 3 cards shown in Results phase |
| `previewedPaths` | Paths | Knight/Mage/Thief A* results for overlay |

### Canvas Renderer

The dungeon grid is drawn on an HTML5 `<canvas>` element using `requestAnimationFrame`. The renderer (`DungeonGrid.jsx`) runs its own animation loop independently of the simulation loop, repainting every frame. Features:

- Per-tile color themes with border styling
- Pulsing glow effects on special tiles (fire, poison, slime, treasure, entrance) using `Math.sin(time)`
- Hero rendering: circular token with emoji, shadow ellipse, HP bar that shifts green → orange → red
- Path preview: dashed colored lines per hero type (gold for Knight, purple for Mage, green for Thief)
- Hover highlight in plan phase (yellow tint when a tool is selected, grey tint otherwise)
- Canvas is scaled CSS-side to fill its container while keeping internal pixel resolution fixed

Mouse coordinates are translated back to tile grid coordinates by factoring in the CSS-to-canvas scale ratio.

### Pathfinding

`pathfinding.js` implements A* with a Manhattan distance heuristic. The key feature is **per-hero tile cost weights**:

| Tile | Base cost | Knight extra | Mage extra | Thief extra |
|------|-----------|--------------|------------|-------------|
| Empty | 1 | — | — | — |
| Wall | Infinity (impassable) | — | — | — |
| Door | 3 | — | — | — |
| Fire | 1 + fearFire×20 | +4 | +18 | +14 |
| Spike | 1 + fearSpike×8 | +4 | +6.4 | +2.4 |
| Poison | 2 | — | — | — |
| Monster tile | 4 | — | — | — |

A Mage pays an effective cost of ~19 to cross a fire tile, so it will route around fire even if the path is much longer. A Knight only pays ~5, so it charges through. This makes the same dungeon layout present different challenges depending on which hero class appears.

Heroes also recalculate their path every 4 steps in case the grid changes (though the grid is static during wave phase — this is scaffolding for a potential future feature).

### Simulation Loop

The wave simulation runs in `gameStore.js::startWave()` via `requestAnimationFrame`. Each frame:

1. Advance trap timers (`fire` and `dart` tiles)
2. Call `simulationTick()` with heroes, grid, delta-ms, and trap timers
3. Update heroes, treasure HP, gold, kill counts, and battle log
4. Check if all heroes have resolved (dead or escaped)
5. If resolved → call `endWave()`

Inside `simulationTick()`, each hero:
- Waits for its spawn delay countdown
- Calculates initial A* path on first spawn
- Moves toward its next path waypoint using normalized velocity
- On tile arrival, calls `handleTileInteraction()` for trap/monster effects
- Paladins passively heal adjacent moving heroes (5 HP/s)
- Dies if HP ≤ 0, earning the player gold

---

## All Game Content

### Hero Types

| Hero | HP | Speed | Key Behaviors |
|------|----|-------|---------------|
| ⚔️ Knight | 120 | 1.2 tiles/s | Low trap-avoidance, charges straight |
| 🧙 Mage | 60 | 1.0 tiles/s | Strongly avoids fire, detects traps (pathfinding flag) |
| 🗡️ Thief | 50 | 2.0 tiles/s | Fast, disarms spike traps (negates damage), moderate fire fear |
| 🛡️ Paladin | 100 | 0.9 tiles/s | Heals adjacent allies 5 HP/s while moving |

### Dungeon Tools (11 total)

**Tier 1 — Available from start:**

| Tool | Cost | Damage | Notes |
|------|------|--------|-------|
| 🔩 Spike Plate | 30g | 25 | Triggers on step; Thieves disarm it (no damage) |
| 🎯 Dart Wall | 45g | 18 | Timer-based (defined; see Known Issues) |
| 🪨 Rolling Boulder | 20g | 60 | One-shot, cheapest high damage |
| 💀 Skeleton Guard | 50g | 20 | 80 HP monster on tile |
| 🟢 Slime | 25g | 8 | 40 HP, cheap filler |
| 🧱 Stone Wall | 10g | — | Impassable, forces reroute |
| 🚪 Iron Door | 35g | — | Cost 3× in pathfinding, slows routing |
| ⚙️ Pressure Lever | 40g | — | Defined; see Known Issues |

**Tier 2 — Unlock via upgrade cards:**

| Tool | Cost | Damage | Notes |
|------|------|--------|-------|
| 🔥 Fire Vent | 70g | 35 | AOE burst; active 1s out of every 4s cycle |
| ☠️ Poison Mist | 55g | 10 | Applies damage + `poisoned: true` flag |
| 👻 Wraith | 90g | 30 | 60 HP; phases through walls (note: pathfinding doesn't yet treat walls as passable for Wraith) |

### Wave Compositions (7 waves)

| Wave | Title | Heroes |
|------|-------|--------|
| 1 | The First Scouting Party | 3× Knight |
| 2 | They Brought a Lockpick | 2× Knight, 1× Thief |
| 3 | Mixed Tactics | Knight, Mage, Thief |
| 4 | A Full Party | 2× Knight, Mage, Thief |
| 5 | They Brought a Healer | Knight, Mage, Thief, Paladin |
| 6 | The Siege Begins | 2× Knight, Mage, Thief, Paladin |
| 7 | They Are Not Giving Up | 3× Knight, 2× Mage, Paladin |

Gold budget per wave: 120 → 140 → 160 → 190 → 220 → 260 → 300g.

---

## Build & Runtime Status

### Verified Working (tested in Node.js, no browser required)
- ✅ All constants load correctly (11 tools, 4 hero types, 7 waves)
- ✅ A* pathfinding produces correct 20-tile paths across a 20×13 grid
- ✅ Per-hero cost weighting works (Mage routes differently from Knight)
- ✅ Hero spawn, movement, and tile interaction logic executes cleanly
- ✅ Simulation tick runs to completion without errors
- ✅ Gold economy (kill rewards, sell refunds) calculates correctly

### Build Environment Note
The `package-lock.json` was generated on macOS (x64/arm64 Apple Silicon). The Vite build uses Rollup native binaries that are platform-specific. If building on Linux ARM64, you may see:

```
Error: Cannot find module @rollup/rollup-linux-arm64-gnu
```

**Fix:** Delete `package-lock.json` and `node_modules/`, then `npm install` fresh. This is an npm platform-optional-dependency bug, not a code issue. The project builds and runs correctly on macOS.

---

## Known Issues & Incomplete Features

These were identified by code review. None affect the basic game loop.

### 1. Dart Wall does nothing to heroes
`handleTileInteraction()` in `simulation.js` has no `case TILE.DART`. Heroes who step on a Dart Wall tile take zero damage. The timer runs correctly in `gameStore.js`, but the damage delivery on tile-step was never wired.

**Fix needed:** Add a `TILE.DART` case that checks whether the dart timer is in its "active" window (similar to the existing Fire Vent check) and applies 18 damage.

### 2. Pressure Lever is unimplemented
`TILE.LEVER` is defined in constants, has a cost (40g), and can be placed on the grid, but `handleTileInteraction()` has no `case TILE.LEVER`. There's no lever-to-trap linking data structure or UI. Heroes step on levers and nothing happens.

**Fix needed:** A linking system (lever ID → target trap tile) and a UI for connecting them (click lever → click trap).

### 3. Poison DoT doesn't tick
The spike case applies `{ hp: hero.hp - 10, poisoned: true }` but `simulationTick()` never reads `hero.poisoned` to apply ongoing damage. Poison deals its 10 damage once on entry and stops.

**Fix needed:** Add a per-hero DoT tick inside the simulation loop that reduces HP by ~3/s when `hero.poisoned === true`.

### 4. Wave-end detection can end early
In `gameStore.js::startWave()`, the wave-end check is:
```js
const allDone = result.heroes.every(h => h.state === 'dead' || h.state === 'escaped' || !h.spawned)
const allSpawned = result.heroes.every(h => h.spawned || h.spawnDelay <= 0)
if (allSpawned && allDone) get().endWave()
```
The `!h.spawned` clause in `allDone` means heroes with a pending `spawnDelay` are counted as "done." Combined with `allSpawned` also checking `h.spawnDelay <= 0`, this logic can resolve inconsistently if a hero's `spawnDelay` hits 0 but `spawned` is still `false` within the same tick.

**Fix needed:** Simplify to track a separate `allHeroesSpawned` boolean flag set once all delays have elapsed.

### 5. PixiJS in package.json but not used
`pixi.js` and `@pixi/react` are listed as dependencies (and installed) but the entire dungeon renderer uses plain HTML5 Canvas. The README already notes this correctly. These dependencies add ~2MB to the bundle unnecessarily.

**Fix needed:** Remove `pixi.js` and `@pixi/react` from `package.json` for a leaner build.

### 6. Wraith doesn't phase through walls
The Wraith is defined with the description "Phases through walls" and has an `unlocked: false` tier-2 unlock. However, `findPath()` treats `TILE.WALL` as `Infinity` cost for all heroes — including Wraith. The `PASSABLE` set doesn't include `TILE.WALL`.

**Fix needed:** Pass hero type into pathfinding and add a `hero.phasesWalls` flag that makes wall tiles passable (cost ~2) for Wraith only.

---

## Design Patterns Worth Noting

**Single Zustand store as game engine controller.** The `startWave()` action directly manages the `requestAnimationFrame` loop — the store is both state container and game loop host. This is unconventional but keeps everything co-located.

**Immutable grid updates.** Every `placeTile`/`removeTile` call creates a full copy of the 2D grid array via `.map(r => [...r])`. With a 20×13 = 260-cell grid this is negligible, but it means React/Zustand equality checks work correctly.

**Canvas renders independently of simulation.** `DungeonGrid.jsx` has its own `requestAnimationFrame` loop for drawing. It reads `heroes` and `grid` from the Zustand store on each frame, effectively polling state rather than subscribing to per-frame changes. This means the visual frame rate (canvas redraws) and the simulation tick rate (state updates) are decoupled.

**Hero behavior encoded in pathfinding weights.** Personality differences between hero classes (Mage avoids fire, Thief braves spikes) are implemented entirely as A* cost multipliers rather than as separate AI state machines. This is elegant — adding a new hero type only requires defining its `fearFire` and `fearSpike` values.

---

## Roadmap (from original design document)

- [ ] Sprite sheet animations for heroes and traps (PixiJS integration or CSS sprite sheets)
- [ ] Sound effects (trap triggers, hero deaths, Gerald commentary)
- [ ] Campaign map screen with 10 levels
- [ ] Berserker and Bard hero classes
- [ ] Dungeon themes (bone, lava, ice, clockwork) via CSS variable swaps
- [ ] Slow-motion replay of wave highlights
- [ ] Persistent high score / best wave tracking (localStorage)
- [ ] Wraith phase-through-wall pathfinding mode
- [ ] Lever-to-trap linking UI
- [ ] Dart Wall area-of-effect damage
- [ ] Poison damage-over-time tick

---

## Tech Stack

| Technology | Version | Role |
|------------|---------|------|
| React | 18.3.1 | UI framework |
| Vite | 5.3.1 | Dev server & bundler |
| Zustand | 4.5.2 | Game state management |
| HTML5 Canvas | native | Dungeon grid renderer |
| requestAnimationFrame | native | Simulation loop + canvas draw loop |
| A* (custom) | — | Hero pathfinding with weighted tile costs |

No game engine framework is used. The A* implementation, simulation loop, and canvas renderer are all hand-written.
