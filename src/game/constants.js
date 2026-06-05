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
  // On-path traps/structures (heroes walk over them)
  SPIKE:    'spike',
  BOULDER:  'boulder',
  DOOR:     'door',
  LAVA:     'lava',     // persistent DoT while traversing
  // New on-path traps (7.1)
  PIT:      'pit',       // 50 dmg + 3s slow on step; resets after 8 s
  PENDULUM: 'pendulum',  // 40 dmg only during swing phase (2 s on / 2 s off)
  TAR:      'tar',       // 0.25× speed; Berserkers immune but take 15 HP/s
  ELECTRIC: 'electric',  // 25 dmg + 15 chain to nearest hero within 2 tiles
  STASIS:   'stasis',    // freeze 2 s — immune to damage, but towers reload free
  // Off-path towers/monsters (ranged attacks beside path)
  DART:     'dart',
  FIRE:     'fire',
  POISON:   'poison',
  ICE:      'ice',      // NEW: slows heroes
  SKELETON: 'skeleton',
  WRAITH:   'wraith',
  SLIME:    'slime',
  // New off-path towers (7.2)
  CATAPULT: 'catapult',  // random-target, long range, heavy single hit
  SPIDER:   'spider',    // rapid bites — applies BOTH slow + poison every hit
  MIMIC:    'mimic',     // no damage; distracts heroes, doubles nearby tower speed
  // Tier 2 monsters
  TROLL:    'troll',
  BAT:      'bat',
  SHADOW:   'shadow',
  IDOL:     'idol',
  GARGOYLE: 'gargoyle',
}

export const TOOL_CATEGORY = {
  TRAPS:      'traps',
  MONSTERS:   'monsters',
  STRUCTURES: 'structures',
}

// ── Fixed Path (circular loop) ─────────────────────────────────────────────
//
//  Heroes ENTER at (0,6), wind OUTBOUND through the top corridor to the
//  TREASURE at (19,6), then follow the RETURN route along the bottom back
//  to (0,6) — that is when they truly ESCAPE with the gold.
//
//  Outbound  →→  (0,6) col3↑ row2 col17↓ (17,6) →→ (19,6) TREASURE
//  Return    →→  (19,6) ↓ row10 ←← (0,10) ↑ (0,6) ESCAPE

// ── Path / Layout System ──────────────────────────────────────────────────
// buildCenterline converts waypoints into a flat list of grid tiles (L-shaped
// moves between each pair of waypoints).  The path is a closed loop — the
// last waypoint equals the first (entrance = escape point).

export function buildCenterline(wps) {
  const tiles = []
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1]
    if (a.row === b.row) {
      const step = b.col > a.col ? 1 : -1
      for (let c = a.col; c !== b.col; c += step) tiles.push({ col: c, row: a.row })
    } else {
      const step = b.row > a.row ? 1 : -1
      for (let r = a.row; r !== b.row; r += step) tiles.push({ col: a.col, row: r })
    }
  }
  tiles.push(wps[wps.length - 1])
  return tiles
}

// buildLayoutData: given a DUNGEON_LAYOUTS entry, compute all derived path sets.
export function buildLayoutData(layout) {
  const pathTiles  = buildCenterline(layout.waypoints)
  const centerKeys = new Set(pathTiles.map(p => `${p.col},${p.row}`))
  const rawExtra   = layout.extraTiles ?? []
  const pathExtra  = rawExtra.filter(p => !centerKeys.has(`${p.col},${p.row}`))
  const pathAll    = [...pathTiles, ...pathExtra]
  return {
    id:           layout.id,
    pathTiles,
    pathExtra,
    pathAll,
    pathSet:      new Set(pathAll.map(p => `${p.col},${p.row}`)),
    pathCenterSet: centerKeys,
    entrance:     layout.entrance,
    treasure:     layout.treasure,
  }
}

