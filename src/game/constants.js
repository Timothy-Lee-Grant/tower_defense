// ── Grid Constants ──
export const GRID_COLS = 20
export const GRID_ROWS = 13
export const TILE_SIZE = 48

// ── Tile Types ──
export const TILE = {
  EMPTY:    'empty',
  PATH:     'path',      // heroes walk on these
  ENTRANCE: 'entrance',
  TREASURE: 'treasure',
  // On-path traps (placed ON path tiles, trigger on step)
  SPIKE:    'spike',
  BOULDER:  'boulder',
  DOOR:     'door',
  // Off-path towers (placed beside path, attack by range)
  DART:     'dart',
  FIRE:     'fire',
  POISON:   'poison',
  // Off-path monsters (placed beside path, attack by range)
  SKELETON: 'skeleton',
  WRAITH:   'wraith',
  SLIME:    'slime',
}

// ── Tool Categories ──
export const TOOL_CATEGORY = {
  TRAPS:      'traps',
  MONSTERS:   'monsters',
  STRUCTURES: 'structures',
}

// ── Fixed Path Definition ──
// Waypoints are the corners of the winding path (col, row).
// Heroes always walk this route from first to last waypoint.
const PATH_WAYPOINTS = [
  { col: 0,  row: 6  },  // entrance — left edge, middle
  { col: 4,  row: 6  },
  { col: 4,  row: 1  },
  { col: 9,  row: 1  },
  { col: 9,  row: 11 },
  { col: 14, row: 11 },
  { col: 14, row: 1  },
  { col: 19, row: 1  },
  { col: 19, row: 6  },  // treasure — right edge, middle
]

function generatePathTiles(waypoints) {
  const tiles = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i]
    const to   = waypoints[i + 1]
    if (from.row === to.row) {
      const step = to.col > from.col ? 1 : -1
      for (let c = from.col; c !== to.col; c += step) {
        tiles.push({ col: c, row: from.row })
      }
    } else {
      const step = to.row > from.row ? 1 : -1
      for (let r = from.row; r !== to.row; r += step) {
        tiles.push({ col: from.col, row: r })
      }
    }
  }
  tiles.push(waypoints[waypoints.length - 1])
  return tiles
}

export const PATH_TILES = generatePathTiles(PATH_WAYPOINTS)
export const ENTRANCE   = PATH_TILES[0]
export const TREASURE   = PATH_TILES[PATH_TILES.length - 1]

// Fast Set for O(1) path-tile lookup: "col,row"
export const PATH_SET = new Set(PATH_TILES.map(p => `${p.col},${p.row}`))

