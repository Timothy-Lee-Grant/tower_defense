// ── Global Game Store ──
// Single source of truth for all game state using Zustand.

import { create } from 'zustand'
import {
  GRID_COLS, GRID_ROWS, TILE, DUNGEON_TOOLS,
  STARTING_GOLD, SELL_REFUND_RATE, WAVE_CONFIGS,
  TREASURE_MAX_HP, HERO_TYPES,
} from '../game/constants.js'
import { createHero, simulationTick } from '../game/simulation.js'
import { previewPaths } from '../game/pathfinding.js'

// ── Initial Grid ──
function makeInitialGrid() {
  const grid = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(TILE.EMPTY)
  )
  // Entrance (left edge, middle)
  const entranceRow = Math.floor(GRID_ROWS / 2)
  grid[entranceRow][0] = TILE.ENTRANCE
  // Treasure room (right edge, middle)
  grid[entranceRow][GRID_COLS - 1] = TILE.TREASURE
  return grid
}

const ENTRANCE  = { col: 0, row: Math.floor(GRID_ROWS / 2) }
const TREASURE_POS = { col: GRID_COLS - 1, row: Math.floor(GRID_ROWS / 2) }

// ── Phase Enum ──
export const PHASE = {
  MENU:    'menu',
  PLAN:    'plan',
  WAVE:    'wave',
  RESULTS: 'results',
}