// ── Dungeon Layouts ────────────────────────────────────────────────────────
// Each layout defines:
//   waypoints  — ordered list; first = entrance = escape; treasure position is
//                a mid-path waypoint that matches `treasure` coords
//   entrance   — { col, row } entry/exit tile
//   treasure   — { col, row } gold chest position (must lie on the path)
//   extraTiles — optional decorative path-adjacent tiles (non-walkable)
export const DUNGEON_LAYOUTS = [
  {
    id:          'catacombs',
    name:        'The Catacombs',
    emoji:       '🏰',
    description: 'A winding S-curve through the dungeon\'s oldest passages. The classic gauntlet.',
    flavorText:  '"Gerald personally designed the original plumbing. He regrets it every day."',
    waypoints: [
      { col: 0,  row: 6  },
      { col: 3,  row: 6  },
      { col: 3,  row: 2  },
      { col: 17, row: 2  },
      { col: 17, row: 6  },
      { col: 19, row: 6  },   // ★ TREASURE
      { col: 19, row: 10 },
      { col: 0,  row: 10 },
      { col: 0,  row: 6  },   // escape
    ],
    entrance: { col: 0, row: 6 },
    treasure: { col: 19, row: 6 },
    extraTiles: [
      // widen top corridor
      ...Array.from({ length: 13 }, (_, i) => ({ col: i + 4, row: 1 })),
      // widen bottom corridor
      ...Array.from({ length: 18 }, (_, i) => ({ col: i + 1, row: 11 })),
      // right corridor flanks
      { col: 18, row: 7 }, { col: 18, row: 8 }, { col: 18, row: 9 },
      // entrance flanks
      { col: 1, row: 5 }, { col: 1, row: 7 }, { col: 0, row: 5 }, { col: 0, row: 7 },
      // corner plazas
      { col: 4, row: 2 }, { col: 3, row: 3 }, { col: 16, row: 2 }, { col: 17, row: 3 },
      { col: 18, row: 10 }, { col: 19, row: 9 }, { col: 1, row: 10 }, { col: 0, row: 9 },
    ],
  },

  {
    id:          'gauntlet',
    name:        'The Gauntlet',
    emoji:       '⚔️',
    description: 'Two parallel corridors — the top for the approach, the bottom for the escape. Towers near the center hit heroes twice.',
    flavorText:  '"The architects called it efficiency. Heroes call it a nightmare." — Gerald',
    waypoints: [
      { col: 0,  row: 2  },   // entrance at top-left
      { col: 19, row: 2  },   // across the top
      { col: 19, row: 6  },   // ★ TREASURE at right edge
      { col: 19, row: 10 },
      { col: 0,  row: 10 },   // across the bottom
      { col: 0,  row: 2  },   // escape (same as entrance)
    ],
    entrance: { col: 0, row: 2 },
    treasure: { col: 19, row: 6 },
    extraTiles: [
      ...Array.from({ length: 20 }, (_, i) => ({ col: i, row: 1 })),
      ...Array.from({ length: 20 }, (_, i) => ({ col: i, row: 11 })),
      { col: 0, row: 3 }, { col: 0, row: 9 },
      { col: 19, row: 7 }, { col: 19, row: 8 }, { col: 19, row: 9 },
    ],
  },

  {
    id:          'labyrinth',
    name:        'The Labyrinth',
    emoji:       '🌀',
    description: 'Six sweeping zigzags across the full grid. A very long path — perfect for DoT, slow, and fire builds.',
    flavorText:  '"We lost three torch-lighters mapping this one." — Gerald\'s safety report',
    waypoints: [
      { col: 0,  row: 6  },
      { col: 0,  row: 1  },
      { col: 7,  row: 1  },
      { col: 7,  row: 5  },
      { col: 14, row: 5  },
      { col: 14, row: 1  },
      { col: 19, row: 1  },
      { col: 19, row: 6  },   // ★ TREASURE
      { col: 19, row: 11 },
      { col: 14, row: 11 },
      { col: 14, row: 7  },
      { col: 7,  row: 7  },
      { col: 7,  row: 11 },
      { col: 0,  row: 11 },
      { col: 0,  row: 6  },   // escape
    ],
    entrance: { col: 0, row: 6 },
    treasure: { col: 19, row: 6 },
    extraTiles: [
      // widen the horizontal runs
      ...Array.from({ length: 7  }, (_, i) => ({ col: i,      row: 0  })),
      ...Array.from({ length: 7  }, (_, i) => ({ col: i + 14, row: 0  })),
      ...Array.from({ length: 7  }, (_, i) => ({ col: i,      row: 12 })),
      ...Array.from({ length: 7  }, (_, i) => ({ col: i + 14, row: 12 })),
      ...Array.from({ length: 7  }, (_, i) => ({ col: i + 7,  row: 4  })),
      ...Array.from({ length: 7  }, (_, i) => ({ col: i + 7,  row: 8  })),
    ],
  },

  {
    id:          'throneroom',
    name:        'The Throne Room',
    emoji:       '👑',
    description: 'Heroes spiral the outer walls before plunging to the treasure at the center. The return cuts straight through the middle.',
    flavorText:  '"The throne is purely decorative. The treasure room is not." — Gerald',
    waypoints: [
      { col: 0,  row: 1  },   // entrance top-left
      { col: 19, row: 1  },   // across the top
      { col: 19, row: 11 },   // down the right
      { col: 0,  row: 11 },   // across the bottom
      { col: 0,  row: 7  },
      { col: 4,  row: 7  },
      { col: 4,  row: 6  },   // approach treasure horizontally — avoids row-5 re-entry
      { col: 10, row: 6  },   // ★ TREASURE at center
      { col: 10, row: 2  },
      { col: 0,  row: 2  },
      { col: 0,  row: 1  },   // escape
    ],
    entrance: { col: 0, row: 1 },
    treasure: { col: 10, row: 6 },
    extraTiles: [
      ...Array.from({ length: 20 }, (_, i) => ({ col: i, row: 0  })),
      ...Array.from({ length: 20 }, (_, i) => ({ col: i, row: 12 })),
      { col: 0, row: 3 }, { col: 0, row: 4 }, { col: 0, row: 5 }, { col: 0, row: 6 },
    ],
  },

  {
    id:          'bottleneck',
    name:        'The Bottleneck',
    emoji:       '🔩',
    description: 'Both legs of the journey converge on column 9 — defenses placed there attack heroes twice. Massive strategic weight on the chokepoint.',
    flavorText:  '"Whoever built this was either a genius or deeply unwell." — Gerald',
    waypoints: [
      { col: 0,  row: 6  },
      { col: 0,  row: 1  },
      { col: 9,  row: 1  },
      { col: 9,  row: 5  },
      { col: 19, row: 5  },
      { col: 19, row: 6  },   // ★ TREASURE
      { col: 19, row: 7  },
      { col: 9,  row: 7  },
      { col: 9,  row: 11 },
      { col: 0,  row: 11 },
      { col: 0,  row: 6  },   // escape
    ],
    entrance: { col: 0, row: 6 },
    treasure: { col: 19, row: 6 },
    extraTiles: [
      ...Array.from({ length: 9  }, (_, i) => ({ col: i, row: 0  })),
      ...Array.from({ length: 10 }, (_, i) => ({ col: i + 9, row: 4 })),
      ...Array.from({ length: 10 }, (_, i) => ({ col: i + 9, row: 8 })),
      ...Array.from({ length: 9  }, (_, i) => ({ col: i, row: 12 })),
      { col: 0, row: 5 }, { col: 0, row: 7 },
      { col: 8, row: 1 }, { col: 8, row: 11 },
    ],
  },
]

// ── Campaign Modifiers ─────────────────────────────────────────────────────
// id: used in gameStore and simulation as a key
// label / desc: shown on campaign map
export const CAMPAIGN_MODIFIERS = {
  none: {
    id: 'none', label: 'No Modifier', emoji: '—',
    desc: 'Standard rules.',
  },
  lava_strong: {
    id: 'lava_strong', label: 'Cursed Ground', emoji: '🌋',
    desc: 'Lava deals 3× damage.',
  },
  thieves_disarm_all: {
    id: 'thieves_disarm_all', label: 'Trained Thieves', emoji: '🗝️',
    desc: 'Thieves can disarm any on-path trap, not just spikes.',
  },
  group_spawn: {
    id: 'group_spawn', label: 'Coordinated Assault', emoji: '⚔️',
    desc: 'Heroes spawn in tight groups — no stagger delay between them.',
  },
  boulder_regen: {
    id: 'boulder_regen', label: 'Relentless Boulders', emoji: '🪨',
    desc: 'Boulder traps respawn at the start of each wave.',
  },
  fire_double: {
    id: 'fire_double', label: 'Volatile Atmosphere', emoji: '🔥',
    desc: 'All fire-based towers and lava deal 2× damage.',
  },
  hero_speed: {
    id: 'hero_speed', label: 'Caffeine Rush', emoji: '⚡',
    desc: 'All heroes move 25% faster throughout the run.',
  },
}

