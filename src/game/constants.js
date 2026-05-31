// ── Grid Constants ──
export const GRID_COLS = 20
export const GRID_ROWS = 13
export const TILE_SIZE = 48

// ── Tile Types ──
export const TILE = {
  EMPTY:    'empty',
  WALL:     'wall',
  ENTRANCE: 'entrance',
  TREASURE: 'treasure',
  // Traps
  SPIKE:    'spike',
  DART:     'dart',
  BOULDER:  'boulder',
  FIRE:     'fire',
  POISON:   'poison',
  // Monsters
  SKELETON: 'skeleton',
  WRAITH:   'wraith',
  SLIME:    'slime',
  // Structures
  DOOR:     'door',
  LEVER:    'lever',
}

// ── Tool Categories ──
export const TOOL_CATEGORY = {
  TRAPS:      'traps',
  MONSTERS:   'monsters',
  STRUCTURES: 'structures',
}

// ── Trap / Monster / Structure Definitions ──
// cost: gold to place | damage: per activation | description: flavor text
export const DUNGEON_TOOLS = [
  // TRAPS
  {
    id: TILE.SPIKE,
    category: TOOL_CATEGORY.TRAPS,
    label: 'Spike Plate',
    emoji: '🔩',
    cost: 30,
    damage: 25,
    description: 'Pressure-activated. Fires when stepped upon. Works great in doorways.',
    color: '#8a8a9a',
    unlocked: true,
    tier: 1,
  },
  {
    id: TILE.DART,
    category: TOOL_CATEGORY.TRAPS,
    label: 'Dart Wall',
    emoji: '🎯',
    cost: 45,
    damage: 18,
    description: 'Fires a volley on a 3-second timer. Heroes pause to wait for it — pair with another trap.',
    color: '#9a6a3a',
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
    description: 'One-time use. Crushes everything in a straight line. Economical chaos.',
    color: '#6a6a5a',
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
    description: 'AOE burst on a 4s cycle. Mages think they can time it. They cannot.',
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
    damage: 10,
    description: 'Slow damage over time. Excellent against Paladins who waste healing sustaining others.',
    color: '#3d7a1a',
    unlocked: false,
    tier: 2,
  },
  // MONSTERS
  {
    id: TILE.SKELETON,
    category: TOOL_CATEGORY.MONSTERS,
    label: 'Skeleton Guard',
    emoji: '💀',
    cost: 50,
    damage: 20,
    hp: 80,
    description: 'Patrols a 3-tile beat. Respawns free after 3 waves. Files expense reports.',
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
    hp: 40,
    description: 'Splits into two smaller slimes on death. Cheap and deeply annoying.',
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
    hp: 60,
    description: 'Phases through walls. Ignores the Thief\'s disarm. Hates paladins personally.',
    color: '#6a4a8a',
    unlocked: false,
    tier: 2,
  },
  // STRUCTURES
  {
    id: TILE.WALL,
    category: TOOL_CATEGORY.STRUCTURES,
    label: 'Stone Wall',
    emoji: '🧱',
    cost: 10,
    description: 'Blocks pathing entirely. Forces heroes to reroute. The foundation of any dungeon.',
    color: '#3a2f47',
    unlocked: true,
    tier: 1,
  },
  {
    id: TILE.DOOR,
    category: TOOL_CATEGORY.STRUCTURES,
    label: 'Iron Door',
    emoji: '🚪',
    cost: 35,
    description: 'Slows heroes by 60% while passing through. Destroyable by Knights (3 hits).',
    color: '#5a4a3a',
    unlocked: true,
    tier: 1,
  },
  {
    id: TILE.LEVER,
    category: TOOL_CATEGORY.STRUCTURES,
    label: 'Pressure Lever',
    emoji: '⚙️',
    cost: 40,
    description: 'Links to a trap tile. Heroes stepping here trigger that trap remotely.',
    color: '#7a6a4a',
    unlocked: true,
    tier: 1,
  },
]

// ── Hero Definitions ──
export const HERO_TYPES = {
  knight: {
    id: 'knight',
    label: 'Knight',
    emoji: '⚔️',
    hp: 120,
    speed: 1.2, // tiles per second
    color: '#c8a048',
    description: 'High HP, charges straight. Weak to magic traps.',
    // behaviors expressed as weights for pathfinding heuristics
    fearFire: 0.2,
    fearSpike: 0.5,
    canDisarm: false,
    detectsTraps: false,
    heals: false,
  },
  mage: {
    id: 'mage',
    label: 'Mage',
    emoji: '🧙',
    hp: 60,
    speed: 1.0,
    color: '#7a5abf',
    description: 'Detects traps 2 tiles ahead. Destroys magic barriers.',
    fearFire: 0.9,
    fearSpike: 0.8,
    canDisarm: false,
    detectsTraps: true,
    heals: false,
  },
  thief: {
    id: 'thief',
    label: 'Thief',
    emoji: '🗡️',
    hp: 50,
    speed: 2.0,
    color: '#4a7a3a',
    description: 'Fast, disarms traps, hugs walls.',
    fearFire: 0.7,
    fearSpike: 0.3,
    canDisarm: true,
    detectsTraps: false,
    heals: false,
  },
  paladin: {
    id: 'paladin',
    label: 'Paladin',
    emoji: '🛡️',
    hp: 100,
    speed: 0.9,
    color: '#c8c848',
    description: 'Heals adjacent allies each second.',
    fearFire: 0.5,
    fearSpike: 0.4,
    canDisarm: false,
    detectsTraps: false,
    heals: true,
  },
}

// ── Wave Compositions ──
// Each wave: array of hero type IDs to spawn
export const WAVE_CONFIGS = [
  { wave: 1, heroes: ['knight', 'knight', 'knight'], gold: 120, label: 'The First Scouting Party' },
  { wave: 2, heroes: ['knight', 'knight', 'thief'], gold: 140, label: 'They Brought a Lockpick' },
  { wave: 3, heroes: ['knight', 'mage', 'thief'], gold: 160, label: 'Mixed Tactics' },
  { wave: 4, heroes: ['knight', 'knight', 'mage', 'thief'], gold: 190, label: 'A Full Party' },
  { wave: 5, heroes: ['knight', 'mage', 'thief', 'paladin'], gold: 220, label: 'They Brought a Healer' },
  { wave: 6, heroes: ['knight', 'knight', 'mage', 'thief', 'paladin'], gold: 260, label: 'The Siege Begins' },
  { wave: 7, heroes: ['knight', 'knight', 'knight', 'mage', 'mage', 'paladin'], gold: 300, label: 'They Are Not Giving Up' },
]

// ── Gold Constants ──
export const STARTING_GOLD = 200
export const SELL_REFUND_RATE = 0.5
export const HERO_KILL_GOLD = { knight: 30, mage: 40, thief: 35, paladin: 50 }

// ── Treasure Constants ──
export const TREASURE_MAX_HP = 300
export const TREASURE_HERO_DAMAGE = 80 // damage to treasure when a hero reaches it
