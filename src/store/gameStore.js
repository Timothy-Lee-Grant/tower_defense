// ── Global Game Store ──
import { create } from 'zustand'
import {
  GRID_COLS, GRID_ROWS, TILE, DUNGEON_TOOLS,
  STARTING_GOLD, SELL_REFUND_RATE, WAVE_CONFIGS,
  TREASURE_MAX_HP, HERO_TYPES,
  PATH_TILES, PATH_SET, ENTRANCE, TREASURE,
} from '../game/constants.js'
import { createHero, simulationTick } from '../game/simulation.js'

// ── Initial Grid ──
// PATH tiles are pre-drawn; everything else is EMPTY (buildable).
function makeInitialGrid() {
  const grid = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(TILE.EMPTY)
  )
  for (const pt of PATH_TILES) {
    grid[pt.row][pt.col] = TILE.PATH
  }
  grid[ENTRANCE.row][ENTRANCE.col]  = TILE.ENTRANCE
  grid[TREASURE.row][TREASURE.col]  = TILE.TREASURE
  return grid
}

// ── Phase Enum ──
export const PHASE = {
  MENU:    'menu',
  PLAN:    'plan',
  WAVE:    'wave',
  RESULTS: 'results',
}

// ── Store ──
export const useGameStore = create((set, get) => ({
  // Screen state
  phase: PHASE.MENU,

  // Grid
  grid: makeInitialGrid(),

  // Tool selection
  selectedTool: null,
  selectedCategory: 'traps',

  // Economy
  gold: STARTING_GOLD,
  bank: 0,
  unlockedTools: DUNGEON_TOOLS.filter(t => t.unlocked).map(t => t.id),

  // Waves
  waveIndex: 0,
  heroes: [],
  trapTimers: {},
  simulationRef: null,

  // Scores
  treasureHp: TREASURE_MAX_HP,
  heroesKilled: 0,
  heroesEscaped: 0,
  goldEarnedThisWave: 0,
  battleLog: [],

  // Attack flash events for renderer (cleared each tick)
  attackFlashes: [],

  // Upgrade cards
  upgradeCards: [],

  // ── Computed helpers ──
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
      attackFlashes: [],
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

    const currentTile = grid[row]?.[col]
    if (!currentTile) return
    if (currentTile === TILE.ENTRANCE || currentTile === TILE.TREASURE) return

    const toolDef = DUNGEON_TOOLS.find(t => t.id === selectedTool)
    if (!toolDef) return
    if (gold < toolDef.cost) return

    // Placement rules: on-path traps need a PATH tile; towers need an EMPTY tile
    const isPathTile = PATH_SET.has(`${col},${row}`) ||
      currentTile === TILE.SPIKE || currentTile === TILE.BOULDER || currentTile === TILE.DOOR

    if (toolDef.placesOn === 'path' && !isPathTile) return
    if (toolDef.placesOn === 'open' && (isPathTile || currentTile !== TILE.EMPTY)) return

    const newGrid = grid.map(r => [...r])
    newGrid[row][col] = selectedTool
    set({ grid: newGrid, gold: gold - toolDef.cost })
  },

  removeTile(col, row) {
    const { grid, gold } = get()
    const tileId = grid[row]?.[col]
    if (!tileId) return
    if (tileId === TILE.EMPTY || tileId === TILE.PATH ||
        tileId === TILE.ENTRANCE || tileId === TILE.TREASURE) return

    const toolDef = DUNGEON_TOOLS.find(t => t.id === tileId)
    const refund = toolDef ? Math.floor(toolDef.cost * SELL_REFUND_RATE) : 0

    const newGrid = grid.map(r => [...r])
    // Restore to PATH or EMPTY based on whether this is a path position
    newGrid[row][col] = PATH_SET.has(`${col},${row}`) ? TILE.PATH : TILE.EMPTY
    set({ grid: newGrid, gold: gold + refund })
  },

  startWave() {
    const { waveIndex, grid } = get()
    const waveConfig = WAVE_CONFIGS[waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1]

    const heroes = waveConfig.heroes.map((heroId, i) =>
      createHero(HERO_TYPES[heroId], i)
    )

    set({
      phase: PHASE.WAVE,
      heroes,
      battleLog: [`Wave ${waveIndex + 1}: ${waveConfig.label}`],
      goldEarnedThisWave: 0,
      trapTimers: {},
      attackFlashes: [],
    })

    let lastTime = performance.now()

    const loop = (now) => {
      const state = get()
      if (state.phase !== PHASE.WAVE) return

      const deltaMs = now - lastTime
      lastTime = now

      const result = simulationTick(
        state.heroes,
        state.grid,
        deltaMs,
        state.trapTimers,
      )

      // Build log entries
      const newLogEntries = result.events.map(ev => {
        if (ev.type === 'hero_killed')      return `☠️ ${ev.label} defeated (+${ev.gold}g)`
        if (ev.type === 'treasure_reached') return `💀 ${ev.label} reached your treasure!`
        if (ev.type === 'trap_triggered')   return `⚡ ${ev.label ?? 'Hero'} hit a ${ev.trap}`
        if (ev.type === 'trap_disarmed')    return `🔓 ${ev.label} disarmed a spike`
        if (ev.type === 'tower_attack')     return null  // too noisy for the log
        return null
      }).filter(Boolean)

      const newDead    = result.heroes.filter(h => h.state === 'dead').length
      const newEscaped = result.heroes.filter(h => h.state === 'escaped').length
      const prevDead    = state.heroes.filter(h => h.state === 'dead').length
      const prevEscaped = state.heroes.filter(h => h.state === 'escaped').length

      // Attack flash events for the renderer (keep for 250ms)
      const now2 = performance.now()
      const freshFlashes = result.events
        .filter(e => e.type === 'tower_attack')
        .map(e => ({ fromX: e.fromX, fromY: e.fromY, toX: e.toX, toY: e.toY, t: now2 }))
      const activeFlashes = [
        ...state.attackFlashes.filter(f => now2 - f.t < 250),
        ...freshFlashes,
      ]

      set({
        heroes: result.heroes,
        trapTimers: result.trapTimers,
        treasureHp: Math.max(0, state.treasureHp - result.treasureDamage),
        heroesKilled: state.heroesKilled + (newDead - prevDead),
        heroesEscaped: state.heroesEscaped + (newEscaped - prevEscaped),
        goldEarnedThisWave: state.goldEarnedThisWave + result.goldEarned,
        bank: state.bank + result.goldEarned,
        battleLog: [...state.battleLog.slice(-30), ...newLogEntries],
        attackFlashes: activeFlashes,
      })

      // Handle boulder destruction (one-shot trap)
      const boulderEvents = result.events.filter(e => e.type === 'trap_triggered' && e.trap === 'boulder')
      if (boulderEvents.length > 0) {
        const newGrid = get().grid.map(r => [...r])
        boulderEvents.forEach(ev => {
          const [c, r] = ev.trapKey.split(',').map(Number)
          newGrid[r][c] = TILE.PATH  // boulder consumed
        })
        set({ grid: newGrid })
      }

      // Wave ends when every hero has spawned and is in a terminal state
      const waveOver = result.heroes.every(
        h => h.spawned && (h.state === 'dead' || h.state === 'escaped')
      )
      if (waveOver) {
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
    const { simulationRef, waveIndex } = get()
    if (simulationRef) cancelAnimationFrame(simulationRef)

    // Generate upgrade cards
    const locked = DUNGEON_TOOLS.filter(t => !t.unlocked)
    const shuffled = [...locked].sort(() => Math.random() - 0.5)
    const cards = shuffled.slice(0, Math.min(3, shuffled.length))
      .map(tool => ({ type: 'unlock', tool }))
    while (cards.length < 3) cards.push({ type: 'gold', amount: 80 })

    set({
      phase: PHASE.RESULTS,
      simulationRef: null,
      upgradeCards: cards,
      gold: WAVE_CONFIGS[waveIndex + 1]?.gold ?? 300,
      attackFlashes: [],
    })
  },

  pickUpgradeCard(card) {
    const { waveIndex, unlockedTools } = get()
    if (card.type === 'unlock') {
      set({ unlockedTools: [...unlockedTools, card.tool.id] })
    } else if (card.type === 'gold') {
      set({ bank: get().bank + card.amount })
    }
    set({
      phase: PHASE.PLAN,
      waveIndex: waveIndex + 1,
      upgradeCards: [],
      heroes: [],
    })
  },
}))