// ── Campaign Nodes ─────────────────────────────────────────────────────────
// The campaign tree. Each node is a dungeon run with a fixed layout + modifier.
// `requires` lists node IDs that must be completed (any star) to unlock this node.
// `starConditions` — array of 3 check fns (1-star, 2-star, 3-star) evaluated
//   against end-of-run state: { treasureHp, treasureMaxHp, waveIndex, runKills }
export const CAMPAIGN_NODES = [
  {
    id:       'node_catacombs',
    layoutId: 'catacombs',
    modifier: 'none',
    name:     'The Catacombs',
    subtitle: 'Where every dungeon career begins.',
    requires: [],
    starConditions: [
      s => s.waveIndex >= 15,                                          // 1 ★ — survived all waves
      s => s.treasureHp / s.treasureMaxHp >= 0.5,                     // 2 ★ — treasure > 50% HP
      s => s.treasureHp / s.treasureMaxHp >= 0.85 && s.runKills >= 80, // 3 ★ — nearly perfect
    ],
  },
  {
    id:       'node_gauntlet',
    layoutId: 'gauntlet',
    modifier: 'none',
    name:     'The Gauntlet',
    subtitle: 'Cover two corridors or die trying.',
    requires: ['node_catacombs'],
    starConditions: [
      s => s.waveIndex >= 15,
      s => s.treasureHp / s.treasureMaxHp >= 0.4,
      s => s.treasureHp / s.treasureMaxHp >= 0.75,
    ],
  },
  {
    id:       'node_labyrinth',
    layoutId: 'labyrinth',
    modifier: 'none',
    name:     'The Labyrinth',
    subtitle: 'A long path favours poison and slow.',
    requires: ['node_catacombs'],
    starConditions: [
      s => s.waveIndex >= 15,
      s => s.treasureHp / s.treasureMaxHp >= 0.4,
      s => s.treasureHp / s.treasureMaxHp >= 0.75,
    ],
  },
  {
    id:       'node_throneroom',
    layoutId: 'throneroom',
    modifier: 'lava_strong',
    name:     'The Throne Room',
    subtitle: 'Cursed ground — lava is lethal.',
    requires: ['node_gauntlet'],
    starConditions: [
      s => s.waveIndex >= 15,
      s => s.treasureHp / s.treasureMaxHp >= 0.35,
      s => s.treasureHp / s.treasureMaxHp >= 0.65,
    ],
  },
  {
    id:       'node_bottleneck',
    layoutId: 'bottleneck',
    modifier: 'group_spawn',
    name:     'The Bottleneck',
    subtitle: 'Heroes rush in formation. Own the chokepoint.',
    requires: ['node_labyrinth'],
    starConditions: [
      s => s.waveIndex >= 15,
      s => s.treasureHp / s.treasureMaxHp >= 0.35,
      s => s.treasureHp / s.treasureMaxHp >= 0.65,
    ],
  },
  {
    id:       'node_finale',
    layoutId: 'catacombs',
    modifier: 'hero_speed',
    name:     'The Grand Finale',
    subtitle: 'Fast heroes. Full roster. No mercy.',
    requires: ['node_throneroom', 'node_bottleneck'],
    starConditions: [
      s => s.waveIndex >= 15,
      s => s.treasureHp / s.treasureMaxHp >= 0.3,
      s => s.treasureHp / s.treasureMaxHp >= 0.6 && s.runKills >= 100,
    ],
  },
]

// ── Legacy path exports (Catacombs layout) — kept for backwards compat ─────
// All runtime code should prefer layoutData from the game store.
const _catacombsLayout = DUNGEON_LAYOUTS[0]
const _catacombsData   = buildLayoutData(_catacombsLayout)

export const PATH_TILES      = _catacombsData.pathTiles
export const PATH_EXTRA      = _catacombsData.pathExtra
export const PATH_ALL        = _catacombsData.pathAll
export const PATH_SET        = _catacombsData.pathSet
export const PATH_CENTER_SET = _catacombsData.pathCenterSet
export const ENTRANCE        = _catacombsLayout.entrance
export const TREASURE        = _catacombsLayout.treasure

// ── Tool Definitions ───────────────────────────────────────────────────────
// placesOn: 'path'  → placed on walkable centerline only
//           'open'  → placed on empty (non-path) tiles only
// range, attackSpeed → off-path towers only
// slow, dotDamage    → on-path structures
// slowOnHit          → off-path tower applies slow on each attack
// poisonOnHit        → off-path tower applies poison DoT on each attack

