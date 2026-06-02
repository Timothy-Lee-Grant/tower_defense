// ── Global Game Store ──
import { create } from 'zustand'
import {
  GRID_COLS, GRID_ROWS, TILE, DUNGEON_TOOLS,
  STARTING_GOLD, SELL_REFUND_RATE, WAVE_CONFIGS,
  TREASURE_MAX_HP, HERO_TYPES,
  PATH_ALL, PATH_SET, PATH_CENTER_SET, ENTRANCE, TREASURE,
} from '../game/constants.js'
import { createHero, simulationTick } from '../game/simulation.js'

// ── Grid factory ───────────────────────────────────────────────────────────
function makeInitialGrid() {
  const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(TILE.EMPTY))
  for (const pt of PATH_ALL) grid[pt.row][pt.col] = TILE.PATH
  grid[ENTRANCE.row][ENTRANCE.col] = TILE.ENTRANCE
  grid[TREASURE.row][TREASURE.col] = TILE.TREASURE
  return grid
}

export const PHASE = { MENU: 'menu', PLAN: 'plan', WAVE: 'wave', RESULTS: 'results', VICTORY: 'victory' }

// ── Store ──────────────────────────────────────────────────────────────────
export const useGameStore = create((set, get) => ({
  phase:          PHASE.MENU,
  grid:           makeInitialGrid(),
  selectedTool:   null,
  selectedCategory: 'traps',

  // Economy
  gold:           STARTING_GOLD,
  bank:           0,
  unlockedTools:  DUNGEON_TOOLS.filter(t => t.unlocked).map(t => t.id),

  // Wave progress
  waveIndex:      0,
  heroes:         [],
  trapTimers:     {},
  simulationRef:  null,

  // Wave stats
  treasureHp:     TREASURE_MAX_HP,
  heroesKilled:   0,
  heroesEscapedWithGold: 0,   // escaped AND had the treasure
  heroesEscapedEmpty:    0,   // got scared off / escaped without loot (edge case)
  goldEarnedThisWave:    0,
  goldStolenThisWave:    0,   // cumulative treasure damage dealt
  battleLog:      [],
  attackFlashes:  [],
  upgradeCards:   [],

  currentWaveConfig: () => WAVE_CONFIGS[get().waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1],

  // ── Actions ────────────────────────────────────────────────────────────

  startGame() {
    set({
      phase: PHASE.PLAN,
      grid:  makeInitialGrid(),
      gold:  STARTING_GOLD,
      bank:  0,
      waveIndex: 0,
      treasureHp: TREASURE_MAX_HP,
      heroesKilled: 0,
      heroesEscapedWithGold: 0,
      heroesEscapedEmpty:    0,
      goldEarnedThisWave: 0,
      goldStolenThisWave: 0,
      battleLog: [],
      attackFlashes: [],
      unlockedTools: DUNGEON_TOOLS.filter(t => t.unlocked).map(t => t.id),
    })
  },

  goToMenu() { set({ phase: PHASE.MENU }) },
  selectTool(id)  { set({ selectedTool: id }) },
  selectCategory(cat) { set({ selectedCategory: cat, selectedTool: null }) },

  placeTile(col, row) {
    const { grid, selectedTool, gold, unlockedTools } = get()
    if (!selectedTool || !unlockedTools.includes(selectedTool)) return

    const cur = grid[row]?.[col]
    if (!cur || cur === TILE.ENTRANCE || cur === TILE.TREASURE) return

    const def = DUNGEON_TOOLS.find(t => t.id === selectedTool)
    if (!def || gold < def.cost) return

    const onCenterline = PATH_CENTER_SET.has(`${col},${row}`) ||
      [TILE.SPIKE, TILE.BOULDER, TILE.DOOR, TILE.LAVA].includes(cur)
    const anyPath = PATH_SET.has(`${col},${row}`)

    if (def.placesOn === 'path' && !onCenterline) return
    if (def.placesOn === 'open' && (anyPath || cur !== TILE.EMPTY)) return

    const newGrid = grid.map(r => [...r])
    newGrid[row][col] = selectedTool
    set({ grid: newGrid, gold: gold - def.cost })
  },

  removeTile(col, row) {
    const { grid, gold } = get()
    const tileId = grid[row]?.[col]
    if (!tileId || tileId === TILE.EMPTY || tileId === TILE.PATH ||
        tileId === TILE.ENTRANCE || tileId === TILE.TREASURE) return

    const def    = DUNGEON_TOOLS.find(t => t.id === tileId)
    const refund = def ? Math.floor(def.cost * SELL_REFUND_RATE) : 0
    const newGrid = grid.map(r => [...r])
    newGrid[row][col] = PATH_CENTER_SET.has(`${col},${row}`) ? TILE.PATH : TILE.EMPTY
    set({ grid: newGrid, gold: gold + refund })
  },

  startWave() {
    const { waveIndex } = get()
    const waveConfig = WAVE_CONFIGS[waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1]

    const hpMult = waveConfig.hpMult ?? 1
    const heroes = waveConfig.heroes.map((heroId, i) =>
      createHero(HERO_TYPES[heroId], i, hpMult)
    )

    set({
      phase:         PHASE.WAVE,
      heroes,
      // Always reset treasure HP at the start of each wave so a previous
      // loss doesn't cause the new wave to end on the very first tick.
      treasureHp:    TREASURE_MAX_HP,
      heroesKilled:  0,
      heroesEscapedWithGold: 0,
      heroesEscapedEmpty:    0,
      battleLog: [`⚔ Wave ${waveIndex + 1}: ${waveConfig.label}`],
      goldEarnedThisWave: 0,
      goldStolenThisWave: 0,
      trapTimers: {},
      attackFlashes: [],
    })

    let lastTime = performance.now()

    const loop = (now) => {
      const state = get()
      if (state.phase !== PHASE.WAVE) return

      const deltaMs = Math.min(now - lastTime, 100) // cap delta to avoid huge jumps
      lastTime = now

      const result = simulationTick(state.heroes, state.grid, deltaMs, state.trapTimers)

      // Build battle log entries
      const newLog = result.events.map(ev => {
        if (ev.type === 'hero_killed') {
          return ev.hadGold
            ? `⚔️ ${ev.label} slain while fleeing! (+${ev.gold}g)`
            : `⚔️ ${ev.label} defeated (+${ev.gold}g)`
        }
        if (ev.type === 'treasure_reached') return `💰 ${ev.label} grabbed the gold — heading back!`
        if (ev.type === 'hero_escaped')     return ev.hadGold
          ? `🏃 ${ev.label} escaped WITH the gold!`
          : `💨 ${ev.label} fled empty-handed.`
        if (ev.type === 'trap_triggered')   return `⚡ ${ev.label} hit a ${ev.trap}`
        if (ev.type === 'trap_disarmed')    return `🔓 ${ev.label} disarmed a spike`
        if (ev.type === 'curse_applied')    return ev.stacks === 3
          ? `👁️ ${ev.label} fully cursed — all damage +45%!`
          : `👁️ ${ev.label} cursed (stack ${ev.stacks}/3)`
        return null
      }).filter(Boolean)

      // Count state deltas
      const prevDead    = state.heroes.filter(h => h.state === 'dead').length
      const prevEscGold = state.heroes.filter(h => h.state === 'escaped' && h.hasGold).length
      const prevEscNone = state.heroes.filter(h => h.state === 'escaped' && !h.hasGold).length
      const newDead     = result.heroes.filter(h => h.state === 'dead').length
      const newEscGold  = result.heroes.filter(h => h.state === 'escaped' && h.hasGold).length
      const newEscNone  = result.heroes.filter(h => h.state === 'escaped' && !h.hasGold).length

      const newTreasureHp = Math.max(0, state.treasureHp - result.treasureDamage)

      // Attack flash events
      const ts = performance.now()
      const freshFlashes = result.events
        .filter(e => e.type === 'tower_attack')
        .map(e => ({
          fromX: e.fromX, fromY: e.fromY,
          toX: e.toX, toY: e.toY,
          towerType: e.towerType,
          tileCol: e.col, tileRow: e.row,
          t: ts,
        }))
      // Keep flashes alive long enough for the longest animation (wraith rush ~700ms)
      const activeFlashes = [
        ...state.attackFlashes.filter(f => ts - f.t < 750),
        ...freshFlashes,
      ]

      set({
        heroes:          result.heroes,
        trapTimers:      result.trapTimers,
        treasureHp:      newTreasureHp,
        heroesKilled:    state.heroesKilled    + (newDead    - prevDead),
        heroesEscapedWithGold: state.heroesEscapedWithGold + (newEscGold - prevEscGold),
        heroesEscapedEmpty:    state.heroesEscapedEmpty    + (newEscNone - prevEscNone),
        goldEarnedThisWave: state.goldEarnedThisWave + result.goldEarned,
        goldStolenThisWave: state.goldStolenThisWave + result.treasureDamage,
        bank:            state.bank + result.goldEarned,
        battleLog:       [...state.battleLog.slice(-30), ...newLog],
        attackFlashes:   activeFlashes,
      })

      // Handle boulder self-destruction (one-shot trap)
      const boulderEvents = result.events.filter(e => e.type === 'trap_triggered' && e.trap === 'boulder')
      if (boulderEvents.length > 0) {
        const newGrid = get().grid.map(r => [...r])
        boulderEvents.forEach(ev => {
          const [c, r] = ev.trapKey.split(',').map(Number)
          newGrid[r][c] = TILE.PATH
        })
        set({ grid: newGrid })
      }

      // ── Wave-end conditions ──
      // 1. Treasure destroyed — early wave end (bad outcome)
      if (newTreasureHp <= 0) { get().endWave(); return }

      // 2. All heroes resolved (dead or escaped)
      const waveOver = result.heroes.every(h =>
        h.spawned && (h.state === 'dead' || h.state === 'escaped')
      )
      if (waveOver) { get().endWave(); return }

      const rafId = requestAnimationFrame(loop)
      set({ simulationRef: rafId })
    }

    const rafId = requestAnimationFrame(loop)
    set({ simulationRef: rafId })
  },

  endWave() {
    const { simulationRef, waveIndex, unlockedTools } = get()
    if (simulationRef) cancelAnimationFrame(simulationRef)

    // Generate upgrade cards
    const locked   = DUNGEON_TOOLS.filter(t => !unlockedTools.includes(t.id))
    const shuffled = [...locked].sort(() => Math.random() - 0.5)
    const cards    = shuffled.slice(0, Math.min(3, shuffled.length)).map(tool => ({ type: 'unlock', tool }))
    // Gold reward scales with wave: 80g at wave 1, up to 200g at wave 14
    const goldReward = Math.min(80 + waveIndex * 12, 200)
    while (cards.length < 3) cards.push({ type: 'gold', amount: goldReward })

    set({
      phase:         PHASE.RESULTS,
      simulationRef: null,
      upgradeCards:  cards,
      gold:          WAVE_CONFIGS[waveIndex + 1]?.gold ?? 300,
      attackFlashes: [],
    })
  },

  pickUpgradeCard(card) {
    const { waveIndex, unlockedTools } = get()
    if (card.type === 'unlock') set({ unlockedTools: [...unlockedTools, card.tool.id] })
    else if (card.type === 'gold') set({ bank: get().bank + card.amount })

    const nextWaveIndex = waveIndex + 1
    const isLastWave    = nextWaveIndex >= WAVE_CONFIGS.length
    set({
      phase:      isLastWave ? PHASE.VICTORY : PHASE.PLAN,
      waveIndex:  nextWaveIndex,
      upgradeCards: [],
      heroes: [],
    })
  },
}))
