# 🏰 Dungeon Architect

> *"The heroes returned. Again. I've scheduled a performance review."*
> — Gerald, Skeleton MBA, Dungeon Operations Division

You are the villain. Heroes raid your dungeon to steal your treasure — place traps and monsters to stop them, then kill them on the way out before they escape with the gold. Fully local, single-player, no internet required.

---

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

---

## How the Game Works

The dungeon has a **looping path**: heroes enter through the gate on the left, wind through the dungeon to the treasure vault on the right, grab the gold, then follow the return corridor back to the entrance. That is when they truly escape. You have to stop them on **both legs of the trip**.

### Plan Phase
- Select a tool from the left sidebar and left-click a tile to place it
- **On-path tools** (spikes, boulders, doors, lava) go directly on the lit stone corridor
- **Towers and monsters** go on empty tiles beside the path — they attack heroes automatically by range
- Hover over any tower to preview its attack radius as a gold highlight
- Right-click a placed tile to sell it back for a 50% refund
- Hit **⚔ Send Them In** when you're ready

### Wave Phase
- Heroes spawn one at a time and walk the path
- When a hero reaches the treasure vault, a 💰 icon appears above them — they've grabbed the gold
- Towers and monsters attack automatically; watch the battle log for events
- Kill a gold-carrying hero for a +25g bonus on top of their normal value
- Gerald provides commentary. He has opinions.

### Results Phase
- See how many heroes escaped with gold (the metric that matters)
- Pick one of three upgrade cards to unlock a new tool for the next wave
- If the treasure HP hits zero mid-wave, the wave ends immediately

---

## Hero Classes

| Hero | HP | Speed | Special |
|------|----|-------|---------|
| ⚔️ Knight | 120 | 1.2 tiles/s | No speed change when carrying gold |
| 🧙 Mage | 60 | 1.0 tiles/s | Takes 50% fire damage; **slows to 72% speed when fleeing** |
| 🗡️ Thief | 50 | 2.0 tiles/s | Disarms spike traps; **speeds up to 135% when fleeing** |
| 🛡️ Paladin | 100 | 0.9 tiles/s | Heals allies 5 HP/s; **slows to 82% when carrying gold** |

Each class carries gold differently — the Thief is a professional getaway artist, the Mage is not.

---

## Your Arsenal

### On-Path Traps — placed on the corridor, heroes walk over them

| Tool | Cost | Effect |
|------|------|--------|
| 🔩 Spike Plate | 30g | 25 damage on step; Thieves disarm it |
| 🪨 Rolling Boulder | 20g | 60 damage, one-shot (consumed after first hero) |
| 🚪 Iron Door | 35g | Slows heroes to 40% speed while passing |
| 🌋 Lava Floor *(Tier 2)* | 65g | 15 HP/s damage while any hero stands on it — hits inbound and outbound |

### Off-Path Towers — placed beside the path, attack automatically by range

| Tool | Cost | Range | Damage | Special |
|------|------|-------|--------|---------|
| 🎯 Dart Tower | 45g | 3 tiles | 20 | Reliable, fast fire rate |
| 💀 Skeleton Guard | 50g | 2 tiles | 18 | Swings sword; roams tile |
| 🟢 Slime | 25g | 1.5 tiles | 8 | Very short range, very fast |
| 🔥 Fire Vent *(Tier 2)* | 70g | 2 tiles | 40 | Heavy burst; Mages take half |
| ☠️ Poison Mist *(Tier 2)* | 55g | 2 tiles | 8 | Applies 3 HP/s DoT on hit |
| 🧊 Ice Shard *(Tier 2)* | 60g | 2.5 tiles | 10 | Slows target to 50% for 2s |
| 👻 Wraith *(Tier 2)* | 90g | 3.5 tiles | 30 | Physically rushes to target to attack |

### Synergies worth knowing
- **Ice → Dart/Skeleton** — ice slows the hero so other towers have more attack windows
- **Iron Door → Spike/Lava** — heroes slow down, spending more time taking DoT damage
- **Poison → anything** — heroes already weakened; easier for other towers to finish the kill

---

## Wave Compositions

| Wave | Title | Heroes |
|------|-------|--------|
| 1 | The First Scouting Party | 3× Knight |
| 2 | They Brought a Lockpick | 2× Knight, 1× Thief |
| 3 | Mixed Tactics | Knight, Mage, Thief |
| 4 | A Full Party | 2× Knight, Mage, Thief |
| 5 | They Brought a Healer | Knight, Mage, Thief, Paladin |
| 6 | The Siege Begins | 2× Knight, Mage, Thief, Paladin |
| 7 | They Are Not Giving Up | 3× Knight, 2× Mage, Paladin |

---

## Tech Stack

| Technology | Role |
|------------|------|
| React 18 + Vite | UI components and dev server |
| Zustand | Centralised game state |
| HTML5 Canvas API | Dungeon grid renderer — all sprites drawn in code |
| `requestAnimationFrame` | Simulation loop and canvas draw loop |
| Custom sprite system | Animated characters drawn with canvas 2D — no image files |
| Fixed-path system | Waypoint-based hero movement replaces A* pathfinding |

---

## Project Structure

```
src/
├── game/
│   ├── constants.js    Game data: all tiles, tools, heroes, waves, the path
│   ├── simulation.js   Per-tick hero movement, trap/tower interactions
│   └── sprites.js      Animated sprite drawing functions for every entity
├── store/
│   └── gameStore.js    Zustand store — single source of truth, runs simulation loop
├── components/
│   ├── App.jsx          Phase router (Menu → Plan → Wave → Results)
│   ├── MainMenu.jsx     Title screen
│   ├── GameScreen.jsx   Main layout: HUD + grid + sidebars
│   ├── DungeonGrid.jsx  Canvas renderer + mouse handlers + attack animations
│   ├── ToolPalette.jsx  Left sidebar: tool selection tabs
│   ├── BattleLog.jsx    Wave sidebar: hero status + event log + Gerald
│   ├── HUD.jsx          Top bar: gold, treasure HP, wave info
│   └── ResultsScreen.jsx Post-wave summary + upgrade card selection
└── index.css            CSS custom properties (design tokens)
```

---

## Roadmap

- [ ] Sound effects (trap triggers, Gerald voice lines)
- [ ] Campaign map with distinct levels and different path layouts
- [ ] Berserker and Bard hero classes
- [ ] Dungeon themes (bone, lava, ice) that restyle the path and tiles
- [ ] Slow-motion replay of the most dramatic wave moments
- [ ] Persistent high score tracking between sessions
- [ ] Multiple simultaneous heroes entering at different points