export const DUNGEON_TOOLS = [
  // ── On-path traps ──────────────────────────────────────────────────────
  {
    id: TILE.SPIKE, category: TOOL_CATEGORY.TRAPS,
    label: 'Spike Plate', emoji: '🔩', cost: 30, damage: 25,
    placesOn: 'path',
    description: 'On-path. Triggers on step. Thieves disarm it instead of taking damage.',
    color: '#8a8a9a', unlocked: true, tier: 1,
  },
  {
    id: TILE.BOULDER, category: TOOL_CATEGORY.TRAPS,
    label: 'Rolling Boulder', emoji: '🪨', cost: 20, damage: 60,
    placesOn: 'path',
    description: 'On-path. One-use — destroys itself after crushing the first hero.',
    color: '#6a6a5a', unlocked: true, tier: 1,
  },
  {
    id: TILE.DOOR, category: TOOL_CATEGORY.STRUCTURES,
    label: 'Iron Door', emoji: '🚪', cost: 35, damage: 0, slow: 0.4,
    placesOn: 'path',
    description: 'On-path. Slows heroes to 40% speed. Excellent before a trap cluster.',
    color: '#5a4a3a', unlocked: true, tier: 1,
  },
  {
    id: TILE.LAVA, category: TOOL_CATEGORY.TRAPS,
    label: 'Lava Floor', emoji: '🌋', cost: 65, damage: 0, dotDamage: 15,
    placesOn: 'path',
    description: 'On-path. Deals 15 HP/s while any hero stands on it. Hits inbound AND outbound.',
    color: '#c4430a', unlocked: false, tier: 2,
  },
  {
    id: TILE.PIT, category: TOOL_CATEGORY.TRAPS,
    label: 'Pit Trap', emoji: '🕳️', cost: 45, damage: 50,
    placesOn: 'path',
    description: 'On-path. 50 damage + 3 s slow. Resets after 8 s — not one-use. Warlords disarm it.',
    color: '#1a1008', unlocked: false, tier: 2,
  },
  {
    id: TILE.PENDULUM, category: TOOL_CATEGORY.TRAPS,
    label: 'Pendulum', emoji: '⚙️', cost: 55, damage: 40,
    placesOn: 'path',
    description: 'On-path. 40 damage only during the swing phase (2 s on / 2 s off). Staggered timing per tile.',
    color: '#222233', unlocked: false, tier: 2,
  },
  {
    id: TILE.TAR, category: TOOL_CATEGORY.TRAPS,
    label: 'Tar Pit', emoji: '🟤', cost: 50, damage: 0,
    placesOn: 'path',
    description: 'On-path. Slows to 25% speed. Berserkers are immune to slows — but tar burns them for 15 HP/s instead.',
    color: '#180e04', unlocked: false, tier: 2,
  },
  {
    id: TILE.ELECTRIC, category: TOOL_CATEGORY.TRAPS,
    label: 'Electric Floor', emoji: '⚡', cost: 80, damage: 25,
    placesOn: 'path',
    description: 'On-path. 25 damage on step + chains 15 damage to nearest hero within 2 tiles. Punishes grouped parties.',
    color: '#0a0a22', unlocked: false, tier: 2,
  },
  {
    id: TILE.STASIS, category: TOOL_CATEGORY.TRAPS,
    label: 'Stasis Field', emoji: '🔷', cost: 90, damage: 0,
    placesOn: 'path',
    description: 'On-path. Freezes hero for 2 s — immune to all damage while frozen, but every tower in range reloads freely.',
    color: '#060e18', unlocked: false, tier: 3,
  },

  // ── Off-path towers ─────────────────────────────────────────────────────
  {
    id: TILE.DART, category: TOOL_CATEGORY.TRAPS,
    label: 'Dart Tower', emoji: '🎯', cost: 45, damage: 20,
    range: 3, attackSpeed: 1000,
    placesOn: 'open',
    description: 'Beside path. Fires every second at the closest hero within 3 tiles.',
    color: '#9a6a3a', unlocked: true, tier: 1,
  },
  {
    id: TILE.FIRE, category: TOOL_CATEGORY.TRAPS,
    label: 'Fire Vent', emoji: '🔥', cost: 70, damage: 40,
    range: 2, attackSpeed: 2000,
    placesOn: 'open',
    description: 'Beside path. Heavy burst within 2 tiles. Mages only take half damage.',
    color: '#c4430a', unlocked: false, tier: 2,
  },
  {
    id: TILE.POISON, category: TOOL_CATEGORY.TRAPS,
    label: 'Poison Mist', emoji: '☠️', cost: 55, damage: 8,
    range: 2, attackSpeed: 1800, poisonOnHit: true,
    placesOn: 'open',
    description: 'Beside path. Poisons heroes within 2 tiles — 3 HP/s DoT until death.',
    color: '#3d7a1a', unlocked: false, tier: 2,
  },
  {
    id: TILE.ICE, category: TOOL_CATEGORY.TRAPS,
    label: 'Ice Shard', emoji: '🧊', cost: 60, damage: 10,
    range: 2.5, attackSpeed: 2200, slowOnHit: true,
    placesOn: 'open',
    description: 'Beside path. Slows hit hero to 50% speed for 2 seconds. Synergises with other towers.',
    color: '#2a5f8b', unlocked: false, tier: 2,
  },

  // ── Off-path monsters ───────────────────────────────────────────────────
  {
    id: TILE.SKELETON, category: TOOL_CATEGORY.MONSTERS,
    label: 'Skeleton Guard', emoji: '💀', cost: 50, damage: 18,
    range: 2, attackSpeed: 900,
    placesOn: 'open',
    description: 'Beside path. Reliable guard with decent range. Files overtime claims.',
    color: '#c8b89a', unlocked: true, tier: 1,
  },
  {
    id: TILE.SLIME, category: TOOL_CATEGORY.MONSTERS,
    label: 'Slime', emoji: '🟢', cost: 25, damage: 8,
    range: 1.5, attackSpeed: 700,
    placesOn: 'open',
    description: 'Beside path. Very short range but rapid attacks. Cheap spam.',
    color: '#3d7a1a', unlocked: true, tier: 1,
  },
  {
    id: TILE.WRAITH, category: TOOL_CATEGORY.MONSTERS,
    label: 'Wraith', emoji: '👻', cost: 90, damage: 30,
    range: 3.5, attackSpeed: 2000,
    placesOn: 'open',
    description: 'Beside path. Long range, ignores armor. Despises paladins in particular.',
    color: '#6a4a8a', unlocked: false, tier: 2,
  },
  {
    id: TILE.TROLL, category: TOOL_CATEGORY.MONSTERS,
    label: 'Cave Troll', emoji: '🧌', cost: 130, damage: 35,
    range: 2, attackSpeed: 2600, aoeAttack: true,
    placesOn: 'open',
    description: 'Beside path. Slow swing, but hits EVERY hero in range at once. Devastating against grouped parties.',
    color: '#4a6a30', unlocked: true, tier: 1,
  },
  {
    id: TILE.BAT, category: TOOL_CATEGORY.MONSTERS,
    label: 'Vampire Bat', emoji: '🦇', cost: 55, damage: 12,
    range: 2, attackSpeed: 550, drainOnHit: true,
    placesOn: 'open',
    description: 'Beside path. Rapid bites that permanently drain max HP — sustained healing becomes less effective over time.',
    color: '#3a1a4a', unlocked: false, tier: 2,
  },
  {
    id: TILE.SHADOW, category: TOOL_CATEGORY.MONSTERS,
    label: 'Shadow Stalker', emoji: '🌑', cost: 80, damage: 22,
    range: 3, attackSpeed: 1400, targetGoldCarriers: true,
    placesOn: 'open',
    description: 'Beside path. Hunts gold-carrying heroes with priority and deals double damage to them on the return trip.',
    color: '#2a1a3a', unlocked: false, tier: 2,
  },
  {
    id: TILE.IDOL, category: TOOL_CATEGORY.MONSTERS,
    label: 'Cursed Idol', emoji: '👁️', cost: 70, damage: 8,
    range: 2.5, attackSpeed: 1500, curseOnHit: true,
    placesOn: 'open',
    description: 'Beside path. Each hit stacks a Curse (+15% damage taken, max 3 stacks). Makes every other trap far deadlier.',
    color: '#5a2a6a', unlocked: false, tier: 2,
  },
  {
    id: TILE.GARGOYLE, category: TOOL_CATEGORY.MONSTERS,
    label: 'Gargoyle', emoji: '🗿', cost: 90, damage: 38,
    range: 4, attackSpeed: 2200, targetFarthest: true,
    placesOn: 'open',
    description: 'Beside path. Long range. Always targets the most advanced hero — stops gold carriers dead in their tracks.',
    color: '#5a5a6a', unlocked: false, tier: 2,
  },

  // ── New off-path towers (7.2) ───────────────────────────────────────────
  {
    id: TILE.CATAPULT, category: TOOL_CATEGORY.TRAPS,
    label: 'Catapult', emoji: '🏹', cost: 100, damage: 50,
    range: 5, attackSpeed: 3500, randomTarget: true,
    placesOn: 'open',
    description: 'Beside path. Heavy long-range shot every 3.5 s — hits a RANDOM hero in range, not the closest. Unpredictable.',
    color: '#4a3a20', unlocked: false, tier: 2,
  },
  {
    id: TILE.SPIDER, category: TOOL_CATEGORY.MONSTERS,
    label: 'Spider Nest', emoji: '🕷️', cost: 60, damage: 5,
    range: 2, attackSpeed: 400, slowOnHit: true, poisonOnHit: true,
    placesOn: 'open',
    description: 'Beside path. Rapid venom bites — each hit applies BOTH slow AND poison simultaneously. Pairs devastatingly with Cursed Idol.',
    color: '#1a0e08', unlocked: false, tier: 2,
  },
  {
    id: TILE.MIMIC, category: TOOL_CATEGORY.STRUCTURES,
    label: 'Mimic Chest', emoji: '📦', cost: 85, damage: 0, range: 2,
    placesOn: 'open', distractOnHit: true,
    description: 'Beside path. No attack — but any hero within 2 tiles stops for 1.5 s to "investigate". During the pause every nearby tower fires at double speed. Each hero is fooled only once.',
    color: '#3a2810', unlocked: false, tier: 2,
  },
]