// ── Store ──
export const useGameStore = create((set, get) => ({
  // ── Screen state
  phase: PHASE.MENU,

  // ── Grid
  grid: makeInitialGrid(),
  entrance: ENTRANCE,
  treasure: TREASURE_POS,

  // ── Tool selection
  selectedTool: null,        // tool id string or null
  selectedCategory: 'traps',

  // ── Economy
  gold: STARTING_GOLD,
  bank: 0,                   // persistent gold reserve
  unlockedTools: DUNGEON_TOOLS.filter(t => t.unlocked).map(t => t.id),

  // ── Waves
  waveIndex: 0,
  heroes: [],
  trapTimers: {},            // key: "col,row" → ms elapsed
  simulationRef: null,       // holds requestAnimationFrame id

  // ── Scores
  treasureHp: TREASURE_MAX_HP,
  heroesKilled: 0,
  heroesEscaped: 0,
  goldEarnedThisWave: 0,
  battleLog: [],             // array of event strings

  // ── Path preview
  showPathPreview: false,
  previewedPaths: null,

  // ── Upgrade cards (shown in Results phase)
  upgradeCards: [],

  // ── Computed helpers
  currentWaveConfig: () => WAVE_CONFIGS[get().waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1],

  // ── Actions ──

  startGame() {
    set({
      phase: PHASE.PLAN,
      grid: makeInitialGrid(),
      gold: STARTING_GOLD,
      bank: 0,
      waveIndex: 0,
      treasureHp: TREASURE_MAX_HP,
      heroesKilled: 0,
      heroesEscaped: 0,
      battleLog: [],
      unlockedTools: DUNGEON_TOOLS.filter(t => t.unlocked).map(t => t.id),
    })
  },

  goToMenu() {
    set({ phase: PHASE.MENU })
  },

  selectTool(toolId) {
    set({ selectedTool: toolId })
  },

  selectCategory(cat) {
    set({ selectedCategory: cat, selectedTool: null })
  },

  placeTile(col, row) {
    const { grid, selectedTool, gold, unlockedTools } = get()
    if (!selectedTool) return
    if (!unlockedTools.includes(selectedTool)) return

    // Protect entrance and treasure
    const tile = grid[row]?.[col]
    if (tile === TILE.ENTRANCE || tile === TILE.TREASURE) return

    const toolDef = DUNGEON_TOOLS.find(t => t.id === selectedTool)
    if (!toolDef) return
    if (gold < toolDef.cost) return

    const newGrid = grid.map(r => [...r])
    newGrid[row][col] = selectedTool
    set({ grid: newGrid, gold: gold - toolDef.cost })
  },

  removeTile(col, row) {
    const { grid, gold } = get()
    const tileId = grid[row]?.[col]
    if (!tileId || tileId === TILE.EMPTY || tileId === TILE.ENTRANCE || tileId === TILE.TREASURE) return

    const toolDef = DUNGEON_TOOLS.find(t => t.id === tileId)
    const refund = toolDef ? Math.floor(toolDef.cost * SELL_REFUND_RATE) : 0

    const newGrid = grid.map(r => [...r])
    newGrid[row][col] = TILE.EMPTY
    set({ grid: newGrid, gold: gold + refund })
  },

  togglePathPreview() {
    const { grid, entrance, treasure, showPathPreview } = get()
    if (!showPathPreview) {
      const paths = previewPaths(grid, entrance, treasure)
      set({ showPathPreview: true, previewedPaths: paths })
    } else {
      set({ showPathPreview: false, previewedPaths: null })
    }
  },

  startWave() {
    const { waveIndex, grid, entrance, treasure } = get()
    const waveConfig = WAVE_CONFIGS[waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1]

    // Create hero instances from wave config
    const heroes = waveConfig.heroes.map((heroId, i) => {
      const heroType = HERO_TYPES[heroId]
      return createHero(heroType, i, entrance)
    })

    set({
      phase: PHASE.WAVE,
      heroes,
      battleLog: [`Wave ${waveIndex + 1}: ${waveConfig.label}`],
      goldEarnedThisWave: 0,
      trapTimers: {},
      showPathPreview: false,
      previewedPaths: null,
    })

    // Start simulation loop
    let lastTime = performance.now()

    const loop = (now) => {
      const state = get()
      if (state.phase !== PHASE.WAVE) return

      const deltaMs = now - lastTime
      lastTime = now

      // Advance trap timers
      const newTrapTimers = { ...state.trapTimers }
      state.grid.forEach((row, r) => {
        row.forEach((tile, c) => {
          if ([TILE.FIRE, TILE.DART].includes(tile)) {
            const k = `${c},${r}`
            newTrapTimers[k] = (newTrapTimers[k] ?? 0) + deltaMs
          }
        })
      })

      const result = simulationTick(
        state.heroes,
        state.grid,
        state.entrance,
        state.treasure,
        deltaMs,
        newTrapTimers,
      )

      // Build log entries from events
      const newLogEntries = result.events.map(ev => {
        if (ev.type === 'hero_killed')    return `☠️ ${ev.label} defeated (+${ev.gold}g)`
        if (ev.type === 'treasure_reached') return `💀 ${ev.label} reached your treasure!`
        if (ev.type === 'trap_triggered') return `⚡ Trap triggered on ${ev.label ?? 'a hero'}`
        if (ev.type === 'trap_disarmed')  return `🔓 ${ev.label} disarmed a trap`
        if (ev.type === 'combat')         return `⚔️ Combat at (${ev.trapKey})`
        return null
      }).filter(Boolean)

      const killed = result.heroes.filter(h => h.state === 'dead').length
      const escaped = result.heroes.filter(h => h.state === 'escaped').length
      const newTreasureHp = Math.max(0, state.treasureHp - result.treasureDamage)

      set({
        heroes: result.heroes,
        trapTimers: newTrapTimers,
        treasureHp: newTreasureHp,
        heroesKilled: state.heroesKilled + (killed - state.heroes.filter(h => h.state === 'dead').length),
        heroesEscaped: state.heroesEscaped + (escaped - state.heroes.filter(h => h.state === 'escaped').length),
        goldEarnedThisWave: state.goldEarnedThisWave + result.goldEarned,
        bank: state.bank + result.goldEarned,
        battleLog: [...state.battleLog.slice(-30), ...newLogEntries],
      })

      // Check wave end: all heroes resolved
      const allDone = result.heroes.every(h => h.state === 'dead' || h.state === 'escaped' || !h.spawned)
      const allSpawned = result.heroes.every(h => h.spawned || h.spawnDelay <= 0)

      if (allSpawned && allDone) {
        get().endWave()
        return
      }

      const rafId = requestAnimationFrame(loop)
      set({ simulationRef: rafId })
    }

    const rafId = requestAnimationFrame(loop)
    set({ simulationRef: rafId })
  },

  endWave() {
    const { simulationRef, waveIndex, bank } = get()
    if (simulationRef) cancelAnimationFrame(simulationRef)

    // Generate 3 random upgrade cards
    const locked = DUNGEON_TOOLS.filter(t => !t.unlocked)
    const cards = []
    const shuffled = [...locked].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
      cards.push({ type: 'unlock', tool: shuffled[i] })
    }
    // Pad with gold bonus cards
    while (cards.length < 3) {
      cards.push({ type: 'gold', amount: 80 })
    }

    set({
      phase: PHASE.RESULTS,
      simulationRef: null,
      upgradeCards: cards,
      // Refresh per-wave gold budget
      gold: WAVE_CONFIGS[waveIndex + 1]?.gold ?? 300,
    })
  },

  pickUpgradeCard(card) {
    const { waveIndex, unlockedTools, bank } = get()
    if (card.type === 'unlock') {
      set({ unlockedTools: [...unlockedTools, card.tool.id] })
    } else if (card.type === 'gold') {
      set({ bank: bank + card.amount })
    }
    set({
      phase: PHASE.PLAN,
      waveIndex: waveIndex + 1,
      upgradeCards: [],
      heroes: [],
    })
  },
}))
