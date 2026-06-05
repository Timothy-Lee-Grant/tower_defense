// ── Strategic Analysis Tools ──
// Used by the plan-phase UI to give the player insight into their dungeon's
// strengths and gaps before the wave starts.
//
// Exports:
//   HERO_PATH_COLORS         — display color per hero type
//   computeCoverageMap(grid) — 2D array: how many towers cover each tile
//   estimateSurvival(heroTypeId, grid) — 0–1 chance hero reaches treasure
//   getImmunityWarnings(heroTypeId, grid) — array of warning strings

import { DUNGEON_TOOLS, HERO_TYPES, PATH_TILES, TILE } from './constants.js'

// ── Display color per hero type ───────────────────────────────────────────────
// Matches each hero's sprite color so the player has consistent mental mapping.

export const HERO_PATH_COLORS = {
  knight:      '#c8a048',
  mage:        '#9040cc',
  thief:       '#3a8a2a',
  paladin:     '#d8d840',
  berserker:   '#cc3010',
  ranger:      '#3a9a8a',
  cleric:      '#a0c0e8',
  archmage:    '#bf3abf',
  champion:    '#c8a020',
  warlord:     '#8b1a1a',
  regenerator: '#20a060',
}

// ── Coverage Map ──────────────────────────────────────────────────────────────
// Returns a 2D array where map[row][col] = the number of towers whose range
// circle includes that tile.  Used to draw the heatmap overlay.

export function computeCoverageMap(grid) {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const map  = Array.from({ length: rows }, () => new Array(cols).fill(0))

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tool = DUNGEON_TOOLS.find(t => t.id === grid[r][c] && t.range)
      if (!tool) continue
      for (let tr = 0; tr < rows; tr++) {
        for (let tc = 0; tc < cols; tc++) {
          if (Math.sqrt((tc - c) ** 2 + (tr - r) ** 2) <= tool.range) map[tr][tc]++
        }
      }
    }
  }
  return map
}

// ── Survival Estimate ─────────────────────────────────────────────────────────
// Returns a 0–1 float: 1.0 = hero takes no damage (sails through),
// 0.0 = takes many times their HP in damage (certain death).
// This is an estimate, not a simulation — good for directional guidance.

export function estimateSurvival(heroTypeId, grid) {
  const hero = HERO_TYPES[heroTypeId]
  if (!hero) return 0.5

  const dr    = hero.damageReduction ?? 0
  const speed = hero.speed ?? 1.0
  let damage  = 0

  // ── On-path trap damage (heroes walk over these tiles) ──
  for (const pt of PATH_TILES) {
    const tileId = grid[pt.row]?.[pt.col]
    if (!tileId) continue

    if (tileId === TILE.SPIKE && !hero.canDisarm) {
      damage += 25 * (1 - dr)
    } else if (tileId === TILE.BOULDER && !hero.boulderResist) {
      damage += 60 * (1 - dr)
    } else if (tileId === TILE.LAVA) {
      // Hero spends ≈ 1/speed seconds crossing each tile
      damage += 15 * (1 / speed) * (1 - dr)
    }
  }

  // ── Off-path tower DPS × time hero spends in range ──
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const tool = DUNGEON_TOOLS.find(t => t.id === grid[r][c] && t.range && t.damage)
      if (!tool) continue

      // Count how many PATH_TILES this tower covers (both outbound + return legs)
      const covered = PATH_TILES.filter(
        pt => Math.sqrt((pt.col - c) ** 2 + (pt.row - r) ** 2) <= tool.range
      ).length
      if (covered === 0) continue

      const timeInRange = covered / speed           // seconds at hero's speed
      const dps         = tool.damage / (tool.attackSpeed / 1000)
      let   effectiveDps = dps * (1 - dr)

      // Elemental resistances
      if (tool.id === TILE.FIRE)   effectiveDps *= (hero.fireResist ?? 1)
      if (tool.id === TILE.POISON && hero.immuneToPoison) effectiveDps = 0

      // Ice shard: still deals damage even to slow-immune heroes
      damage += effectiveDps * timeInRange
    }
  }

  // ── Self-healing offsets some damage ──
  if (hero.selfHealRate) {
    const totalPathTime = PATH_TILES.length / speed
    // Conservative: assume hero heals at ~60% efficiency (doesn't always have full HP)
    damage -= hero.selfHealRate * totalPathTime * 0.6
  }

  damage = Math.max(0, damage)
  // Survivability: how much HP they have left as a fraction
  return Math.max(0, Math.min(1, 1 - damage / hero.hp))
}

// ── Immunity Warnings ─────────────────────────────────────────────────────────
// Returns an array of short warning strings when this hero type is immune/resistant
// to defenses currently placed in the grid — tells the player about wasted coverage.

export function getImmunityWarnings(heroTypeId, grid) {
  const hero = HERO_TYPES[heroTypeId]
  if (!hero) return []

  const tileSet = new Set(grid.flat())
  const warnings = []

  if (hero.immuneToPoison && tileSet.has(TILE.POISON))
    warnings.push('poison-immune')
  if (hero.immuneToSlow   && tileSet.has(TILE.ICE))
    warnings.push('slow-immune')
  if ((hero.fireResist ?? 1) <= 0.5 && tileSet.has(TILE.FIRE))
    warnings.push('fire-resist')
  if (hero.canDisarm      && tileSet.has(TILE.SPIKE))
    warnings.push('disarms spikes')
  if (hero.boulderResist  && tileSet.has(TILE.BOULDER))
    warnings.push('destroys boulders')

  return warnings
}
