// ── Grid Constants ──
export const GRID_COLS = 20
export const GRID_ROWS = 13
export const TILE_SIZE = 48

// ── Tile Types ──
export const TILE = {
  EMPTY:    'empty',
  PATH:     'path',
  ENTRANCE: 'entrance',
  TREASURE: 'treasure',
  // On-path traps
  SPIKE:    'spike',
  BOULDER:  'boulder',
  DOOR:     'door',
  // Off-path towers
  DART:     'dart',
  FIRE:     'fire',
  POISON:   'poison',
  // Off-path monsters
  SKELETON: 'skeleton',
  WRAITH:   'wraith',
  SLIME:    'slime',
}

export const TOOL_CATEGORY = {
  TRAPS:      'traps',
  MONSTERS:   'monsters',
  STRUCTURES: 'structures',
}

// ── Path Definition ────────────────────────────────────────────────────────
//
// The path is a LOOP.  Heroes enter at (0,6), wind through the dungeon to the
// treasure at (19,6), then follow the return route back to (0,6) — that is
// when they truly escape.
//
// Layout (20 × 13 grid):
//
//   ┌──────────────────────────────────────────────┐
//   │  ← wide ──────── top horizontal ────── wide→│ row 1
//   │  col 3↑           row 2            ↓col 17  │ row 2
//   │  ┌────────────────────────────────────┐     │ row 3
//   │  │         (buildable interior)       │     │ ...
//   │  │  ← col4 to col16, rows 3–9 →      │     │ row 6  🚪→→→→💰
//   │  │                                   │     │ ...
//   │  └────────────────────────────────────┘     │ row 9
//   │  col 0↑  ←── bottom horizontal ────  col 19↓│ row 10
//   │      ← wide ─────── row 11 ──────── wide → │ row 11
//   └──────────────────────────────────────────────┘
//
// Entrance / escape: (0, 6) — left edge, middle row
// Treasure:          (19, 6) — right edge, middle row

const PATH_WAYPOINTS = [
  // ── Outbound (upper route) ──
  { col: 0,  row: 6  },   // [0] entrance
  { col: 3,  row: 6  },   // turn up
  { col: 3,  row: 2  },   // turn right along top
  { col: 17, row: 2  },   // turn down
  { col: 17, row: 6  },   // approach treasure
  { col: 19, row: 6  },   // [midpoint] TREASURE — heroes pick up gold here
  // ── Return (lower route) ──
  { col: 19, row: 10 },   // turn left along bottom
  { col: 0,  row: 10 },   // turn up left edge
  { col: 0,  row: 6  },   // [last] escape — back at entrance
]

function buildCenterline(waypoints) {
  const tiles = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1]
    if (a.row === b.row) {
      const step = b.col > a.col ? 1 : -1
      for (let c = a.col; c !== b.col; c += step) tiles.push({ col: c, row: a.row })
    } else {
      const step = b.row > a.row ? 1 : -1
      for (let r = a.row; r !== b.row; r += step) tiles.push({ col: a.col, row: r })
    }
  }
  tiles.push(waypoints[waypoints.length - 1])
  return tiles
}

// Centerline: the tiles heroes actually walk on (used for movement & on-path trap placement)
export const PATH_TILES = buildCenterline(PATH_WAYPOINTS)

// Extra width tiles — visual broadening of certain corridors.
// Heroes do NOT walk on these; nothing can be placed on them.
// They are marked TILE.PATH in the grid purely for aesthetics.
const _extra = []

// Top horizontal (row 2) → also row 1 for the long middle section
for (let c = 4; c <= 16; c++) _extra.push({ col: c, row: 1 })

// Bottom horizontal (row 10) → also row 11 for most of it
for (let c = 1; c <= 18; c++) _extra.push({ col: c, row: 11 })

// Right-side corridor (col 19, rows 6-10) → also col 18 for middle rows
for (let r = 7; r <= 9; r++) _extra.push({ col: 18, row: r })

// Entrance approach — slight widening either side of the gate
_extra.push({ col: 1, row: 5 }, { col: 1, row: 7 })
_extra.push({ col: 0, row: 5 }, { col: 0, row: 7 })

// Corner "plazas" at the turning points (adds visual bulk to tight corners)
// Top-left corner (col 3, row 2 area)
_extra.push({ col: 4, row: 2 }, { col: 3, row: 3 })
// Top-right corner (col 17, row 2 area)
_extra.push({ col: 16, row: 2 }, { col: 17, row: 3 })
// Bottom-right corner (col 19, row 10 area)
_extra.push({ col: 18, row: 10 }, { col: 19, row: 9 })
// Bottom-left corner (col 0, row 10 area)
_extra.push({ col: 1, row: 10 }, { col: 0, row: 9 })

// Deduplicate against the centerline
const _centerKeys = new Set(PATH_TILES.map(p => `${p.col},${p.row}`))
const PATH_EXTRA = _extra.filter(p => !_centerKeys.has(`${p.col},${p.row}`))

// All path tiles: centerline + width extras (used to initialise the grid)
export const PATH_ALL = [...PATH_TILES, ...PATH_EXTRA]

// O(1) lookup sets
export const PATH_SET        = new Set(PATH_ALL.map(p => `${p.col},${p.row}`))   // all path positions
export const PATH_CENTER_SET = new Set(PATH_TILES.map(p => `${p.col},${p.row}`)) // walkable centerline only

export const ENTRANCE = { col: 0,  row: 6 }
export const TREASURE = { col: 19, row: 6 }

