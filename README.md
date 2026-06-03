# 🏰 Dungeon Architect

> *"The heroes returned. Again. I've scheduled a performance review."*
> — Gerald, Skeleton MBA, Dungeon Operations Division

You are the villain. Heroes raid your dungeon to steal your treasure — place traps and monsters to stop them, then kill them on the way out before they escape with the gold. 14 waves, 3 difficulty settings, 11 hero types, and 16 defensive tools. Fully local, single-player, no internet required.

---

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

---

## How the Game Works

The dungeon has a **looping path**: heroes enter through the gate on the left, wind through the dungeon to the treasure vault on the right, grab the gold, then follow the return corridor back to the entrance. They only truly escape after completing the full loop. You have to stop them on **both legs of the trip**.

### Difficulty

Choose from three difficulty settings on the main menu before starting. Wave 1 is identical across all three — the gap opens from wave 4 onward and becomes dramatic in the final waves.

| | Easy 🌿 | Medium ⚔️ | Hard 💀 |
|---|---|---|---|
| Starting gold | 450g | 350g | 250g |
| Wave gold budget | ×1.5 | ×1.2 | ×1.0 |
| Treasure HP | 500 | 400 | 300 |
| Late-game hero HP scaling | 35% of hard | 65% of hard | Full |
| Wave 14 Knight HP | ~1,140 | ~1,860 | 2,700 |

### Plan Phase
- Select a tool from the left sidebar, left-click a tile to place it
- **On-path tools** (spikes, boulders, doors, lava) go on the lit stone corridor
- **Towers and monsters** go on empty tiles beside the path — they attack automatically by range
- Hover over any tower to preview its attack radius
- Right-click a placed tile to sell it for a 50% refund
- Hit **⚔ Send Them In** when ready

### Wave Phase
- Heroes spawn one at a time, staggered 1.5 seconds apart
- When a hero reaches the treasure vault they grab the gold — watch for the 💰 indicator
- **You can still place and sell tiles during the wave** — react as you watch
- Kill a gold-carrying hero for a +25g bonus on top of their normal value
- Gerald provides commentary. He has opinions about your performance.

### Results Phase
- Review how many heroes escaped with gold (the metric that matters)
- Pick one of three upgrade cards: unlock a new tool or take bonus gold
- Upgrade card gold scales with wave number (80g on wave 1, up to 200g+ on wave 14)
- If the treasure HP hits zero mid-wave, the wave ends immediately

---

## Hero Classes

Heroes scale in HP every wave via the `hpMult` system — wave 1 is the baseline, later waves multiply base HP to match your growing dungeon. Values below are base HP (wave 1 values).

### Tier 1 — Waves 1–7

| Hero | Base HP | Speed | Special |
|---|---|---|---|
| ⚔️ Knight | 300 | 1.2 tiles/s | Durable tank. Consistent speed carrying gold. |
| 🧙 Mage | 160 | 1.0 tiles/s | 50% fire resistance. Self-heals 4 HP/s; softly heals nearby allies 1 HP/s. |
| 🗡️ Thief | 130 | 2.0 tiles/s | Fastest hero. Disarms spike traps. Gets **faster** (135%) when fleeing with gold. |
| 🛡️ Paladin | 260 | 0.9 tiles/s | Heals adjacent allies 6 HP/s. Gold slows to 82% speed. |

### Tier 2 — Waves 8–10

| Hero | Base HP | Speed | Special |
|---|---|---|---|
| 🪓 Berserker | 450 | 1.8 tiles/s | **Immune to all slows.** Pure rage — ice shards and doors do nothing. |
| 🏹 Ranger | 120 | 2.2 tiles/s | **Immune to poison. 40% fire resistance.** Hard to stop. Gets faster with gold. |
| ✝️ Cleric | 200 | 0.9 tiles/s | Heals adjacent allies **12 HP/s** (2× Paladin). Also self-heals 3 HP/s. |

### Tier 3 — Waves 11–13

