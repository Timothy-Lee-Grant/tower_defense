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
  LAVA:     'lava',     // NEW: persistent DoT while traversing
  // Off-path towers/monsters (ranged attacks beside path)
  DART:     'dart',
  FIRE:     'fire',
  POISON:   'poison',
  ICE:      'ice',      // NEW: slows heroes
  SKELETON: 'skeleton',
  WRAITH:   'wraith',
  SLIME:    'slime',
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

const PATH_WAYPOINTS = [
  { col: 0,  row: 6  },   // entrance / escape point
  { col: 3,  row: 6  },
  { col: 3,  row: 2  },
  { col: 17, row: 2  },
  { col: 17, row: 6  },
  { col: 19, row: 6  },   // ★ TREASURE midpoint
  { col: 19, row: 10 },
  { col: 0,  row: 10 },
  { col: 0,  row: 6  },   // escape (same tile as entrance)
]

function buildCenterline(wps) {
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

export const PATH_TILES = buildCenterline(PATH_WAYPOINTS)

// Extra tiles that widen certain corridors visually (heroes don't walk here)
const _extra = []
for (let c = 4;  c <= 16; c++) _extra.push({ col: c, row: 1  })   // above top horizontal
for (let c = 1;  c <= 18; c++) _extra.push({ col: c, row: 11 })   // below bottom horizontal
for (let r = 7;  r <= 9;  r++) _extra.push({ col: 18, row: r })   // beside right corridor
_extra.push(
  { col: 1, row: 5 }, { col: 1, row: 7 },   // entrance flanks
  { col: 0, row: 5 }, { col: 0, row: 7 },
  { col: 4, row: 2 }, { col: 3, row: 3 },   // top-left plaza
  { col: 16, row: 2 }, { col: 17, row: 3 }, // top-right plaza
  { col: 18, row: 10 }, { col: 19, row: 9 },// bottom-right plaza
  { col: 1,  row: 10 }, { col: 0,  row: 9 },// bottom-left plaza
)

const _centerKeys = new Set(PATH_TILES.map(p => `${p.col},${p.row}`))
export const PATH_EXTRA = _extra.filter(p => !_centerKeys.has(`${p.col},${p.row}`))
export const PATH_ALL   = [...PATH_TILES, ...PATH_EXTRA]

export const PATH_SET        = new Set(PATH_ALL.map(p => `${p.col},${p.row}`))
export const PATH_CENTER_SET = new Set(PATH_TILES.map(p => `${p.col},${p.row}`))

export const ENTRANCE = { col: 0,  row: 6 }
export const TREASURE = { col: 19, row: 6 }

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
  { wave: 12, hpMult: 6.5, gold: 480, label: 'The Veteran Warband',
    heroes: ['warlord','warlord','berserker','berserker','ranger','ranger','mage','paladin','cleric','regenerator','thief'] },

  // ── Tier 5: Near-Impossible (waves 13–14) ────────────────────────────────
  // Archmage + arcane host. Full roster pressure — dungeon ~8500–11000g invested.
  { wave: 13, hpMult: 7.5, gold: 500, label: 'The Arcane Host',
    heroes: ['archmage','warlord','warlord','berserker','berserker','ranger','ranger','knight','paladin','cleric','regenerator','thief'] },
  { wave: 14, hpMult: 9.0, gold: 550, label: "The Champion's Crusade",
    heroes: ['champion','archmage','archmage','warlord','warlord','berserker','berserker','ranger','ranger','cleric','paladin','regenerator'] },
]

// ── Economy ────────────────────────────────────────────────────────────────
export const STARTING_GOLD         = 250     // bumped from 200 — longer path needs more setup
export const SELL_REFUND_RATE      = 0.5
export const HERO_KILL_GOLD        = { knight: 30, mage: 40, thief: 35, paladin: 50, berserker: 45, ranger: 35, cleric: 55, archmage: 60, champion: 100, warlord: 60, regenerator: 50 }
export const GOLD_CARRYING_BONUS   = 25      // extra gold if you kill a hero who has the treasure
export const TREASURE_MAX_HP       = 300
export const TREASURE_HERO_DAMAGE  = 80
export const HERO_SPAWN_STAGGER_MS = 1500    // ms between hero spawns (was 1200)
