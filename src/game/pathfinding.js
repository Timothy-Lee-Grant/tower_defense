// ── A* Pathfinding ──
// grid: 2D array of tile strings
// start/end: { col, row }
// heroType: hero preference object (for weighted avoidance)

import { TILE } from './constants.js'

// All tile types a hero can physically traverse (includes everything except solid walls)
const PASSABLE = new Set([
  TILE.EMPTY,    TILE.PATH,     TILE.ENTRANCE, TILE.TREASURE,
  TILE.SPIKE,    TILE.BOULDER,  TILE.DOOR,     TILE.LAVA,
  TILE.PIT,      TILE.PENDULUM, TILE.TAR,      TILE.ELECTRIC, TILE.STASIS,
  TILE.DART,     TILE.FIRE,     TILE.POISON,   TILE.ICE,
  TILE.SKELETON, TILE.WRAITH,   TILE.SLIME,
  TILE.TROLL,    TILE.BAT,      TILE.SHADOW,   TILE.IDOL,
  TILE.GARGOYLE, TILE.CATAPULT, TILE.SPIDER,   TILE.MIMIC,
])

// Movement cost for a tile, given hero preferences.
// Lower = preferred, Infinity = impassable.
function tileCost(tileId, hero) {
  if (!PASSABLE.has(tileId)) return Infinity
  // Fear of fire (mage avoids fire vents strongly)
  if (tileId === TILE.FIRE    && hero?.fearFire)   return 1 + hero.fearFire * 20
  // Fear of spikes (varies per type; thief/warlord disarm so no fear)
  if (tileId === TILE.SPIKE   && hero?.fearSpike)  return 1 + hero.fearSpike * 8
  // Fear of lava (anyone not fire-resistant hates lava)
  if (tileId === TILE.LAVA    && hero?.fearLava)   return 1 + hero.fearLava * 12
  // Slow door costs time even if not "feared"
  if (tileId === TILE.DOOR)   return 3
  // Poison is slightly avoided (ranger immune = no fear, others take damage)
  if (tileId === TILE.POISON  && hero?.fearPoison) return 1 + hero.fearPoison * 6
  // Monster tiles are mildly avoided (hero would rather not run through a skeleton)
  if (tileId === TILE.SKELETON || tileId === TILE.SLIME || tileId === TILE.WRAITH) return 3
  if (tileId === TILE.TROLL   || tileId === TILE.BAT   || tileId === TILE.SHADOW) return 3
  if (tileId === TILE.IDOL    || tileId === TILE.GARGOYLE) return 2
  return 1
}

function heuristic(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row)
}

function key(node) {
  return `${node.col},${node.row}`
}

function neighbors(col, row, rows, cols) {
  return [{ dc: 1, dr: 0 }, { dc: -1, dr: 0 }, { dc: 0, dr: 1 }, { dc: 0, dr: -1 }]
    .map(({ dc, dr }) => ({ col: col + dc, row: row + dr }))
    .filter(n => n.col >= 0 && n.col < cols && n.row >= 0 && n.row < rows)
}

export function findPath(grid, start, end, hero = null) {
  const rows = grid.length
  const cols = grid[0].length

  const openSet  = new Map()
  const gScore   = new Map()
  const fScore   = new Map()
  const cameFrom = new Map()

  const startKey = key(start)
  gScore.set(startKey, 0)
  fScore.set(startKey, heuristic(start, end))
  openSet.set(startKey, start)

  while (openSet.size > 0) {
    let current = null; let lowestF = Infinity
    for (const [k, node] of openSet) {
      const f = fScore.get(k) ?? Infinity
      if (f < lowestF) { lowestF = f; current = { ...node, key: k } }
    }
    if (!current) break

    if (current.col === end.col && current.row === end.row) {
      const path = []; let cur = key(end)
      while (cameFrom.has(cur)) {
        const [c, r] = cur.split(',').map(Number)
        path.unshift({ col: c, row: r })
        cur = cameFrom.get(cur)
      }
      path.unshift(start)
      return path
    }

    openSet.delete(current.key)

    for (const nb of neighbors(current.col, current.row, rows, cols)) {
      const nKey = key(nb)
      const cost = tileCost(grid[nb.row][nb.col], hero)
      if (cost === Infinity) continue

      const tentativeG = (gScore.get(current.key) ?? Infinity) + cost
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, current.key)
        gScore.set(nKey, tentativeG)
        fScore.set(nKey, tentativeG + heuristic(nb, end))
        openSet.set(nKey, nb)
      }
    }
  }

  return []
}

// ── Hero path preferences (fear weights for tile avoidance) ──────────────────
// These determine how each hero would route if given an open grid.
// In the current game heroes follow a fixed path, but these are used for
// plan-phase analysis and future free-roam pathfinding.

export const HERO_PATH_PREFS = {
  knight:      { fearFire: 0.20, fearSpike: 0.40, fearLava: 0.50 },
  mage:        { fearFire: 0.90, fearSpike: 0.30, fearLava: 0.30 },   // fire resistant: avoids strongly
  thief:       { fearFire: 0.70, fearSpike: 0.00, fearLava: 0.60 },   // disarms spikes
  paladin:     { fearFire: 0.30, fearSpike: 0.40, fearLava: 0.40 },
  berserker:   { fearFire: 0.05, fearSpike: 0.05, fearLava: 0.15 },   // charges through everything
  ranger:      { fearFire: 0.50, fearSpike: 0.35, fearLava: 0.45, fearPoison: 0.00 }, // poison-immune
  cleric:      { fearFire: 0.50, fearSpike: 0.50, fearLava: 0.50 },
  archmage:    { fearFire: 0.05, fearSpike: 0.30, fearLava: 0.20 },   // highly fire resistant
  champion:    { fearFire: 0.15, fearSpike: 0.20, fearLava: 0.30 },   // 45% DR: fears little
  warlord:     { fearFire: 0.10, fearSpike: 0.00, fearLava: 0.30 },   // destroys on-path traps
  regenerator: { fearFire: 0.30, fearSpike: 0.30, fearLava: 0.35 },   // heals fast
}

// Preview paths for all (or a subset of) hero types.
// heroTypeIds: array of type ID strings to compute (defaults to all)
export function previewPaths(grid, entrance, treasure, heroTypeIds = Object.keys(HERO_PATH_PREFS)) {
  const result = {}
  for (const id of heroTypeIds) {
    const prefs = HERO_PATH_PREFS[id] ?? {}
    result[id] = findPath(grid, entrance, treasure, prefs)
  }
  return result
}
