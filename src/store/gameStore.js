// ── Global Game Store ──
import { create } from 'zustand'
import {
  GRID_COLS, GRID_ROWS, TILE, DUNGEON_TOOLS,
  SELL_REFUND_RATE, BANK_COST_MULT, WAVE_CONFIGS,
  HERO_TYPES, DIFFICULTIES,
  PATH_ALL, PATH_SET, PATH_CENTER_SET, ENTRANCE, TREASURE,
} from '../game/constants.js'
import { createHero, simulationTick } from '../game/simulation.js'
import { audio } from '../audio/audioEngine.js'
import { getHeroCallout } from '../game/gerald.js'
import { writeSave, recordRunEnd, SAVE_SLOTS } from '../game/persistence.js'

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

  // Difficulty
  difficulty:     'medium',

  // Economy
  gold:           DIFFICULTIES.medium.startingGold,
  bank:           0,
  unlockedTools:  DUNGEON_TOOLS.filter(t => t.unlocked).map(t => t.id),

  // Wave progress
  waveIndex:      0,
  heroes:         [],
  trapTimers:     {},
  simulationRef:  null,

  // Wave stats — treasureMaxHp tracks the difficulty-specific ceiling for the HP bar ratio
  treasureMaxHp:  DIFFICULTIES.medium.treasureHp,
  treasureHp:     DIFFICULTIES.medium.treasureHp,
  heroesKilled:   0,
  heroesEscapedWithGold: 0,   // escaped AND had the treasure
  heroesEscapedEmpty:    0,   // got scared off / escaped without loot (edge case)
  goldEarnedThisWave:    0,
  goldStolenThisWave:    0,   // cumulative treasure damage dealt
  battleLog:      [],
  attackFlashes:  [],
  upgradeCards:   [],
  screenShake:    0,   // current shake intensity; consumed + decayed by DungeonGrid

  // Plan-phase analysis overlays (reset to false when wave starts)
  showPathPreview: false,
  showCoverageMap: false,

  // Layout import: if set when startGame() is called, this grid is used instead of makeInitialGrid()
  pendingLayout: null,

  currentWaveConfig: () => WAVE_CONFIGS[get().waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1],

  // ── Actions ────────────────────────────────────────────────────────────

  setDifficulty(id) {
    const diff = DIFFICULTIES[id] ?? DIFFICULTIES.medium
    set({ difficulty: id, treasureMaxHp: diff.treasureHp, treasureHp: diff.treasureHp })
  },

  startGame() {
    const diff    = DIFFICULTIES[get().difficulty] ?? DIFFICULTIES.medium
    const pending = get().pendingLayout
    set({
      phase: PHASE.PLAN,
      grid:  pending ?? makeInitialGrid(),
      gold:  diff.startingGold,
      bank:  0,
      waveIndex: 0,
      treasureMaxHp: diff.treasureHp,
      treasureHp:    diff.treasureHp,
      heroesKilled: 0,
      heroesEscapedWithGold: 0,
      heroesEscapedEmpty:    0,
      goldEarnedThisWave: 0,
      goldStolenThisWave: 0,
      battleLog: [],
      attackFlashes: [],
      unlockedTools: DUNGEON_TOOLS.filter(t => t.unlocked).map(t => t.id),
      pendingLayout: null,
    })
  },

  goToMenu() {
    const { phase, difficulty, waveIndex, heroesKilled, grid } = get()
    // Record stats whenever quitting an in-progress run (not from menu itself)
    if (phase !== PHASE.MENU && phase !== PHASE.VICTORY) {
      recordRunEnd({ difficulty, waveIndex, heroesKilled, grid })
    }
    set({ phase: PHASE.MENU })
  },

  triggerScreenShake(intensity) {
    set({ screenShake: intensity })
    // Reset one frame later so next shake of same intensity still fires subscription
    setTimeout(() => set({ screenShake: 0 }), 16)
  },
  selectTool(id)  { set({ selectedTool: id }) },
  selectCategory(cat) { set({ selectedCategory: cat, selectedTool: null }) },
  togglePathPreview()  { set(s => ({ showPathPreview: !s.showPathPreview })) },
  toggleCoverageMap()  { set(s => ({ showCoverageMap: !s.showCoverageMap })) },
  setPendingLayout(grid) { set({ pendingLayout: grid }) },

  // ── Restore from a saved game ──────────────────────────────────────────────
  loadGame(saveData) {
    set({
      phase:         PHASE.PLAN,
      difficulty:    saveData.difficulty,
      waveIndex:     saveData.waveIndex,
      grid:          saveData.grid,
      gold:          saveData.gold,
      bank:          saveData.bank,
      unlockedTools: saveData.unlockedTools,
      treasureHp:    saveData.treasureHp,
      treasureMaxHp: saveData.treasureMaxHp,
      // Per-wave stats reset; run history stays in localStorage
      heroesKilled:          0,
      heroesEscapedWithGold: 0,
      heroesEscapedEmpty:    0,
      goldEarnedThisWave:    0,
      goldStolenThisWave:    0,
      battleLog:     [],
      attackFlashes: [],
      upgradeCards:  [],
      heroes:        [],
      showPathPreview: false,
      showCoverageMap: false,
      pendingLayout:   null,
    })
  },

  placeTile(col, row) {
    const { grid, selectedTool, gold, unlockedTools, phase } = get()
    if (phase !== PHASE.PLAN) return   // plan phase only — use bankPlaceTile during waves
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
    audio.play('tile_placed')
  },

  // ── Emergency placement during waves — costs from bank at 1.5× ────────────
  bankPlaceTile(col, row) {
    const { grid, selectedTool, bank, unlockedTools, phase } = get()
    if (phase !== PHASE.WAVE) return   // wave phase only
    if (!selectedTool || !unlockedTools.includes(selectedTool)) return

    const cur = grid[row]?.[col]
    if (!cur || cur === TILE.ENTRANCE || cur === TILE.TREASURE) return

    const def = DUNGEON_TOOLS.find(t => t.id === selectedTool)
    if (!def) return

    const cost = Math.ceil(def.cost * BANK_COST_MULT)
    if (bank < cost) return

    const onCenterline = PATH_CENTER_SET.has(`${col},${row}`) ||
      [TILE.SPIKE, TILE.BOULDER, TILE.DOOR, TILE.LAVA].includes(cur)
    const anyPath = PATH_SET.has(`${col},${row}`)

    if (def.placesOn === 'path' && !onCenterline) return
    if (def.placesOn === 'open' && (anyPath || cur !== TILE.EMPTY)) return

    const newGrid = grid.map(r => [...r])
    newGrid[row][col] = selectedTool
    set({ grid: newGrid, bank: bank - cost })
    audio.play('tile_placed')
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
    audio.play('tile_removed')
  },

  startWave() {
    const { waveIndex } = get()
    const waveConfig = WAVE_CONFIGS[waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1]

    const diff     = DIFFICULTIES[get().difficulty] ?? DIFFICULTIES.medium
    const waveMult = waveConfig.hpMult ?? 1
    // effectiveMult: wave 1 is identical across all difficulties (waveMult=1 → result=1).
    // The gap widens in later waves where waveMult reaches 9.0 on hard.
    const effectiveMult = 1.0 + (waveMult - 1.0) * diff.hpScaling
    const heroes = waveConfig.heroes.map((heroId, i) =>
      createHero(HERO_TYPES[heroId], i, effectiveMult)
    )

    audio.play('wave_start')

    set({
      phase:         PHASE.WAVE,
      heroes,
      // Reset treasure HP to difficulty-correct ceiling each wave.
      treasureHp:    get().treasureMaxHp,
      heroesKilled:  0,
      heroesEscapedWithGold: 0,
      heroesEscapedEmpty:    0,
      battleLog: [`⚔ Wave ${waveIndex + 1}: ${waveConfig.label}`],
      goldEarnedThisWave: 0,
      goldStolenThisWave: 0,
      trapTimers: {},
      attackFlashes: [],
      showPathPreview: false,
      showCoverageMap: false,
    })

    let lastTime = performance.now()
    // Track which hero types have appeared this wave so callouts fire only once
    const seenHeroTypes = new Set()

    const loop = (now) => {
      const state = get()
      if (state.phase !== PHASE.WAVE) return

      const deltaMs = Math.min(now - lastTime, 100) // cap delta to avoid huge jumps
      lastTime = now

      const result = simulationTick(state.heroes, state.grid, deltaMs, state.trapTimers)

      // ── Audio + screen shake events ────────────────────────────────────────
      result.events.forEach(ev => {
        switch (ev.type) {
          case 'trap_triggered':
            if (ev.trap === 'boulder') {
              audio.play('boulder_crush')
              get().triggerScreenShake(4)
            } else {
              audio.play('spike_trigger')
            }
            break
          case 'trap_disarmed':
            audio.play('trap_disarmed')
            break
          case 'lava_damage':
            audio.play('lava_damage')
            break
          case 'hero_killed':
            audio.play('hero_death')
            break
          case 'treasure_reached':
            audio.play('gold_pickup')
            break
          case 'hero_escaped':
            if (ev.hadGold) {
              audio.play('hero_escaped_gold')
              get().triggerScreenShake(10)
            }
            break
          case 'tower_attack':
            audio.play(ev.towerType + '_fire')
            if (ev.towerType === 'troll') get().triggerScreenShake(5)
            break
          case 'curse_applied':
            audio.play('curse_applied')
            break
          default: break
        }
      })

      // Treasure damage — ominous warning + strong shake
      if (result.treasureDamage > 0) {
        audio.play('treasure_damaged')
        get().triggerScreenShake(8)
      }

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

      // Gerald hero-type callouts — fires once per hero type per wave
      result.heroes.forEach(h => {
        if (h.spawned && !seenHeroTypes.has(h.type)) {
          seenHeroTypes.add(h.type)
          const callout = getHeroCallout(h.type)
          if (callout) newLog.push(`💀 Gerald: ${callout}`)
        }
      })

      // Count state deltas
      const prevDead    = state.heroes.filter(h => h.state === 'dead').length
      const prevEscGold = state.heroes.filter(h => h.state === 'escaped' && h.hasGold).length
      const prevEscNone = state.heroes.filter(h => h.state === 'escaped' && !h.hasGold).length
      const newDead     = result.heroes.filter(h => h.state === 'dead').length
      const newEscGold  = result.heroes.filter(h => h.state === 'escaped' && h.hasGold).length
      const newEscNone  = result.heroes.filter(h => h.state === 'escaped' && !h.hasGold).length

      const newTreasureHp = Math.max(0, state.treasureHp - result.treasureDamage)

      // Enrich newly-dead heroes with deathStartTime so DungeonGrid can animate them
      const ts = performance.now()
      const enrichedHeroes = result.heroes.map(h => {
        if (h.state === 'dead') {
          const prev = state.heroes.find(p => p.id === h.id)
          if (prev && prev.state !== 'dead') return { ...h, deathStartTime: ts }
        }
        return h
      })

      // Attack flash events — include damage + cursed flag for floating numbers / tint
      const freshFlashes = result.events
        .filter(e => e.type === 'tower_attack')
        .map(e => ({
          fromX: e.fromX, fromY: e.fromY,
          toX: e.toX, toY: e.toY,
          towerType: e.towerType,
          tileCol: e.col, tileRow: e.row,
          damage: e.damage,
          cursed:  e.cursed,
          t: ts,
        }))
      // Keep flashes alive long enough for the longest animation (wraith rush ~700ms)
      const activeFlashes = [
        ...state.attackFlashes.filter(f => ts - f.t < 750),
        ...freshFlashes,
      ]

      set({
        heroes:          enrichedHeroes,
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
    const { simulationRef, waveIndex, unlockedTools, difficulty } = get()
    if (simulationRef) cancelAnimationFrame(simulationRef)
    audio.play('wave_cleared')

    const diff = DIFFICULTIES[difficulty] ?? DIFFICULTIES.medium

    // Generate upgrade cards
    const locked   = DUNGEON_TOOLS.filter(t => !unlockedTools.includes(t.id))
    const shuffled = [...locked].sort(() => Math.random() - 0.5)
    const cards    = shuffled.slice(0, Math.min(3, shuffled.length)).map(tool => ({ type: 'unlock', tool }))
    // Gold reward scales with wave AND difficulty
    const goldReward = Math.round(Math.min(80 + waveIndex * 12, 200) * diff.waveGoldMult)
    while (cards.length < 3) cards.push({ type: 'gold', amount: goldReward })

    // Apply waveGoldMult to the next wave's planning budget
    const baseGold = WAVE_CONFIGS[waveIndex + 1]?.gold ?? 300
    set({
      phase:         PHASE.RESULTS,
      simulationRef: null,
      upgradeCards:  cards,
      gold:          Math.round(baseGold * diff.waveGoldMult),
      attackFlashes: [],
    })
  },

  pickUpgradeCard(card) {
    const { waveIndex, unlockedTools } = get()
    if (card.type === 'unlock') {
      set({ unlockedTools: [...unlockedTools, card.tool.id] })
      audio.play('upgrade_unlock')
    } else if (card.type === 'gold') {
      set({ bank: get().bank + card.amount })
      audio.play('upgrade_gold')
    }

    const nextWaveIndex = waveIndex + 1
    const isLastWave    = nextWaveIndex >= WAVE_CONFIGS.length
    set({
      phase:        isLastWave ? PHASE.VICTORY : PHASE.PLAN,
      waveIndex:    nextWaveIndex,
      upgradeCards: [],
      heroes:       [],
    })

    const fresh = get()
    if (isLastWave) {
      // Run complete — record stats (don't auto-save; game is over)
      recordRunEnd({
        difficulty:    fresh.difficulty,
        waveIndex:     fresh.waveIndex,
        heroesKilled:  fresh.heroesKilled,
        grid:          fresh.grid,
      })
    } else {
      // Auto-save at the start of each new plan phase
      writeSave(SAVE_SLOTS.auto, fresh)
    }
  },
}))