| Hero | Base HP | Speed | Special |
|---|---|---|---|
| 🔮 Archmage | 220 | 1.1 tiles/s | **70% fire resistance. Immune to slows.** Self-heals 4 HP/s; soft party heal 2 HP/s. |
| 🪖 Warlord | 480 | 1.0 tiles/s | Disarms **all** on-path traps — spikes, boulders, and lava left in ruins. |
| 🌿 Regenerator | 320 | 1.05 tiles/s | Self-heals **20 HP/s** (scaled higher on later waves). Needs sustained, overlapping fire. |

### Tier 4 — Wave 14

| Hero | Base HP | Speed | Special |
|---|---|---|---|
| ⚜️ Champion | 600 | 0.85 tiles/s | Takes only **45% damage** from all sources. The dungeon's greatest threat. |

---

## Your Arsenal

Defenses persist between waves — you're building the dungeon over all 14 waves. Unlocked-at-start tools are available immediately; Tier 2 tools unlock via upgrade cards earned at the end of each wave.

### On-Path Traps — placed on the corridor, heroes walk over them

| Tool | Cost | Effect |
|---|---|---|
| 🔩 Spike Plate | 30g | 25 damage on step. Thieves and Warlords disarm it. |
| 🪨 Rolling Boulder | 20g | 60 damage, one-shot (consumed after first trigger). Warlords destroy it harmlessly. |
| 🚪 Iron Door | 35g | Slows heroes to 40% speed. Excellent before a trap cluster. |
| 🌋 Lava Floor *(Tier 2)* | 65g | 15 HP/s damage while any hero stands on it — hits both legs of the trip. |

### Off-Path Towers & Monsters — placed beside the path, attack automatically by range

#### Unlocked at start

| Tool | Cost | Range | Damage | Attack Speed | Special |
|---|---|---|---|---|---|
| 🎯 Dart Tower | 45g | 3 | 20 | 1.0s | Reliable single-target fire. |
| 💀 Skeleton Guard | 50g | 2 | 18 | 0.9s | Sword arc; targets closest. |
| 🟢 Slime | 25g | 1.5 | 8 | 0.7s | Rapid spam at very short range. |
| 🧌 Cave Troll | 130g | 2 | 35 | 2.6s | Hits **all heroes in range at once.** Devastating vs grouped parties. |

#### Tier 2 — unlocked via upgrade cards

| Tool | Cost | Range | Damage | Attack Speed | Special |
|---|---|---|---|---|---|
| 🔥 Fire Vent | 70g | 2 | 40 | 2.0s | Heavy burst. Mages/Rangers/Archmages resist. |
| ☠️ Poison Mist | 55g | 2 | 8 | 1.8s | Applies 3 HP/s poison DoT on hit. Immune to Rangers. |
| 🧊 Ice Shard | 60g | 2.5 | 10 | 2.2s | Slows target to 50% for 2s. Berserkers and Archmages are immune. |
| 👻 Wraith | 90g | 3.5 | 30 | 2.0s | Physically rushes to target. Long range. |
| 🦇 Vampire Bat | 55g | 2 | 12 | 0.55s | Rapid bites **permanently drain max HP** — sustained healing becomes less effective. |
| 🌑 Shadow Stalker | 80g | 3 | 22 | 1.4s | Hunts gold-carrying heroes. **Deals double damage** on the return trip. |
| 👁️ Cursed Idol | 70g | 2.5 | 8 | 1.5s | Each hit adds a **curse stack (+15% dmg taken, max 3)**. Synergises with everything. |
| 🗿 Gargoyle | 90g | 4 | 38 | 2.2s | Always targets the **most advanced hero** — stops gold carriers. |

---

## Synergies Worth Knowing

**Ice → anything with slow damage** — ice slows a hero so every other tower nearby gets extra attack windows.

**Iron Door → Spike / Lava / Dart cluster** — heroes slow to 40% inside, spending far longer in the kill zone.

**Cursed Idol → everything** — place an idol early on the path so all downstream towers deal 45% extra damage to cursed heroes.

**Shadow Stalker + Gargoyle** — the stalker doubles damage on returning gold carriers; the gargoyle always targets the most advanced one. Cover the return corridor with these two and gold rarely makes it out.

