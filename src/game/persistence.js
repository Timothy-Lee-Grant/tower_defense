// ── Persistence — Save / Load / Stats / Layout sharing ──
//
// Uses localStorage exclusively.  All functions are pure/synchronous and
// have no React or Zustand dependencies — safe to import anywhere.
//
// Save slots:
//   da_save_auto    — written automatically after each wave
//   da_save_1       — manual save slot 1
//   da_save_2       — manual save slot 2
//
// Stats key:  da_stats    — lifetime run history
// Version:    bump SAVE_VERSION if the save shape changes; old saves are discarded.

export const SAVE_VERSION = '1.1'

export const SAVE_SLOTS = {
  auto:    'da_save_auto',
  manual1: 'da_save_1',
  manual2: 'da_save_2',
}

const STATS_KEY  = 'da_stats'
const STRUCTURAL = new Set(['empty', 'path', 'entrance', 'treasure'])

// ── Helpers ───────────────────────────────────────────────────────────────────

export function relativeTime(ts) {
  const diff = Date.now() - ts
  const m    = Math.floor(diff / 60000)
  if (m <  1)   return 'just now'
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Save / Load ───────────────────────────────────────────────────────────────

// Build a serialisable snapshot from a Zustand store state object.
export function buildSaveData(state) {
  return {
    version:       SAVE_VERSION,
    timestamp:     Date.now(),
    difficulty:    state.difficulty,
    waveIndex:     state.waveIndex,          // the UPCOMING wave (0-based)
    grid:          state.grid,
    gold:          state.gold,
    bank:           state.bank,
    tileUpgrades:   state.tileUpgrades ?? {},
    activeLayoutId: state.activeLayoutId ?? 'catacombs',
    campaignNodeId: state.campaignNodeId ?? null,
    activeModifier: state.activeModifier ?? 'none',
    isEndlessMode:  state.isEndlessMode ?? false,
    endlessWave:    state.endlessWave ?? 0,
    unlockedTools:  state.unlockedTools,
    treasureHp:    state.treasureHp,         // end-of-last-wave HP (display only)
    treasureMaxHp: state.treasureMaxHp,
  }
}

// Write a save.  Returns true on success.
export function writeSave(key, state) {
  try {
    localStorage.setItem(key, JSON.stringify(buildSaveData(state)))
    return true
  } catch { return false }
}

// Read a save.  Returns the parsed data object, or null if absent / wrong version.
export function readSave(key) {
  try {
    const raw  = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    return data?.version === SAVE_VERSION ? data : null
  } catch { return null }
}

export function deleteSave(key) {
  try { localStorage.removeItem(key) } catch {}
}

// Return all non-empty save slots sorted newest-first.
// Each entry: { slotKey, slotLabel, data }
export function listSaves() {
  return Object.entries(SAVE_SLOTS)
    .map(([slotLabel, slotKey]) => ({ slotKey, slotLabel, data: readSave(slotKey) }))
    .sort((a, b) => (b.data?.timestamp ?? 0) - (a.data?.timestamp ?? 0))
}

// Return the most recent non-empty save across all slots, or null.
export function getMostRecentSave() {
  return listSaves().find(s => s.data !== null) ?? null
}

// ── Run stats ─────────────────────────────────────────────────────────────────

function emptyStats() {
  return {
    gamesPlayed:      0,
    bestWave:         {},      // { easy: n, medium: n, hard: n }  (0-based wave index)
    totalKills:       0,
    mostKillsInWave:  0,
    toolCounts:       {},      // { tileId: totalTimesPlaced }
  }
}

export function readStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    return raw ? { ...emptyStats(), ...JSON.parse(raw) } : emptyStats()
  } catch { return emptyStats() }
}

// Call at run end (victory or quit).
// heroesKilled: highest per-wave value, not cumulative.
export function recordRunEnd({ difficulty, waveIndex, heroesKilled, grid }) {
  const stats = readStats()

  stats.gamesPlayed++
  stats.totalKills      += heroesKilled
  stats.mostKillsInWave  = Math.max(stats.mostKillsInWave, heroesKilled)

  const prev = stats.bestWave[difficulty] ?? 0
  if (waveIndex > prev) stats.bestWave[difficulty] = waveIndex

  // Tally which tools appear in the final grid
  for (const row of grid)
    for (const tile of row)
      if (!STRUCTURAL.has(tile))
        stats.toolCounts[tile] = (stats.toolCounts[tile] ?? 0) + 1

  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)) } catch {}
}

// Returns the tool ID with the highest placement count, or null.
export function favoriteTool(stats) {
  const entries = Object.entries(stats.toolCounts ?? {})
  if (entries.length === 0) return null
  return entries.sort((a, b) => b[1] - a[1])[0][0]
}

// ── Campaign Progress ─────────────────────────────────────────────────────────
const CAMPAIGN_KEY = 'da_campaign'

// Returns { [nodeId]: starsEarned (0–3) }
export function readCampaignProgress() {
  try {
    const raw = localStorage.getItem(CAMPAIGN_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

// Record stars earned for a campaign node (keeps best).
export function recordCampaignNode(nodeId, stars) {
  const progress = readCampaignProgress()
  progress[nodeId] = Math.max(progress[nodeId] ?? 0, stars)
  try { localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(progress)) } catch {}
}

// ── Endless Mode High Score ───────────────────────────────────────────────────
const ENDLESS_KEY = 'da_endless_high'

export function readEndlessHigh() {
  try { return Number(localStorage.getItem(ENDLESS_KEY) ?? 0) } catch { return 0 }
}

export function recordEndlessHigh(wavesReached) {
  const current = readEndlessHigh()
  if (wavesReached > current)
    try { localStorage.setItem(ENDLESS_KEY, String(wavesReached)) } catch {}
}

// ── Layout export / import (6.4 — grid snapshot sharing) ─────────────────────
// Encodes only the non-structural tiles so the code stays short.
// Format: base64 of "col,row:tileId|col,row:tileId|..."

export function encodeLayout(grid) {
  const parts = []
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (!STRUCTURAL.has(grid[r][c]))
        parts.push(`${c},${r}:${grid[r][c]}`)
  return btoa(parts.join('|'))
}

// Apply an encoded layout onto a base grid (makeInitialGrid clone).
// Returns the modified grid, or null if the code is invalid.
export function decodeLayout(code, baseGrid) {
  try {
    const newGrid = baseGrid.map(r => [...r])
    atob(code).split('|').forEach(part => {
      const sep   = part.indexOf(':')
      if (sep < 0) return
      const pos    = part.slice(0, sep)
      const tileId = part.slice(sep + 1)
      const [col, row] = pos.split(',').map(Number)
      if (!isNaN(col) && !isNaN(row) && newGrid[row]?.[col] !== undefined)
        newGrid[row][col] = tileId
    })
    return newGrid
  } catch { return null }
}