// ── Hero Definitions ───────────────────────────────────────────────────────
// goldSpeedMult: speed multiplier applied AFTER picking up the gold
//   Thief is a trained getaway artist — gets faster.
//   Mage is not built for running with heavy treasure — slows down.
//   Paladin is already slow; gold makes it worse.

export const HERO_TYPES = {
  knight: {
    id: 'knight', label: 'Knight', emoji: '⚔️',
    hp: 300, speed: 1.2, color: '#c8a048',
    description: 'Durable tank. Same speed with or without gold. Weak to magic.',
    canDisarm: false, heals: false,
    goldSpeedMult: 1.0,
  },
  mage: {
    id: 'mage', label: 'Mage', emoji: '🧙',
    hp: 160, speed: 1.0, color: '#7a5abf',
    description: 'Self-heals at 4 HP/s and softly heals nearby allies at 1 HP/s. Takes 50% fire damage.',
    canDisarm: false, heals: false, fireResist: 0.5,
    selfHealRate: 4, partyHealRate: 1,
    goldSpeedMult: 0.72,
  },
  thief: {
    id: 'thief', label: 'Thief', emoji: '🗡️',
    hp: 130, speed: 2.0, color: '#4a7a3a',
    description: 'Fastest hero. Disarms spikes. Gets FASTER on the way out — trained for this.',
    canDisarm: true, heals: false,
    goldSpeedMult: 1.35,
  },
  paladin: {
    id: 'paladin', label: 'Paladin', emoji: '🛡️',
    hp: 260, speed: 0.9, color: '#c8c848',
    description: 'Heals adjacent allies 6 HP/s. Gold is heavy with full plate armour.',
    canDisarm: false, heals: true, healAmount: 6,
    goldSpeedMult: 0.82,
  },

  // ── Tier 3 heroes (waves 8+) ───────────────────────────────────────────────
  berserker: {
    id: 'berserker', label: 'Berserker', emoji: '🪓',
    hp: 450, speed: 1.8, color: '#c43a1a',
    description: 'Massive HP, fast, and immune to slows. Pure rage — nothing holds a Berserker back.',
    canDisarm: false, heals: false, immuneToSlow: true,
    goldSpeedMult: 1.1,
  },
  ranger: {
    id: 'ranger', label: 'Ranger', emoji: '🏹',
    hp: 120, speed: 2.2, color: '#5a9a4a',
    description: 'Nearly as fast as a Thief. Immune to poison. Fire-resistant. Hard to pin down.',
    canDisarm: false, heals: false, immuneToPoison: true, fireResist: 0.4,
    goldSpeedMult: 1.2,
  },
  cleric: {
    id: 'cleric', label: 'Cleric', emoji: '✝️',
    hp: 200, speed: 0.9, color: '#dce8f0',
    description: 'Heals nearby allies at 12 HP/s and passively self-heals at 3 HP/s. The strongest dedicated healer.',
    canDisarm: false, heals: true, healAmount: 12, selfHealRate: 3,
    goldSpeedMult: 0.85,
  },
  archmage: {
    id: 'archmage', label: 'Archmage', emoji: '🔮',
    hp: 220, speed: 1.1, color: '#bf3abf',
    // fireResist 0.30: takes 30% of fire damage. selfHealRate 4: fire vent (40*0.30=12 dmg) barely wins
    // over 2-second heal (4*2=8), so fire vents CAN slowly kill it — but it takes a cluster.
    description: 'Self-heals at 4 HP/s and softly heals nearby allies at 2 HP/s. Highly fire-resistant. Immune to slows.',
    canDisarm: false, heals: false, fireResist: 0.30, immuneToSlow: true,
    selfHealRate: 4, partyHealRate: 2,
    goldSpeedMult: 0.6,
  },
  champion: {
    id: 'champion', label: 'Champion', emoji: '⚜️',
    // 600 HP + 45% DR = 1090 effective HP (down from 1400). Still the toughest unit but beatable.
    hp: 600, speed: 0.85, color: '#c8a020',
    description: 'Legendary warrior. Enormous HP and takes only 45% damage from all sources. The dungeon\'s greatest threat.',
    canDisarm: false, heals: false, damageReduction: 0.45,
    goldSpeedMult: 0.95,
  },

  // ── Tier 4 heroes (waves 9+) ───────────────────────────────────────────────
  warlord: {
    id: 'warlord', label: 'Warlord', emoji: '🪖',
    hp: 480, speed: 1.0, color: '#8b1a1a',
    description: 'Destroys ALL on-path traps — spikes, boulders, lava. Your entire on-path investment becomes irrelevant.',
    canDisarm: true, heals: false, boulderResist: true,
    // canDisarm handles spikes; boulderResist handles boulders; lava still applies
    goldSpeedMult: 0.9,
  },
  regenerator: {
    id: 'regenerator', label: 'Regenerator', emoji: '🌿',
    hp: 320, speed: 1.05, color: '#20a060',
    description: 'Self-heals at 20 HP/s. Burst damage barely registers. Requires sustained overlapping fire to kill.',
    canDisarm: false, heals: false,
    selfHealRate: 20,
    goldSpeedMult: 1.0,
  },

  // ── Tier 6 heroes (waves 12–15) ───────────────────────────────────────────
  engineer: {
    id: 'engineer', label: 'Engineer', emoji: '🔧',
    hp: 350, speed: 0.95, color: '#b87820',
    description: 'Disables a random off-path tower for 10 s with every step. Carves a dead zone through heavily-towered dungeons.',
    canDisarm: false, heals: false,
    disablesTowers: true,
    goldSpeedMult: 0.9,
  },
  phantom: {
    id: 'phantom', label: 'Phantom', emoji: '👁️',
    hp: 180, speed: 1.8, color: '#7a9abf',
    description: 'Immune to poison, slow, and fire. Only takes damage from physical attacks (spikes, boulders, darts, skeletons, slimes). Magic is useless.',
    canDisarm: false, heals: false,
    immuneToSlow: true, immuneToPoison: true, fireResist: 0,
    physicalOnly: true,
    goldSpeedMult: 1.1,
  },
  medic: {
    id: 'medic', label: 'Medic', emoji: '➕',
    hp: 150, speed: 1.0, color: '#e8e8f8',
    description: 'Resurrects fallen heroes within 3 tiles — revives each ally once at 40% HP after a 3 s delay. Kill the Medic first.',
    canDisarm: false, heals: false,
    canRevive: true,
    goldSpeedMult: 0.95,
  },
  crusader: {
    id: 'crusader', label: 'Crusader', emoji: '✝️',
    hp: 400, speed: 1.1, color: '#d4c060',
    description: 'Blessed by a deity — takes only 50% damage from all creature towers (skeletons, slimes, wraiths, bats, trolls). Forces reliance on traps and magic.',
    canDisarm: false, heals: false,
    monsterResist: 0.5,
    goldSpeedMult: 0.85,
  },
}