// ── Tool Definitions ──
// placesOn: 'path' → must be placed on a PATH tile
//           'open' → must be placed on an EMPTY (non-path) tile
// range:       attack radius in tiles (off-path towers only)
// attackSpeed: ms between attacks
// slow:        speed multiplier for heroes on this tile (on-path structures)
// poisonOnHit: also applies DoT when attacking
export const DUNGEON_TOOLS = [
  // ── On-path traps ──
  {
    id: TILE.SPIKE,
    category: TOOL_CATEGORY.TRAPS,
    label: 'Spike Plate',
    emoji: '🔩',
    cost: 30,
    damage: 25,
    placesOn: 'path',
    description: 'On-path. Triggers when stepped on. Thieves disarm it.',
    color: '#8a8a9a',
    unlocked: true,
    tier: 1,
  },
  {
    id: TILE.BOULDER,
    category: TOOL_CATEGORY.TRAPS,
    label: 'Rolling Boulder',
    emoji: '🪨',
    cost: 20,
    damage: 60,
    placesOn: 'path',
    description: 'On-path. One-time use — crushes the first hero to step on it.',
    color: '#6a6a5a',
    unlocked: true,
    tier: 1,
  },
  {
    id: TILE.DOOR,
    category: TOOL_CATEGORY.STRUCTURES,
    label: 'Iron Door',
    emoji: '🚪',
    cost: 35,
    damage: 0,
    slow: 0.4,
    placesOn: 'path',
    description: 'On-path. Slows heroes to 40% speed while passing through.',
    color: '#5a4a3a',
    unlocked: true,
    tier: 1,
  },
  // ── Off-path towers ──
  {
    id: TILE.DART,
    category: TOOL_CATEGORY.TRAPS,
    label: 'Dart Tower',
    emoji: '🎯',
    cost: 45,
    damage: 18,
    range: 3,
    attackSpeed: 1200,
    placesOn: 'open',
    description: 'Beside path. Fires darts at heroes within 3 tiles.',
    color: '#9a6a3a',
    unlocked: true,
    tier: 1,
  },
  {
    id: TILE.FIRE,
    category: TOOL_CATEGORY.TRAPS,
    label: 'Fire Vent',
    emoji: '🔥',
    cost: 70,
    damage: 35,
    range: 2,
    attackSpeed: 2500,
    placesOn: 'open',
    description: 'Beside path. Scorches heroes within 2 tiles. Slow but hard-hitting.',
    color: '#c4430a',
    unlocked: false,
    tier: 2,
  },
  {
    id: TILE.POISON,
    category: TOOL_CATEGORY.TRAPS,
    label: 'Poison Mist',
    emoji: '☠️',
    cost: 55,
    damage: 8,
    range: 2,
    attackSpeed: 2000,
    poisonOnHit: true,
    placesOn: 'open',
    description: 'Beside path. Poisons heroes within 2 tiles — damage lingers.',
    color: '#3d7a1a',
    unlocked: false,
    tier: 2,
  },
  // ── Off-path monsters ──
  {
    id: TILE.SKELETON,
    category: TOOL_CATEGORY.MONSTERS,
    label: 'Skeleton Guard',
    emoji: '💀',
    cost: 50,
    damage: 20,
    range: 2,
    attackSpeed: 1000,
    placesOn: 'open',
    description: 'Beside path. Attacks heroes within 2 tiles. Files expense reports.',
    color: '#c8b89a',
    unlocked: true,
    tier: 1,
  },
  {
    id: TILE.SLIME,
    category: TOOL_CATEGORY.MONSTERS,
    label: 'Slime',
    emoji: '🟢',
    cost: 25,
    damage: 8,
    range: 1.5,
    attackSpeed: 800,
    placesOn: 'open',
    description: 'Beside path. Short range, fast attacks. Cheap and annoying.',
    color: '#3d7a1a',
    unlocked: true,
    tier: 1,
  },
  {
    id: TILE.WRAITH,
    category: TOOL_CATEGORY.MONSTERS,
    label: 'Wraith',
    emoji: '👻',
    cost: 90,
    damage: 30,
    range: 3,
    attackSpeed: 2500,
    placesOn: 'open',
    description: 'Beside path. Long-range ghost. Ignores armor. Hates paladins.',
    color: '#6a4a8a',
    unlocked: false,
    tier: 2,
  },
]

// ── Hero Definitions ──
export const HERO_TYPES = {
  knight: {
    id: 'knight', label: 'Knight', emoji: '⚔️',
    hp: 120, speed: 1.2, color: '#c8a048',
    description: 'High HP, charges straight. Weak to magic.',
    canDisarm: false, heals: false,
  },
  mage: {
    id: 'mage', label: 'Mage', emoji: '🧙',
    hp: 60, speed: 1.0, color: '#7a5abf',
    description: 'Low HP. Takes 50% damage from fire.',
    canDisarm: false, heals: false, fireResist: 0.5,
  },
  thief: {
    id: 'thief', label: 'Thief', emoji: '🗡️',
    hp: 50, speed: 2.0, color: '#4a7a3a',
    description: 'Fast. Disarms spike traps instead of triggering them.',
    canDisarm: true, heals: false,
  },
  paladin: {
    id: 'paladin', label: 'Paladin', emoji: '🛡️',
    hp: 100, speed: 0.9, color: '#c8c848',
    description: 'Heals adjacent allies each second.',
    canDisarm: false, heals: true,
  },
}

// ── Wave Compositions ──
export const WAVE_CONFIGS = [
  { wave: 1, heroes: ['knight', 'knight', 'knight'],                            gold: 120, label: 'The First Scouting Party' },
  { wave: 2, heroes: ['knight', 'knight', 'thief'],                             gold: 140, label: 'They Brought a Lockpick' },
  { wave: 3, heroes: ['knight', 'mage', 'thief'],                               gold: 160, label: 'Mixed Tactics' },
  { wave: 4, heroes: ['knight', 'knight', 'mage', 'thief'],                     gold: 190, label: 'A Full Party' },
  { wave: 5, heroes: ['knight', 'mage', 'thief', 'paladin'],                    gold: 220, label: 'They Brought a Healer' },
  { wave: 6, heroes: ['knight', 'knight', 'mage', 'thief', 'paladin'],          gold: 260, label: 'The Siege Begins' },
  { wave: 7, heroes: ['knight', 'knight', 'knight', 'mage', 'mage', 'paladin'], gold: 300, label: 'They Are Not Giving Up' },
]

// ── Economy ──
export const STARTING_GOLD        = 200
export const SELL_REFUND_RATE     = 0.5
export const HERO_KILL_GOLD       = { knight: 30, mage: 40, thief: 35, paladin: 50 }
export const TREASURE_MAX_HP      = 300
export const TREASURE_HERO_DAMAGE = 80
