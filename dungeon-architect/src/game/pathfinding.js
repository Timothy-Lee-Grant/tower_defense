// ── A* Pathfinding ──
// grid: 2D array of tile strings
// start/end: { col, row }
// heroType: hero definition object (for weighted avoidance)

import { TILE } from './constants.js'

const PASSABLE = new Set([
  TILE.EMPTY, TILE.SPIKE, TILE.DART, TILE.BOULDER,
  TILE.FIRE, TILE.POISON, TILE.DOOR, TILE.LEVER,
  TILE.SKELETON, TILE.WRAITH, TILE.SLIME,
  TILE.ENTRANCE, TILE.TREASURE,
])

// Cost modifiers for hero avoidance behaviors
function tileCost(tileId, hero) {
  if (!PASSABLE.has(tileId)) return Infinity
  if (tileId === TILE.WALL || tileId === TILE.DOOR) return tileId === TILE.DOOR ? 3 : Infinity
  if (tileId === TILE.FIRE && hero?.fearFire)   return 1 + hero.fearFire * 20
  if (tileId === TILE.SPIKE && hero?.fearSpike) return 1 + hero.fearSpike * 8
  if (tileId === TILE.POISON) return 2
  if (tileId === TILE.SKELETON || tileId === TILE.SLIME || tileId === TILE.WRAITH) return 4
  return 1
}

function heuristic(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row)
}

function key(node) {
  return `${node.col},${node.row}`
}

function neighbors(col, row, rows, cols) {
  const dirs = [{ dc: 1, dr: 0 }, { dc: -1, dr: 0 }, { dc: 0, dr: 1 }, { dc: 0, dr: -1 }]
  return dirs
    .map(({ dc, dr }) => ({ col: col + dc, row: row + dr }))
    .filter(n => n.col >= 0 && n.col < cols && n.row >= 0 && n.row < rows)
}

export function findPath(grid, start, end, hero = null) {
  const rows = grid.length
  const cols = grid[0].length

  const openSet = new Map()
  const gScore = new Map()
  const fScore = new Map()
  const cameFrom = new Map()

  const startKey = key(start)
  gScore.set(startKey, 0)
  fScore.set(startKey, heuristic(start, end))
  openSet.set(startKey, start)

  while (openSet.size > 0) {
    // Pick lowest fScore from open set
    let current = null
    let lowestF = Infinity
    for (const [k, node] of openSet) {
      const f = fScore.get(k) ?? Infinity
      if (f < lowestF) { lowestF = f; current = { ...node, key: k } }
    }

    if (!current) break

    if (current.col === end.col && current.row === end.row) {
      // Reconstruct path
      const path = []
      let cur = key(end)
      while (cameFrom.has(cur)) {
        const [c, r] = cur.split(',').map(Number)
        path.unshift({ col: c, row: r })
        cur = cameFrom.get(cur)
      }
      path.unshift(start)
      return path
    }

    openSet.delete(current.key)

    for (const neighbor of neighbors(current.col, current.row, rows, cols)) {
      const nKey = key(neighbor)
      const tileId = grid[neighbor.row][neighbor.col]
      const cost = tileCost(tileId, hero)
      if (cost === Infinity) continue

      const tentativeG = (gScore.get(current.key) ?? Infinity) + cost
      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, current.key)
        gScore.set(nKey, tentativeG)
        fScore.set(nKey, tentativeG + heuristic(neighbor, end))
        openSet.set(nKey, neighbor)
      }
    }
  }

  return [] // No path found
}

// Helper: preview paths for all hero types (used in Plan Phase overlay)
export function previewPaths(grid, entrance, treasure) {
  return {
    knight: findPath(grid, entrance, treasure, { fearFire: 0.2, fearSpike: 0.5 }),
    mage:   findPath(grid, entrance, treasure, { fearFire: 0.9, fearSpike: 0.8, detectsTraps: true }),
    thief:  findPath(grid, entrance, treasure, { fearFire: 0.7, fearSpike: 0.3 }),
  }
}