// ── Wave Compositions ──────────────────────────────────────────────────────
// hpMult: multiplied against each hero's base HP (and healing, proportionally).
// This counteracts the player's compounding defensive investment — by wave 14
// the dungeon has ~50× more DPS than wave 1, so heroes need proportionally
// more HP or they melt before reaching the treasure.
//
// Rough target: at each wave, a hero should survive ~2-3 tower clusters even
// with a well-built dungeon, keeping every round tense.
export const WAVE_CONFIGS = [
  // ── Tier 1: Tutorial (waves 1–3) ─────────────────────────────────────────
  // Baseline HP. Player is still learning tools and path coverage.
  { wave: 1,  hpMult: 1.0, gold: 120, label: 'The First Scouting Party',
    heroes: ['knight','knight','knight'] },
  { wave: 2,  hpMult: 1.0, gold: 140, label: 'They Brought a Lockpick',
    heroes: ['knight','knight','thief'] },
  { wave: 3,  hpMult: 1.2, gold: 160, label: 'Mixed Tactics',
    heroes: ['knight','knight','mage','thief'] },

  // ── Tier 2: Full Classic Roster (waves 4–7) ──────────────────────────────
  // HP starts scaling to match the dungeon growing from 250g → ~1500g invested.
  { wave: 4,  hpMult: 1.5, gold: 190, label: 'A Full Party',
    heroes: ['knight','knight','mage','thief','paladin'] },
  { wave: 5,  hpMult: 1.9, gold: 220, label: 'They Brought a Healer',
    heroes: ['knight','knight','mage','mage','thief','paladin'] },
  { wave: 6,  hpMult: 2.4, gold: 260, label: 'The Siege Begins',
    heroes: ['knight','knight','knight','mage','thief','paladin','thief'] },
  { wave: 7,  hpMult: 3.0, gold: 300, label: 'They Are Not Giving Up',
    heroes: ['knight','knight','knight','mage','mage','thief','paladin'] },

  // ── Tier 3: New Threats (waves 8–10) ─────────────────────────────────────
  // Berserker / ranger debut. HP scaled to ~3–4.5× — dungeon ~3000–5000g.
  { wave: 8,  hpMult: 3.5, gold: 320, label: 'The Rage Begins',
    heroes: ['berserker','knight','knight','mage','paladin','ranger','thief'] },
  { wave: 9,  hpMult: 4.0, gold: 360, label: 'Swift as Shadows',
    heroes: ['ranger','ranger','berserker','berserker','knight','mage','thief','paladin'] },
  { wave: 10, hpMult: 4.8, gold: 400, label: 'The Brute Squad',
    heroes: ['berserker','berserker','berserker','ranger','ranger','knight','mage','paladin','cleric'] },

  // ── Tier 4: Elite Compositions (waves 11–12) ─────────────────────────────
  // Warlord and Regenerator debut. Players with lava/boulder-heavy dungeons
  // now face a hero that neutralises their on-path investments.
  { wave: 11, hpMult: 5.5, gold: 440, label: 'The Warlord Leads the Charge',
    heroes: ['warlord','berserker','berserker','ranger','ranger','knight','mage','paladin','cleric','regenerator'] },
  // Engineer debuts — tower-heavy dungeons suddenly have gaps carved through them.
  { wave: 12, hpMult: 6.5, gold: 480, label: 'They Sent a Saboteur',
    heroes: ['engineer','warlord','warlord','berserker','berserker','ranger','ranger','mage','paladin','cleric','regenerator','thief'] },

  // ── Tier 5: Near-Impossible (waves 13–15) ────────────────────────────────
  // Archmage + arcane host. Full roster pressure — dungeon ~8500–11000g invested.
  // Phantom forces players who built magic-heavy to reckon with physical damage.
  { wave: 13, hpMult: 7.5, gold: 500, label: 'The Untouchable',
    heroes: ['phantom','archmage','warlord','warlord','berserker','berserker','ranger','ranger','knight','paladin','cleric','regenerator','thief'] },
  // Medic turns every kill into a question mark — kill it first or watch heroes revive.
  { wave: 14, hpMult: 9.0, gold: 550, label: "The Champion's Crusade",
    heroes: ['medic','champion','archmage','archmage','warlord','warlord','berserker','berserker','ranger','ranger','cleric','paladin','regenerator'] },
  // Crusader: blessed against creatures — traps and magic are the only answer.
  { wave: 15, hpMult: 11.0, gold: 600, label: 'The Holy Siege',
    heroes: ['crusader','crusader','medic','champion','archmage','archmage','warlord','warlord','engineer','berserker','ranger','ranger','cleric','paladin','regenerator'] },
]

