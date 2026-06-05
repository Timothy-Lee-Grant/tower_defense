// ── Global Game Store ──
import { create } from 'zustand'
import {
  GRID_COLS, GRID_ROWS, TILE, DUNGEON_TOOLS,
  SELL_REFUND_RATE, BANK_COST_MULT, WAVE_CONFIGS,
  HERO_TYPES, DIFFICULTIES, UPGRADE_TIERS,
  DUNGEON_LAYOUTS, CAMPAIGN_NODES, CAMPAIGN_MODIFIERS, buildLayoutData,
} from '../game/constants.js'
import { createHero, simulationTick } from '../game/simulation.js'
import { audio } from '../audio/audioEngine.js'
import { getHeroCallout } from '../game/gerald.js'
import {
  writeSave, recordRunEnd, SAVE_SLOTS,
  recordCampaignNode, readCampaignProgress, recordEndlessHigh, readEndlessHigh,
} from '../game/persistence.js'

// ── Layout-aware grid factory ──────────────────────────────────────────────
function makeGridFromLayout(layoutData) {
  const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(TILE.EMPTY))
  for (const pt of layoutData.pathAll) grid[pt.row][pt.col] = TILE.PATH
  grid[layoutData.entrance.row][layoutData.entrance.col] = TILE.ENTRANCE
  grid[layoutData.treasure.row][layoutData.treasure.col] = TILE.TREASURE
  return grid
}

export const PHASE = {
  MENU: 'menu', CAMPAIGN: 'campaign',
  PLAN: 'plan', WAVE: 'wave', RESULTS: 'results',
  VICTORY: 'victory', ENDLESS: 'endless_results',
}

// ── Store ──────────────────────────────────────────────────────────────────
const _defaultLayout     = buildLayoutData(DUNGEON_LAYOUTS[0])