// ── Tool Definitions ───────────────────────────────────────────────────────
export const DUNGEON_TOOLS = [
  // On-path traps (placed ON path centerline, heroes step on them)
  {
    id: TILE.SPIKE, category: TOOL_CATEGORY.TRAPS,
    label: 'Spike Plate', emoji: '🔩', cost: 30, damage: 25, placesOn: 'path',
    description: 'On-path. Triggers when stepped on. Thieves disarm it.',
    color: '#8a8a9a', unlocked: true, tier: 1,
  },
  {
    id: TILE.BOULDER, category: TOOL_CATEGORY.TRAPS,
    label: 'Rolling Boulder', emoji: '🪨', cost: 20, damage: 60, placesOn: 'path',
    description: 'On-path. One-time use — crushes the first hero to step on it.',
    color: '#6a6a5a', unlocked: true, tier: 1,
  },
  {
    id: TILE.DOOR, category: TOOL_CATEGORY.STRUCTURES,
    label: 'Iron Door', emoji: '🚪', cost: 35, damage: 0, slow: 0.4, placesOn: 'path',
    description: 'On-path. Slows heroes to 40% speed while passing through.',
    color: '#5a4a3a', unlocked: true, tier: 1,
  },
  // Off-path towers (placed beside path, attack by range)
  {
    id: TILE.DART, category: TOOL_CATEGORY.TRAPS,
    label: 'Dart Tower', emoji: '🎯', cost: 45, damage: 18,
    range: 3, attackSpeed: 1200, placesOn: 'open',
    description: 'Beside path. Fires darts at heroes within 3 tiles.',
    color: '#9a6a3a', unlocked: true, tier: 1,
  },
  {
    id: TILE.FIRE, category: TOOL_CATEGORY.TRAPS,
    label: 'Fire Vent', emoji: '🔥', cost: 70, damage: 35,
    range: 2, attackSpeed: 2500, placesOn: 'open',
    description: 'Beside path. Scorches heroes within 2 tiles.',
    color: '#c4430a', unlocked: false, tier: 2,
  },
  {
    id: TILE.POISON, category: TOOL_CATEGORY.TRAPS,
    label: 'Poison Mist', emoji: '☠️', cost: 55, damage: 8,
    range: 2, attackSpeed: 2000, poisonOnHit: true, placesOn: 'open',
    description: 'Beside path. Poisons heroes within 2 tiles — damage lingers.',
    color: '#3d7a1a', unlocked: false, tier: 2,
  },
  // Off-path monsters
  {
    id: TILE.SKELETON, category: TOOL_CATEGORY.MONSTERS,
    label: 'Skeleton Guard', emoji: '💀', cost: 50, damage: 20,
    range: 2, attackSpeed: 1000, placesOn: 'open',
    description: 'Beside path. Attacks heroes within 2 tiles. Files expense reports.',
    color: '#c8b89a', unlocked: true, tier: 1,
  },
  {
    id: TILE.SLIME, category: TOOL_CATEGORY.MONSTERS,
    label: 'Slime', emoji: '🟢', cost: 25, damage: 8,
    range: 1.5, attackSpeed: 800, placesOn: 'open',
    description: 'Beside path. Short range, fast attacks. Cheap and annoying.',
    color: '#3d7a1a', unlocked: true, tier: 1,
  },
  {
    id: TILE.WRAITH, category: TOOL_CATEGORY.MONSTERS,
    label: 'Wraith', emoji: '👻', cost: 90, damage: 30,
    range: 3, attackSpeed: 2500, placesOn: 'open',
    description: 'Beside path. Long-range ghost. Ignores armor. Hates paladins.',
    color: '#6a4a8a', unlocked: false, tier: 2,
  },
]

// ── Hero Definitions ───────────────────────────────────────────────────────
export const HERO_TYPES = {
  knight:  { id: 'knight',  label: 'Knight',  emoji: '⚔️',  hp: 120, speed: 1.2, color: '#c8a048', canDisarm: false, heals: false },
  mage:    { id: 'mage',    label: 'Mage',    emoji: '🧙',  hp: 60,  speed: 1.0, color: '#7a5abf', canDisarm: false, heals: false, fireResist: 0.5 },
  thief:   { id: 'thief',   label: 'Thief',   emoji: '🗡️', hp: 50,  speed: 2.0, color: '#4a7a3a', canDisarm: true,  heals: false },
  paladin: { id: 'paladin', label: 'Paladin', emoji: '🛡️', hp: 100, speed: 0.9, color: '#c8c848', canDisarm: false, heals: true  },
}

// ── Wave Compositions ──────────────────────────────────────────────────────
export const WAVE_CONFIGS = [
  { wave: 1, heroes: ['knight','knight','knight'],                            gold: 120, label: 'The First Scouting Party' },
  { wave: 2, heroes: ['knight','knight','thief'],                             gold: 140, label: 'They Brought a Lockpick' },
  { wave: 3, heroes: ['knight','mage','thief'],                               gold: 160, label: 'Mixed Tactics' },
  { wave: 4, heroes: ['knight','knight','mage','thief'],                      gold: 190, label: 'A Full Party' },
  { wave: 5, heroes: ['knight','mage','thief','paladin'],                     gold: 220, label: 'They Brought a Healer' },
  { wave: 6, heroes: ['knight','knight','mage','thief','paladin'],            gold: 260, label: 'The Siege Begins' },
  { wave: 7, heroes: ['knight','knight','knight','mage','mage','paladin'],    gold: 300, label: 'They Are Not Giving Up' },
]

// ── Economy ────────────────────────────────────────────────────────────────
export const STARTING_GOLD        = 200
export const SELL_REFUND_RATE     = 0.5
export const HERO_KILL_GOLD       = { knight: 30, mage: 40, thief: 35, paladin: 50 }
export const TREASURE_MAX_HP      = 300
export const TREASURE_HERO_DAMAGE = 80