**Vampire Bat + Cleric/Paladin counter** — a bat drains max HP so healer effectiveness shrinks each second a hero stays alive. Pairs with towers that deal sustained DPS.

**Cave Troll + chokepoints** — the troll hits everyone in range simultaneously. Place near doors (which slow heroes) so a full group bunches up together.

---

## Wave Compositions

All 14 waves. HP values shown are base × wave `hpMult` (Hard difficulty).

| Wave | Title | Heroes | hpMult |
|---|---|---|---|
| 1 | The First Scouting Party | 3× Knight | 1.0× |
| 2 | They Brought a Lockpick | 2× Knight, Thief | 1.0× |
| 3 | Mixed Tactics | 2× Knight, Mage, Thief | 1.2× |
| 4 | A Full Party | 2× Knight, Mage, Thief, Paladin | 1.5× |
| 5 | They Brought a Healer | 2× Knight, 2× Mage, Thief, Paladin | 1.9× |
| 6 | The Siege Begins | 3× Knight, Mage, 2× Thief, Paladin | 2.4× |
| 7 | They Are Not Giving Up | 3× Knight, 2× Mage, Thief, Paladin | 3.0× |
| 8 | The Rage Begins | Berserker, 2× Knight, Mage, Paladin, Ranger, Thief | 3.5× |
| 9 | Swift as Shadows | 2× Ranger, 2× Berserker, 2× Knight, Mage, Paladin | 4.0× |
| 10 | The Brute Squad | 3× Berserker, 2× Ranger, Knight, Mage, Paladin, Cleric | 4.8× |
| 11 | The Warlord Leads the Charge | Warlord, 2× Berserker, 2× Ranger, Knight, Mage, Paladin, Cleric, Regenerator | 5.5× |
| 12 | The Veteran Warband | 2× Warlord, 2× Berserker, 2× Ranger, Mage, Paladin, Cleric, Regenerator, Thief | 6.5× |
| 13 | The Arcane Host | Archmage, 2× Warlord, 2× Berserker, 2× Ranger, Knight, Paladin, Cleric, Regenerator, Thief | 7.5× |
| 14 | The Champion's Crusade | Champion, 2× Archmage, 2× Warlord, 2× Berserker, 2× Ranger, Cleric, Paladin, Regenerator | 9.0× |

---

## Tech Stack

| Technology | Role |
|---|---|
| React 18 + Vite | UI components and hot-reload dev server |
| Zustand | Centralised game state + simulation loop |
| HTML5 Canvas API | Dungeon grid renderer — all sprites drawn in code, no image files |
| `requestAnimationFrame` | Two independent loops: simulation (game logic) and rendering (canvas) |
| Custom sprite system | Animated characters built with Canvas 2D — every hero and tile drawn procedurally |
| Waypoint pathfinding | Fixed hero path with A* preview overlay for planning |

---

## Project Structure

```
src/
├── game/
│   ├── constants.js      All game data: tiles, tools, heroes, waves, difficulties, path
│   ├── simulation.js     Per-tick hero movement, trap/tower/status interactions
│   ├── sprites.js        Animated draw functions for every hero and tile type
│   └── pathfinding.js    A* with per-hero terrain weights (used for plan-phase preview)
├── store/
│   └── gameStore.js      Zustand store — state, actions, simulation loop, difficulty system
└── components/
    ├── App.jsx            Phase router (Menu → Plan/Wave → Results → Victory)
    ├── MainMenu.jsx       Title screen with difficulty card selector
    ├── GameScreen.jsx     Main layout: HUD + grid + sidebars
    ├── DungeonGrid.jsx    Canvas renderer + mouse handlers (active in both Plan and Wave)
    ├── ToolPalette.jsx    Left sidebar: tool selection (visible in all game phases)
    ├── BattleLog.jsx      Wave sidebar: hero HP bars, event log, Gerald commentary
    ├── HUD.jsx            Top bar: gold, treasure HP, wave counter, difficulty badge
    ├── ResultsScreen.jsx  Post-wave summary + upgrade card selection
    └── VictoryScreen.jsx  Final screen after completing all 14 waves
```
