# Developer Onboarding — Dungeon Architect

Welcome to the project. This document covers how the codebase is structured, where everything starts, how the systems connect, and how to get your environment running.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started](#3-getting-started)
4. [Folder Structure](#4-folder-structure)
5. [Entry Points](#5-entry-points)
6. [Core Systems](#6-core-systems)
7. [Data Flow](#7-data-flow)
8. [Game Phases](#8-game-phases)
9. [How to Make Common Changes](#9-how-to-make-common-changes)

---

## 1. Project Overview

Dungeon Architect is a browser-based tower defense game built with React and the HTML5 Canvas API. The player places traps and monsters on a dungeon grid to stop waves of heroes from reaching and stealing treasure. There are 7 waves, each introducing new hero types with unique behaviors.

The codebase is ~3,600 lines of JavaScript with no external game engine — all logic, rendering, and pathfinding is custom-built.

---

## 2. Tech Stack

| Concern | Technology |
|---|---|
| UI Framework | React 18 |
| State Management | Zustand 4.5.2 |
| Build Tool | Vite 5.3.1 |
| Language | JavaScript (ES Modules) + JSX |
| Rendering | HTML5 Canvas API |
| Game Loop | `requestAnimationFrame` |
| Fonts | Google Fonts (MedievalSharp, Cinzel, Crimson Text) |

No TypeScript. No image assets — all sprites are drawn in code via the Canvas 2D API.

---

## 3. Getting Started

**Requirements:** Node.js 18+, npm 8+

```bash
# Clone and enter the project
cd tower_defense

# Install dependencies
npm install

# Start the dev server
npm run dev
# → Open http://localhost:5173 in your browser
```

Vite's hot-reload is active: save any `.jsx` or `.js` file and the browser updates in under a second with no full refresh.

```bash
# Build for production
npm run build        # Outputs to dist/

# Preview the production build locally
npm run preview
```

**No environment variables are required.** The game is fully local and single-player with no backend.

---

## 4. Folder Structure

```
tower_defense/
├── index.html              Browser entry point — loads React root
├── package.json            Project metadata and npm scripts
├── vite.config.js          Vite config (enables React plugin)
│
└── src/
    ├── main.jsx            Mounts the React app into the DOM
    ├── App.jsx             Phase router (Menu / Plan / Wave / Results)
    ├── index.css           CSS custom properties and global styles
    │
    ├── game/               Pure game logic — no React, no DOM
    │   ├── constants.js    Single source of truth for all game data
    │   ├── simulation.js   Per-frame game tick: movement, combat, traps
    │   ├── sprites.js      All canvas drawing functions for tiles and heroes
    │   └── pathfinding.js  A* pathfinding with per-hero terrain weights
    │
    ├── store/
    │   └── gameStore.js    Zustand store: all state + actions + simulation loop
    │
    └── components/
        ├── MainMenu.jsx    Title screen
        ├── GameScreen.jsx  Main layout: HUD + grid + sidebars
        ├── DungeonGrid.jsx Canvas renderer + mouse input handling
        ├── ToolPalette.jsx Left sidebar: tool selection
        ├── BattleLog.jsx   Right sidebar: event log + hero status
        ├── HUD.jsx         Top bar: gold, treasure HP, wave controls
        └── ResultsScreen.jsx  Post-wave summary + upgrade card picker
```

The `game/` folder is the engine. It contains pure functions that take data in and return data out — no side effects, no React. The `store/` and `components/` folders form the React shell that drives and displays the game.

---

## 5. Entry Points

### `index.html`
The browser loads this first. It contains a single `<div id="root">` placeholder and imports `src/main.jsx` as an ES module.

### `src/main.jsx`
Four lines. Mounts the React app:
```jsx
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

### `src/App.jsx`
The phase router. Renders one of four screens depending on the current game phase:
```jsx
{phase === PHASE.MENU    && <MainMenu />}
{(phase === PHASE.PLAN || phase === PHASE.WAVE) && <GameScreen />}
{phase === PHASE.RESULTS && <ResultsScreen />}
```
This is the only place in the app where routing logic lives.

### `src/store/gameStore.js`
The true runtime entry point for game logic. When `startWave()` is called, it spawns heroes and kicks off the `requestAnimationFrame` simulation loop that drives all game updates. Everything else reacts to changes in this store.

---

## 6. Core Systems

### `src/game/constants.js` — Game Data

The single source of truth. No logic lives here — only data definitions. Key exports:

- **Grid geometry:** `GRID_COLS = 20`, `GRID_ROWS = 13`, `TILE_SIZE = 48px`
- **PATH_WAYPOINTS / PATH_TILES:** The fixed route heroes follow through the dungeon (entrance at col 0, treasure at col 19, back to entrance). Heroes always follow this path — it does not change based on trap placement.
- **DUNGEON_TOOLS:** Array of 11 placeable tools (Spikes, Lava, Dart Tower, Wraith, etc.), each with `id`, `cost`, `damage`, `range`, `attackSpeed`, and any special effects (slow, poison DoT, fire resistance bypass).
- **HERO_TYPES:** Four hero classes (Knight, Mage, Thief, Paladin), each with unique `speed`, `hp`, `abilities`, and gold reward multipliers.
- **WAVE_CONFIGS:** Array of 7 wave definitions, each specifying which hero types spawn and in what quantity.
- **Economy constants:** `STARTING_GOLD = 250`, `SELL_REFUND_RATE = 0.5`, `TREASURE_MAX_HP = 300`.

If you want to tune game feel, start here.

---

### `src/game/simulation.js` — Game Tick

A pure function that advances the game by one frame. The store calls it every frame during a wave.

**Signature:**
```js
simulationTick(heroes, grid, deltaMs, trapTimers)
// Returns: { heroes, events, treasureDamage, goldEarned, trapTimers }
```

**What happens each tick, in order:**

1. **Spawn stagger** — Delay each hero's entry by 1.5s from the previous.
2. **Status effects** — Tick down poison DoT (3 HP/s), lava DoT (15 HP/s), slow timers.
3. **Paladin healing** — Adjacent heroes receive +5 HP/s from any Paladin in the group.
4. **Movement** — Each living hero advances toward the next PATH_TILES waypoint. Speed accounts for door slows, gold-carrying penalty, and active slow effects.
5. **On-path trap interactions** — On tile arrival, check for Spike/Boulder/Lava. Thieves disarm spikes; others take damage.
6. **Treasure interaction** — If a hero reaches the treasure tile, they pick up gold (`hasGold = true`) and begin the return trip.
7. **Death check** — Heroes at 0 HP are marked dead; gold reward is added.
8. **Tower attacks** — Each off-path tower (Dart, Fire Vent, Wraith, etc.) finds the nearest hero in range and deals damage with applicable effects.
9. **Escape check** — Heroes that complete the full path and return to the entrance with gold have escaped (loss condition).
10. **Event logging** — Returns an array of events (`hero_killed`, `treasure_reached`, `trap_triggered`, etc.) for the battle log.

---

### `src/game/sprites.js` — Canvas Drawing

All visual output. ~1,170 lines of Canvas 2D drawing functions. No image files are used anywhere.

Key exports:

- **Hero draw functions:** `drawKnight`, `drawMage`, `drawThief`, `drawPaladin` — each draws a unique pixel-art figure with frame-based animations (walking bobble, swing arcs).
- **`TILE_SPRITES` object** — maps every tile ID to a draw function (e.g., `TILE_SPRITES['spike']`, `TILE_SPRITES['dart_tower']`).
- **`drawAttackEffect`** — renders active attack animations (dart projectiles, fire bursts, wraith rush paths).
- **Animation helpers:** `osc(t)`, `swing(t, speed)`, `pulse(t)` — time-based easing functions driven by `performance.now()`.

All drawing functions accept a canvas `ctx` and a time value `t`. They are stateless.

---

### `src/game/pathfinding.js` — A*

An A* implementation with per-hero terrain cost weights.

```js
findPath(grid, start, end, hero)
```

Terrain costs vary by hero class: Mages strongly avoid fire tiles (cost ×19), Knights charge through them (cost ×5), Thieves fall in between. This makes the same trap layout strategically different depending on which heroes are in the wave.

**Note:** During an active wave, heroes follow the fixed `PATH_TILES` waypoints rather than computed A*. Pathfinding currently powers the path preview overlay in plan phase (`previewPaths()`) and is scaffolded for future dynamic combat re-routing.

---

### `src/store/gameStore.js` — State + Actions + Simulation Loop

The Zustand store holds all game state and defines every action that mutates it. Components read from it via `useGameStore`. This is the glue between the React UI and the pure game logic.

**State slices:**

| Key | Type | Description |
|---|---|---|
| `phase` | string | `'menu'` \| `'plan'` \| `'wave'` \| `'results'` |
| `grid` | string[][] | 20×13 array of tile IDs |
| `selectedTool` | string \| null | Currently selected tool in plan phase |
| `gold` | number | Per-wave spend budget |
| `bank` | number | Persistent gold earned across waves |
| `heroes` | Hero[] | Live hero instances during a wave |
| `treasureHp` | number | Treasure HP remaining (0–300) |
| `waveIndex` | number | Current wave number (0–6) |
| `battleLog` | string[] | Last 30 battle events |
| `attackFlashes` | object[] | Active attack animation descriptors |
| `upgradeCards` | Card[] | 3 choices shown in results screen |

**Key actions:**

- `startGame()` — Resets state and transitions to plan phase.
- `placeTile(col, row)` — Places the selected tool on the grid, deducts gold. Validates that the tile is not on the fixed path and the player can afford it.
- `removeTile(col, row)` — Clears a tile and refunds 50% of its cost.
- `startWave()` — Spawns heroes from the current `WAVE_CONFIG` and starts the RAF simulation loop.
- `endWave()` — Halts the simulation loop, generates 3 upgrade cards, transitions to results.
- `pickUpgradeCard(card)` — Unlocks a tool or adds gold to the bank, then advances to the next wave's plan phase.

**The simulation loop inside `startWave()`:**
```js
const loop = (now) => {
  const deltaMs = Math.min(now - lastTime, 100)
  const result = simulationTick(heroes, grid, deltaMs, trapTimers)
  // Push result back into store: heroes, events, flashes, gold, treasureHp
  if (!waveOver) requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
```

---

### `src/components/DungeonGrid.jsx` — Canvas Renderer + Input

The most complex component. It runs its own independent RAF loop to continuously repaint the canvas, reading hero and grid state from the store via refs (not subscriptions, to avoid restarting the render loop on every state change).

**Draw order each frame:**
1. Tile backgrounds (fill + border)
2. Tile sprites (`TILE_SPRITES[id](ctx, x, y, t)`)
3. Hero tokens (sprite + shadow + HP bar)
4. Attack effect overlays
5. Hover/range preview highlight (plan phase only)

**Mouse handlers:**
- Left-click → `store.placeTile(col, row)`
- Right-click → `store.removeTile(col, row)`
- Hover → updates a ref for the range preview ring

---

## 7. Data Flow

### During a Wave

```
store.startWave()
  │
  ├── Spawns hero instances from WAVE_CONFIGS[waveIndex]
  │
  └── RAF loop starts
        every frame:
          simulationTick(heroes, grid, deltaMs, trapTimers)
            └── returns { heroes, events, treasureDamage, goldEarned, trapTimers }
          store updates: heroes, battleLog, gold, treasureHp, attackFlashes
          if (wave over) → store.endWave()

Parallel — independent RAF in DungeonGrid.jsx:
  every frame:
    read heroes, grid, attackFlashes from store refs
    repaint canvas
```

The simulation loop and the render loop are fully decoupled. The simulation pushes data into the store; the canvas reads it and paints.

### During Plan Phase

```
User clicks a tool in ToolPalette
  → store.selectTool(id)

User left-clicks the grid
  → DungeonGrid.onTileClick(col, row)
  → store.placeTile(col, row)
      ├── Validate: not a path tile, player can afford it
      ├── Copy grid, set grid[row][col] = toolId
      ├── Deduct gold
      └── Update store

User right-clicks the grid
  → store.removeTile(col, row)
      ├── Refund 50% of tool cost
      └── Reset tile to EMPTY or PATH
```

---

## 8. Game Phases

The game cycles through four phases controlled by `store.phase`:

| Phase | Screen | What's happening |
|---|---|---|
| `menu` | `MainMenu.jsx` | Title screen; player clicks Start |
| `plan` | `GameScreen.jsx` | Player places traps; ToolPalette is visible |
| `wave` | `GameScreen.jsx` | Simulation loop running; BattleLog is visible |
| `results` | `ResultsScreen.jsx` | Summary + 3 upgrade card choices |

After picking an upgrade card, the phase returns to `plan` for the next wave (or ends after wave 7).

---

## 9. How to Make Common Changes

**Tune a trap or tower's stats:**
Edit the relevant entry in `DUNGEON_TOOLS` in `src/game/constants.js`. Fields: `damage`, `range`, `attackSpeed`, and any special effect values.

**Tune a hero's stats:**
Edit `HERO_TYPES` in `constants.js`. Fields: `speed`, `hp`, `abilities`.

**Change wave composition:**
Edit `WAVE_CONFIGS` in `constants.js`. Each entry is an array of hero type strings and a gold budget.

**Add a new trap:**
1. Add an entry to `DUNGEON_TOOLS` in `constants.js`.
2. Implement the interaction in `simulation.js` — find the on-path trap block and the tower attack block and add your logic.
3. Add a draw function to `sprites.js` and register it in the `TILE_SPRITES` object.

**Add a new hero type:**
1. Add an entry to `HERO_TYPES` in `constants.js`.
2. Add a `drawHeroName(ctx, x, y, t, hero)` function in `sprites.js`.
3. Add the new type to the relevant entries in `WAVE_CONFIGS`.

**Change the dungeon path:**
Edit `PATH_WAYPOINTS` in `constants.js`. `PATH_TILES` is computed from it automatically. The entrance is hardcoded at column 0, row 6 and the treasure at column 19, row 6.

**Inspect live game state:**
Open browser DevTools → Application tab → React DevTools, or temporarily add `window.__store = useGameStore.getState()` in `gameStore.js` during development to inspect state from the console.