export const useGameStore = create((set, get) => ({
  phase:          PHASE.MENU,

  // ── Layout / Campaign ──────────────────────────────────────────────────
  activeLayoutId:  'catacombs',
  layoutData:      _defaultLayout,
  campaignNodeId:  null,    // null = free play; string = active campaign node
  activeModifier:  'none',  // key into CAMPAIGN_MODIFIERS
  isEndlessMode:   false,
  endlessWave:     0,       // waves survived past the final WAVE_CONFIGS entry

  grid:           makeGridFromLayout(_defaultLayout),
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
  tileUpgrades:   {},   // "col,row" → tier (1 or 2)
  simulationRef:  null,

  // Wave stats — treasureMaxHp tracks the difficulty-specific ceiling for the HP bar ratio
  treasureMaxHp:  DIFFICULTIES.medium.treasureHp,
  treasureHp:     DIFFICULTIES.medium.treasureHp,
  heroesKilled:   0,
  runKills:       0,           // cumulative kills across all waves this run
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

  // ── Layout selection ────────────────────────────────────────────────────────
  selectLayout(layoutId) {
    const layout = DUNGEON_LAYOUTS.find(l => l.id === layoutId) ?? DUNGEON_LAYOUTS[0]
    const layoutData = buildLayoutData(layout)
    set({ activeLayoutId: layoutId, layoutData, grid: makeGridFromLayout(layoutData) })
  },

  // ── Campaign navigation ─────────────────────────────────────────────────────
  goToCampaign() { set({ phase: PHASE.CAMPAIGN }) },

  startCampaignNode(nodeId) {
    const node = CAMPAIGN_NODES.find(n => n.id === nodeId)
    if (!node) return
    const layout     = DUNGEON_LAYOUTS.find(l => l.id === node.layoutId) ?? DUNGEON_LAYOUTS[0]
    const layoutData = buildLayoutData(layout)
    const diff       = DIFFICULTIES[get().difficulty] ?? DIFFICULTIES.medium
    set({
      phase:           PHASE.PLAN,
      campaignNodeId:  nodeId,
      activeLayoutId:  node.layoutId,
      activeModifier:  node.modifier,
      layoutData,
      grid:            makeGridFromLayout(layoutData),
      gold:            diff.startingGold,
      bank:            0,
      waveIndex:       0,
      tileUpgrades:    {},
      isEndlessMode:   false,
      endlessWave:     0,
      treasureMaxHp:   diff.treasureHp,
      treasureHp:      diff.treasureHp,
      heroesKilled: 0, runKills: 0,
      heroesEscapedWithGold: 0, heroesEscapedEmpty: 0,
      goldEarnedThisWave: 0, goldStolenThisWave: 0,
      battleLog: [], attackFlashes: [],
      unlockedTools: DUNGEON_TOOLS.filter(t => t.unlocked).map(t => t.id),
      pendingLayout: null,
    })
  },

  // ── Endless mode ────────────────────────────────────────────────────────────
  startEndlessMode() {
    set({ isEndlessMode: true, endlessWave: 0, phase: PHASE.PLAN })
    // Re-enter plan phase so player can adjust before the next endless wave
    const { waveIndex } = get()
    const baseGold = WAVE_CONFIGS[WAVE_CONFIGS.length - 1]?.gold ?? 300
    const diff     = DIFFICULTIES[get().difficulty] ?? DIFFICULTIES.medium
    set({ gold: Math.round(baseGold * diff.waveGoldMult) })
  },

  startGame() {
    const diff       = DIFFICULTIES[get().difficulty] ?? DIFFICULTIES.medium
    const pending    = get().pendingLayout
    const layoutData = get().layoutData
    set({
      phase:          PHASE.PLAN,
      campaignNodeId: null,
      activeModifier: 'none',
      isEndlessMode:  false,
      endlessWave:    0,
      grid:  pending ?? makeGridFromLayout(layoutData),
      gold:  diff.startingGold,
      bank:  0,
      waveIndex: 0,
      tileUpgrades: {},
      treasureMaxHp: diff.treasureHp,
      treasureHp:    diff.treasureHp,
      heroesKilled: 0,
      runKills:     0,
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
    const { phase, difficulty, waveIndex, runKills, grid } = get()
    if (phase !== PHASE.MENU && phase !== PHASE.VICTORY && phase !== PHASE.CAMPAIGN) {
      recordRunEnd({ difficulty, waveIndex, heroesKilled: runKills, grid })
    }
    set({ phase: PHASE.MENU, campaignNodeId: null, activeModifier: 'none' })
  },

  triggerScreenShake(intensity) {
    set({ screenShake: intensity })
    setTimeout(() => set({ screenShake: 0 }), 16)
  },
  selectTool(id)  { set({ selectedTool: id }) },
  selectCategory(cat) { set({ selectedCategory: cat, selectedTool: null }) },
  togglePathPreview()  { set(s => ({ showPathPreview: !s.showPathPreview })) },
  toggleCoverageMap()  { set(s => ({ showCoverageMap: !s.showCoverageMap })) },
  setPendingLayout(grid) { set({ pendingLayout: grid }) },

  // ── Restore from a saved game ──────────────────────────────────────────────
  loadGame(saveData) {
    const layoutId   = saveData.activeLayoutId ?? 'catacombs'
    const layout     = DUNGEON_LAYOUTS.find(l => l.id === layoutId) ?? DUNGEON_LAYOUTS[0]
    const layoutData = buildLayoutData(layout)
    set({
      phase:          PHASE.PLAN,
      difficulty:     saveData.difficulty,
      waveIndex:      saveData.waveIndex,
      grid:           saveData.grid,
      activeLayoutId: layoutId,
      layoutData,
      campaignNodeId: saveData.campaignNodeId ?? null,
      activeModifier: saveData.activeModifier ?? 'none',
      isEndlessMode:  saveData.isEndlessMode ?? false,
      endlessWave:    saveData.endlessWave ?? 0,
      gold:          saveData.gold,
      bank:          saveData.bank,
      tileUpgrades:  saveData.tileUpgrades ?? {},
      unlockedTools: saveData.unlockedTools,
      treasureHp:    saveData.treasureHp,
      treasureMaxHp: saveData.treasureMaxHp,
      // Per-wave stats reset; run history stays in localStorage
      heroesKilled:          0,
      runKills:              0,
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

    const { pathSet, pathCenterSet } = get().layoutData
    const ON_PATH_TRAPS = [TILE.SPIKE, TILE.BOULDER, TILE.DOOR, TILE.LAVA,
                           TILE.PIT, TILE.PENDULUM, TILE.TAR, TILE.ELECTRIC, TILE.STASIS]
    const onCenterline = pathCenterSet.has(`${col},${row}`) || ON_PATH_TRAPS.includes(cur)
    const anyPath = pathSet.has(`${col},${row}`)

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
    if (phase !== PHASE.WAVE) return
    if (!selectedTool || !unlockedTools.includes(selectedTool)) return

    const cur = grid[row]?.[col]
    if (!cur || cur === TILE.ENTRANCE || cur === TILE.TREASURE) return

    const def = DUNGEON_TOOLS.find(t => t.id === selectedTool)
    if (!def) return

    const cost = Math.ceil(def.cost * BANK_COST_MULT)
    if (bank < cost) return

    const { pathSet, pathCenterSet } = get().layoutData
    const ON_PATH_TRAPS = [TILE.SPIKE, TILE.BOULDER, TILE.DOOR, TILE.LAVA,
                           TILE.PIT, TILE.PENDULUM, TILE.TAR, TILE.ELECTRIC, TILE.STASIS]
    const onCenterline = pathCenterSet.has(`${col},${row}`) || ON_PATH_TRAPS.includes(cur)
    const anyPath = pathSet.has(`${col},${row}`)

    if (def.placesOn === 'path' && !onCenterline) return
    if (def.placesOn === 'open' && (anyPath || cur !== TILE.EMPTY)) return

    const newGrid = grid.map(r => [...r])
    newGrid[row][col] = selectedTool
    set({ grid: newGrid, bank: bank - cost })
    audio.play('tile_placed')
  },

  removeTile(col, row) {
    const { grid, gold, tileUpgrades } = get()
    const tileId = grid[row]?.[col]
    if (!tileId || tileId === TILE.EMPTY || tileId === TILE.PATH ||
        tileId === TILE.ENTRANCE || tileId === TILE.TREASURE) return

    const def    = DUNGEON_TOOLS.find(t => t.id === tileId)
    const refund = def ? Math.floor(def.cost * SELL_REFUND_RATE) : 0
    const newGrid = grid.map(r => [...r])
    const { pathCenterSet } = get().layoutData
    newGrid[row][col] = pathCenterSet.has(`${col},${row}`) ? TILE.PATH : TILE.EMPTY
    const newUpgrades = { ...tileUpgrades }
    delete newUpgrades[`${col},${row}`]
    set({ grid: newGrid, gold: gold + refund, tileUpgrades: newUpgrades })
    audio.play('tile_removed')
  },

  upgradeTile(col, row) {
    const { grid, bank, tileUpgrades } = get()
    const tileId = grid[row]?.[col]
    if (!tileId) return

    const key         = `${col},${row}`
    const currentTier = tileUpgrades[key] ?? 0
    if (currentTier >= 2) return   // already at max tier

    const tiers = UPGRADE_TIERS[tileId]
    if (!tiers) return   // tile is not upgradeable

    const nextTier = currentTier + 1
    const tierDef  = tiers[nextTier - 1]   // tiers[0] = T2, tiers[1] = T3
    if (!tierDef) return

    if (bank < tierDef.cost) return   // not enough bank gold

    set({
      bank:         bank - tierDef.cost,
      tileUpgrades: { ...tileUpgrades, [key]: nextTier },
    })
    audio.play('upgrade_unlock')
  },

  startWave() {
    const { waveIndex, layoutData, activeModifier, isEndlessMode, endlessWave } = get()

    // ── Endless mode: generate wave beyond WAVE_CONFIGS ──────────────────────
    const isEndlessWave = waveIndex >= WAVE_CONFIGS.length
    const waveConfig = isEndlessWave
      ? {
          wave:   waveIndex + 1,
          hpMult: 9.0 * Math.pow(1.15, waveIndex - (WAVE_CONFIGS.length - 1)),
          gold:   600,
          label:  `Endless Wave ${waveIndex - WAVE_CONFIGS.length + 2}`,
          heroes: WAVE_CONFIGS[WAVE_CONFIGS.length - 1].heroes,   // repeat final composition
        }
      : (WAVE_CONFIGS[waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1])

    const diff     = DIFFICULTIES[get().difficulty] ?? DIFFICULTIES.medium
    const waveMult = waveConfig.hpMult ?? 1
    const effectiveMult = 1.0 + (waveMult - 1.0) * diff.hpScaling

    // ── Modifier: group_spawn — remove stagger delay ─────────────────────────
    const isGroupSpawn = activeModifier === 'group_spawn'
    // ── Modifier: hero_speed — apply speed multiplier ────────────────────────
    const speedMult = activeModifier === 'hero_speed' ? 1.25 : 1.0

    const heroes = waveConfig.heroes.map((heroId, i) => {
      const base = createHero(HERO_TYPES[heroId], isGroupSpawn ? 0 : i, effectiveMult, layoutData.pathTiles)
      if (speedMult !== 1.0) return { ...base, speed: base.speed * speedMult }
      // Modifier: thieves_disarm_all — thieves can disarm any on-path trap
      if (activeModifier === 'thieves_disarm_all' && heroId === 'thief')
        return { ...base, canDisarmAll: true }
      return base
    })

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

      const result = simulationTick(
        state.heroes, state.grid, deltaMs, state.trapTimers,
        state.tileUpgrades, state.layoutData.pathTiles
      )

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
        if (ev.type === 'trap_triggered') {
          const trapNames = { spike: 'spike plate', boulder: 'rolling boulder', pit: 'pit trap',
            pendulum: 'pendulum', electric: 'electric floor', stasis: 'stasis field' }
          return `⚡ ${ev.label} hit a ${trapNames[ev.trap] ?? ev.trap}`
        }
        if (ev.type === 'electric_chain')   return `⚡ Chain arc hit ${ev.label}!`
        if (ev.type === 'mimic_triggered')  return `📦 ${ev.label} stopped to investigate the chest.`
        if (ev.type === 'trap_disarmed')    return `🔓 ${ev.label} disarmed a trap`
        if (ev.type === 'curse_applied')    return ev.stacks === 3
          ? `👁️ ${ev.label} fully cursed — all damage +45%!`
          : `👁️ ${ev.label} cursed (stack ${ev.stacks}/3)`
        if (ev.type === 'engineer_disable') return `🔧 Engineer disabled tower at (${ev.col},${ev.row})!`
        if (ev.type === 'medic_revive_queued') return `➕ Medic queuing revival for ${ev.label}…`
        if (ev.type === 'medic_revived')    return `➕ ${ev.label} revived at 40% HP by the Medic!`
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
        heroesKilled:    state.heroesKilled + (newDead - prevDead),
        runKills:        state.runKills     + (newDead - prevDead),
        heroesEscapedWithGold: state.heroesEscapedWithGold + (newEscGold - prevEscGold),
        heroesEscapedEmpty:    state.heroesEscapedEmpty    + (newEscNone - prevEscNone),
        goldEarnedThisWave: state.goldEarnedThisWave + result.goldEarned,
        goldStolenThisWave: state.goldStolenThisWave + result.treasureDamage,
        bank:            state.bank + result.goldEarned,
        battleLog:       [...state.battleLog.slice(-30), ...newLog],
        attackFlashes:   activeFlashes,
      })

      // Handle boulder self-destruction (one-shot trap)
      // Iron Crusher (T3 boulder) has boulderRespawn — don't remove those
      const boulderEvents = result.events.filter(e => e.type === 'trap_triggered' && e.trap === 'boulder')
      if (boulderEvents.length > 0) {
        const currentUpgrades = get().tileUpgrades
        const newGrid = get().grid.map(r => [...r])
        boulderEvents.forEach(ev => {
          const [c, r] = ev.trapKey.split(',').map(Number)
          const upgradeTier = currentUpgrades[`${c},${r}`] ?? 0
          const effBoulder  = upgradeTier >= 2 ? null : true  // T3 respawns, don't remove
          if (upgradeTier < 2) newGrid[r][c] = TILE.PATH      // T1/T2: remove permanently
        })
        set({ grid: newGrid })
      }

      // Handle Blade Gauntlet / Death Corridor spike respawns
      if (result.spikeRespawns && result.spikeRespawns.length > 0) {
        const newGrid = get().grid.map(r => [...r])
        result.spikeRespawns.forEach(({ col: c, row: r }) => {
          newGrid[r][c] = TILE.SPIKE
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
    const { simulationRef, waveIndex, unlockedTools, difficulty, isEndlessMode } = get()
    if (simulationRef) cancelAnimationFrame(simulationRef)
    audio.play('wave_cleared')

    const diff = DIFFICULTIES[difficulty] ?? DIFFICULTIES.medium

    // Generate upgrade cards
    const locked   = DUNGEON_TOOLS.filter(t => !unlockedTools.includes(t.id))
    const shuffled = [...locked].sort(() => Math.random() - 0.5)
    const cards    = shuffled.slice(0, Math.min(3, shuffled.length)).map(tool => ({ type: 'unlock', tool }))
    const goldReward = Math.round(Math.min(80 + waveIndex * 12, 200) * diff.waveGoldMult)
    while (cards.length < 3) cards.push({ type: 'gold', amount: goldReward })

    const isLastDefinedWave = waveIndex + 1 >= WAVE_CONFIGS.length
    const baseGold = isEndlessMode || isLastDefinedWave
      ? 600
      : Math.round((WAVE_CONFIGS[waveIndex + 1]?.gold ?? 300) * diff.waveGoldMult)

    set({
      phase:         PHASE.RESULTS,
      simulationRef: null,
      upgradeCards:  cards,
      gold:          baseGold,
      attackFlashes: [],
    })
  },

  pickUpgradeCard(card) {
    const { waveIndex, unlockedTools, isEndlessMode, campaignNodeId,
            treasureHp, treasureMaxHp, runKills } = get()
    if (card.type === 'unlock') {
      set({ unlockedTools: [...unlockedTools, card.tool.id] })
      audio.play('upgrade_unlock')
    } else if (card.type === 'gold') {
      set({ bank: get().bank + card.amount })
      audio.play('upgrade_gold')
    }

    const nextWaveIndex    = waveIndex + 1
    const isLastDefinedWave = nextWaveIndex >= WAVE_CONFIGS.length

    // If in endless mode, keep going forever
    if (isEndlessMode) {
      const endlessWavesAdded = nextWaveIndex - WAVE_CONFIGS.length + 1
      recordEndlessHigh(endlessWavesAdded)
      set({ phase: PHASE.PLAN, waveIndex: nextWaveIndex, upgradeCards: [], heroes: [],
            endlessWave: endlessWavesAdded })
      writeSave(SAVE_SLOTS.auto, get())
      return
    }

    if (isLastDefinedWave) {
      // Run complete — record stats and campaign progress
      const fresh = get()
      recordRunEnd({ difficulty: fresh.difficulty, waveIndex: nextWaveIndex,
                     heroesKilled: fresh.runKills, grid: fresh.grid })
      // Campaign: evaluate stars for this node
      if (campaignNodeId) {
        const node = CAMPAIGN_NODES.find(n => n.id === campaignNodeId)
        if (node) {
          const runState = { waveIndex: nextWaveIndex, treasureHp, treasureMaxHp, runKills }
          let stars = 0
          for (let si = 0; si < node.starConditions.length; si++) {
            if (node.starConditions[si](runState)) stars = si + 1
          }
          recordCampaignNode(campaignNodeId, stars)
        }
      }
      set({ phase: PHASE.VICTORY, waveIndex: nextWaveIndex, upgradeCards: [], heroes: [] })
    } else {
      set({ phase: PHASE.PLAN, waveIndex: nextWaveIndex, upgradeCards: [], heroes: [] })
      writeSave(SAVE_SLOTS.auto, get())
    }
  },
}))
