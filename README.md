# 🏰 Dungeon Architect

> *"The heroes returned. Again. I've scheduled a performance review."*
> — Gerald, Skeleton MBA, Dungeon Operations Division

A tower-defense game where **you are the villain**. Place traps, command monsters, and stop adventuring heroes from reaching your treasure room. Fully local, single-player, no internet required.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open http://localhost:5173
```

---

## How to Play

### Plan Phase
- **Select a tool** from the left sidebar (Traps / Monsters / Structures tabs)
- **Left-click** any tile on the grid to place it (costs gold)
- **Right-click** a placed tile to sell it back (50% refund)
- Click **👁 Paths** to preview how different hero classes will route through your dungeon
- Click **⚔ Send Them In** when you're ready

### Wave Phase
- Watch heroes invade your dungeon in real time
- Heroes react to your traps — Mages avoid fire, Thieves disarm spikes, Paladins heal allies
- Monitor the battle log on the left for live events
- Gerald will provide commentary. He has opinions.

### Results Phase
- See wave stats and gold earned
- **Pick one of three upgrade cards** to unlock new tools for the next wave
- Return to Plan Phase with your new budget

---

## Hero Classes

| Hero | HP | Speed | Behavior |
|------|-----|-------|----------|
| ⚔️ Knight | 120 | Medium | Charges straight, weak to magic traps |
| 🧙 Mage | 60 | Medium | Detects & avoids traps, destroys magic barriers |
| 🗡️ Thief | 50 | Fast | Can disarm spike traps, finds alternate routes |
| 🛡️ Paladin | 100 | Slow | Heals adjacent allies each second |

---

## Your Arsenal

### Traps (Tier 1 — available from start)
- 🔩 **Spike Plate** (30g) — Pressure-activated, fires on step
- 🎯 **Dart Wall** (45g) — Timer-based volley
- 🪨 **Rolling Boulder** (20g) — One-time use, high damage

### Traps (Tier 2 — unlock via upgrade cards)
- 🔥 **Fire Vent** (70g) — AOE burst, 4s cycle
- ☠️ **Poison Mist** (55g) — Slow damage over time

### Monsters
- 💀 **Skeleton Guard** (50g) — Patrols 3 tiles, respawns every 3 waves
- 🟢 **Slime** (25g) — Splits on death, cheap nuisance
- 👻 **Wraith** (90g) — Phases through walls (unlock required)

### Structures
- 🧱 **Stone Wall** (10g) — Blocks paths, forces rerouting
- 🚪 **Iron Door** (35g) — Slows heroes 60%
- ⚙️ **Pressure Lever** (40g) — Links to trap tiles for remote activation

---

## Tech Stack

```
React 18 + Vite       — UI framework and dev server
Zustand               — Game state management
HTML5 Canvas          — Dungeon grid renderer (custom, no PixiJS dependency)
A* Pathfinding        — Hero navigation with per-hero weighted costs
requestAnimationFrame — Simulation loop
```

> **Note:** The current implementation uses a pure HTML5 Canvas renderer for the dungeon grid
> rather than PixiJS. This removes one dependency and keeps the build lean. Swapping in PixiJS
> for sprite-sheet support is a natural next step when you want animated tile sprites.

---

## Project Structure

```
src/
├── game/
│   ├── constants.js      # All game data: tiles, heroes, waves, tools
│   ├── pathfinding.js    # A* implementation with hero behavior weights
│   └── simulation.js     # Per-frame hero movement and trap interaction
├── store/
│   └── gameStore.js      # Zustand store — single source of truth
├── components/
│   ├── MainMenu.jsx       # Title screen
│   ├── GameScreen.jsx     # Main layout: HUD + grid + sidebars
│   ├── DungeonGrid.jsx    # Canvas renderer + mouse handlers
│   ├── ToolPalette.jsx    # Left sidebar: tool selection
│   ├── BattleLog.jsx      # Right sidebar: wave events + hero HP
│   ├── HUD.jsx            # Top bar: gold, treasure HP, wave controls
│   └── ResultsScreen.jsx  # Post-wave summary + upgrade card picker
├── App.jsx                # Phase router
├── main.jsx               # Entry point
└── index.css              # Global design tokens
```

---

## Roadmap (Next Steps)

- [ ] Sprite sheet animations for heroes and traps
- [ ] Sound effects (trap triggers, hero deaths, Gerald voice lines)
- [ ] Campaign map screen with 10 levels
- [ ] Berserker and Bard hero classes
- [ ] Dungeon themes (bone, lava, ice, clockwork)
- [ ] Slow-motion replay of wave highlights
- [ ] Persistent high score / best wave tracking (localStorage)
- [ ] Wraith "phase-through-wall" pathfinding mode
- [ ] Lever-to-trap linking UI (click lever → click trap to link)