// ── Upgrade Tiers (Section 8) ─────────────────────────────────────────────
// Each entry maps a tile ID to an array of [tier2, tier3] upgrade definitions.
// Each tier has: label, cost (bank gold), stats (overrides merged onto base tool).
// Special flags (piercing, aura, etc.) are also in stats and read by simulation.js.
export const UPGRADE_TIERS = {
  // ── On-path traps ────────────────────────────────────────────────────────
  [TILE.SPIKE]: [
    { label: 'Blade Gauntlet', cost: 50,
      stats: { damage: 45, spikeRegen: 4000 },   // regen after 4 s; still disarmable
      desc: '45 dmg. Resets after 4 s — no longer one-use.' },
    { label: 'Death Corridor', cost: 100,
      stats: { damage: 60, spikeRegen: 4000, doubleSpike: true, noDisarm: true },
      desc: '60 dmg, triggers twice per step. Cannot be disarmed.' },
  ],
  [TILE.BOULDER]: [
    { label: 'Heavy Boulder', cost: 40,
      stats: { damage: 90 },
      desc: '90 dmg. Still one-shot, but much heavier.' },
    { label: 'Iron Crusher', cost: 80,
      stats: { damage: 120, boulderRespawn: 12000 },  // respawns after 12 s
      desc: '120 dmg. Respawns after 12 s.' },
  ],
  [TILE.LAVA]: [
    { label: 'Magma Channel', cost: 60,
      stats: { dotDamage: 25 },
      desc: '25 HP/s. Mages still take only half.' },
    { label: 'Inferno Pit', cost: 120,
      stats: { dotDamage: 40, lavaSlows: true },
      desc: '40 HP/s. Also slows heroes caught in it.' },
  ],
  [TILE.PIT]: [
    { label: 'Deep Pit', cost: 60,
      stats: { damage: 75, pitCooldown: 6000 },
      desc: '75 dmg + 3 s slow. Resets in 6 s.' },
    { label: 'Spike Pit', cost: 120,
      stats: { damage: 100, pitCooldown: 6000, pitSlowMs: 5000 },
      desc: '100 dmg + 5 s slow. Resets in 6 s.' },
  ],
  [TILE.PENDULUM]: [
    { label: 'Heavy Pendulum', cost: 50,
      stats: { damage: 60 },
      desc: '60 dmg during the swing phase.' },
    { label: 'Guillotine', cost: 100,
      stats: { damage: 90 },
      desc: '90 dmg. Lethal precision.' },
  ],
  [TILE.TAR]: [
    { label: 'Thick Tar', cost: 40,
      stats: { tarSpeedMult: 0.15 },   // 0.15× instead of 0.25×
      desc: 'Heroes crawl at 15% speed. Brutal choke.' },
    { label: 'Quicksand', cost: 80,
      stats: { tarSpeedMult: 0.1, tarDot: 8 },  // also deals 8 HP/s DoT
      desc: '10% speed + 8 HP/s DoT. Nearly impassable.' },
  ],
  [TILE.ELECTRIC]: [
    { label: 'High Voltage', cost: 70,
      stats: { damage: 40, electricChain: 25 },
      desc: '40 dmg + 25 chain to nearest hero.' },
    { label: 'Tesla Coil', cost: 140,
      stats: { damage: 60, electricChain: 35, electricDoubleChain: true },
      desc: '60 dmg + 35 chain to TWO nearest heroes.' },
  ],
  [TILE.STASIS]: [
    { label: 'Extended Stasis', cost: 70,
      stats: { stasisDuration: 3500 },
      desc: 'Freezes for 3.5 s.' },
    { label: 'Deep Freeze', cost: 140,
      stats: { stasisDuration: 5000, stasisAoe: true },
      desc: 'Freezes for 5 s. Affects all heroes on the tile.' },
  ],
  [TILE.DOOR]: [
    { label: 'Reinforced Gate', cost: 50,
      stats: { slow: 0.25 },
      desc: 'Slows heroes to 25% speed.' },
    { label: 'Barred Gate', cost: 100,
      stats: { slow: 0.15, doorAppliesSlow: true },
      desc: '15% speed + applies the Slowed status for 2 s.' },
  ],

  // ── Off-path towers ───────────────────────────────────────────────────────
  [TILE.DART]: [
    { label: 'Crossbow', cost: 75,
      stats: { damage: 30, attackSpeed: 850, range: 3.5 },
      desc: '30 dmg, faster fire rate, slightly longer range.' },
    { label: 'Ballista', cost: 150,
      stats: { damage: 50, attackSpeed: 1500, range: 5, piercing: true },
      desc: '50 dmg, range 5. Dart pierces through first target and hits the next.' },
  ],
  [TILE.FIRE]: [
    { label: 'Flamethrower', cost: 80,
      stats: { damage: 60, range: 2.5 },
      desc: '60 dmg, slightly longer reach.' },
    { label: "Dragon's Breath", cost: 160,
      stats: { damage: 90, range: 3, slowOnHit: true },
      desc: '90 dmg, range 3. Burns and slows.' },
  ],
  [TILE.POISON]: [
    { label: 'Toxic Cloud', cost: 70,
      stats: { damage: 12, range: 2.5, poisonRate: 6 },
      desc: '12 dmg. Poison ticks at 6 HP/s instead of 3.' },
    { label: 'Death Mist', cost: 140,
      stats: { damage: 18, range: 3, poisonRate: 10 },
      desc: '18 dmg, range 3. Poison ticks at 10 HP/s.' },
  ],
  [TILE.ICE]: [
    { label: 'Blizzard Shard', cost: 75,
      stats: { damage: 16, range: 3, slowTimer: 3000 },
      desc: '16 dmg, longer range. Slow lasts 3 s.' },
    { label: 'Frozen Tomb', cost: 150,
      stats: { damage: 22, range: 3.5, slowTimer: 5000 },
      desc: '22 dmg, range 3.5. Slow lasts 5 s.' },
  ],
  [TILE.SKELETON]: [
    { label: 'Veteran Guard', cost: 60,
      stats: { damage: 28, range: 2.5, attackSpeed: 850 },
      desc: '28 dmg, range 2.5, faster attacks.' },
    { label: 'Death Knight', cost: 130,
      stats: { damage: 40, range: 3, attackSpeed: 800, deathKnightAura: true },
      desc: '40 dmg, range 3. Aura deals 5 HP/s to all heroes within 1.5 tiles.' },
  ],
  [TILE.SLIME]: [
    { label: 'Acid Slime', cost: 50,
      stats: { damage: 14, range: 2, attackSpeed: 600 },
      desc: '14 dmg, slightly longer reach.' },
    { label: 'Plague Slime', cost: 100,
      stats: { damage: 20, range: 2.5, attackSpeed: 500, poisonOnHit: true },
      desc: '20 dmg, range 2.5. Now also poisons on hit.' },
  ],
  [TILE.WRAITH]: [
    { label: 'Elder Wraith', cost: 100,
      stats: { damage: 45, range: 4 },
      desc: '45 dmg, slightly longer range.' },
    { label: 'Banshee', cost: 200,
      stats: { damage: 65, range: 4.5, aoeAttack: true },
      desc: '65 dmg, range 4.5. Screech hits ALL heroes in range.' },
  ],
  [TILE.TROLL]: [
    { label: 'Stone Troll', cost: 120,
      stats: { damage: 50, range: 2.5 },
      desc: '50 dmg, slightly longer reach.' },
    { label: 'Mountain Troll', cost: 240,
      stats: { damage: 70, range: 3 },
      desc: '70 dmg, range 3. The biggest swing.' },
  ],
  [TILE.BAT]: [
    { label: 'Elder Bat', cost: 65,
      stats: { damage: 18, range: 2.5, attackSpeed: 480 },
      desc: '18 dmg, longer reach, faster drain.' },
    { label: 'Vampire Lord', cost: 130,
      stats: { damage: 28, range: 3, attackSpeed: 400 },
      desc: '28 dmg, range 3. Deep drain — permanently shrinks enemy max HP.' },
  ],
  [TILE.SHADOW]: [
    { label: 'Shade', cost: 90,
      stats: { damage: 32, range: 3.5 },
      desc: '32 dmg, extra range.' },
    { label: 'Nightmare', cost: 180,
      stats: { damage: 48, range: 4, curseOnHit: true },
      desc: '48 dmg, range 4. Now curses on hit — pairs with Idol.' },
  ],
  [TILE.IDOL]: [
    { label: 'Ancient Idol', cost: 80,
      stats: { damage: 12, range: 3, cursesPerHit: 2 },
      desc: '12 dmg, range 3. Applies 2 curse stacks per hit.' },
    { label: 'Unholy Relic', cost: 160,
      stats: { damage: 18, range: 3.5, cursesPerHit: 3 },
      desc: '18 dmg, range 3.5. Maxes curse stacks in a single hit.' },
  ],
  [TILE.GARGOYLE]: [
    { label: 'Stone Gargoyle', cost: 100,
      stats: { damage: 55, range: 4.5 },
      desc: '55 dmg, longer range.' },
    { label: 'Demon Gargoyle', cost: 200,
      stats: { damage: 78, range: 5 },
      desc: '78 dmg, range 5. Relentless.' },
  ],
  [TILE.CATAPULT]: [
    { label: 'Siege Engine', cost: 110,
      stats: { damage: 75, range: 5.5 },
      desc: '75 dmg, longer range.' },
    { label: 'Trebuchet', cost: 220,
      stats: { damage: 110, range: 6, aoeAttack: true },
      desc: '110 dmg, range 6. Rock now hits ALL heroes in range.' },
  ],
  [TILE.SPIDER]: [
    { label: 'Brood Nest', cost: 70,
      stats: { damage: 8, range: 2.5, attackSpeed: 350 },
      desc: '8 dmg, longer reach, faster bites.' },
    { label: "Widow's Lair", cost: 140,
      stats: { damage: 12, range: 3, attackSpeed: 280 },
      desc: '12 dmg, range 3. Relentless venom.' },
  ],
  [TILE.MIMIC]: [
    { label: 'Greater Mimic', cost: 100,
      stats: { mimicDuration: 2500 },
      desc: 'Heroes stop for 2.5 s to investigate.' },
    { label: 'Ancient Mimic', cost: 200,
      stats: { mimicDuration: 4000, mimicAppliesSlow: true },
      desc: 'Heroes stop for 4 s. Distracted heroes also become Slowed.' },
  ],
}

// Returns the effective tool definition for a tile at the given upgrade tier (0-2).
// Merges base stats with tier overrides so simulation and UI always see the right values.
export function getEffectiveTool(tileId, tier = 0) {
  const base = DUNGEON_TOOLS.find(t => t.id === tileId)
  if (!base || tier === 0) return base ?? null
  const tiers = UPGRADE_TIERS[tileId]
  if (!tiers) return base
  // tiers[0] = tier 2 upgrade, tiers[1] = tier 3 upgrade
  const override = tiers[tier - 1]
  if (!override) return base
  return { ...base, ...override.stats }
}

// ── Economy ────────────────────────────────────────────────────────────────
export const STARTING_GOLD         = 250     // bumped from 200 — longer path needs more setup
// ── Difficulty Settings ────────────────────────────────────────────────────
// hpScaling: controls how steeply hero HP grows with each wave.
//   effectiveMult = 1.0 + (waveMult - 1.0) * hpScaling
//   Wave 1 is identical on all difficulties (waveMult 1.0 → result 1.0).
//   The gap opens in later waves where waveMult reaches 9.0 on hard.
//
// waveGoldMult: multiplier applied to each wave's planning gold budget.
// startingGold: gold available for wave 1 setup.
// treasureHp: how much damage the treasure can absorb before the run ends.
export const DIFFICULTIES = {
  easy: {
    id: 'easy', label: 'Easy', emoji: '🌿',
    tagline: 'More gold, gentler scaling.',
    description: 'Heroes scale at 35% the hard rate. +50% wave gold. Good for learning trap placement.',
    color: '#20a060', borderColor: 'rgba(32,160,96,0.5)',
    startingGold: 450, waveGoldMult: 1.5, treasureHp: 500, hpScaling: 0.35,
  },
  medium: {
    id: 'medium', label: 'Medium', emoji: '⚔️',
    tagline: 'A real fight every round.',
    description: 'Heroes scale at 65% the hard rate. +20% wave gold. Balanced challenge throughout.',
    color: '#c8a048', borderColor: 'rgba(200,160,72,0.5)',
    startingGold: 350, waveGoldMult: 1.2, treasureHp: 400, hpScaling: 0.65,
  },
  hard: {
    id: 'hard', label: 'Hard', emoji: '💀',
    tagline: 'Exponential. Good luck.',
    description: 'Full HP scaling. Standard gold. Heroes grow dramatically tougher every wave.',
    color: '#8b1a1a', borderColor: 'rgba(139,26,26,0.5)',
    startingGold: 250, waveGoldMult: 1.0, treasureHp: 300, hpScaling: 1.0,
  },
}

export const SELL_REFUND_RATE      = 0.5
export const BANK_COST_MULT        = 1.5   // war-chest emergency-placement premium
export const HERO_KILL_GOLD        = { knight: 30, mage: 40, thief: 35, paladin: 50, berserker: 45, ranger: 35, cleric: 55, archmage: 60, champion: 100, warlord: 60, regenerator: 50, engineer: 55, phantom: 50, medic: 70, crusader: 65 }
export const GOLD_CARRYING_BONUS   = 25      // extra gold if you kill a hero who has the treasure
export const TREASURE_MAX_HP       = 300
export const TREASURE_HERO_DAMAGE  = 80
export const HERO_SPAWN_STAGGER_MS = 1500    // ms between hero spawns (was 1200)
