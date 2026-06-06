// ── Global Game Store ──
import { create } from 'zustand'
import {
  GRID_COLS, GRID_ROWS, TILE, DUNGEON_TOOLS,
  SELL_REFUND_RATE, BANK_COST_MULT, WAVE_CONFIGS,
  HERO_TYPES, DIFFICULTIES, UPGRADE_TIERS, BOSS_TYPES,
  DUNGEON_LAYOUTS, CAMPAIGN_NODES, CAMPAIGN_MODIFIERS, buildLayoutData,
  HERO_SPAWN_STAGGER_MS,
} from '../game/constants.js'
import { createHero, createBossHero, simulationTick } from '../game/simulation.js'
import { audio } from '../audio/audioEngine.js'
import { getHeroCallout } from '../game/gerald.js'
import { getEventForWave, getRandomEvent, GLOBAL_EVENTS } from '../game/globalEvents.js'
import {
  writeSave, recordRunEnd, SAVE_SLOTS,
  recordCampaignNode, readCampaignProgress, recordEndlessHigh, readEndlessHigh,
} from '../game/persistence.js'

// ── Feature 14.1: Combo definitions ──────────────────────────────────────────
// Each entry is checked against each hero_killed event in the RAF loop.
// `complexity` determines which combo "wins" when multiple apply to the same kill.
const COMBO_DEFS = [
  // ── Multi-status ultimate combos (highest complexity) ─────────────────────
  {
    id: 'triple_threat',
    check: (ev) => ev.poisoned && ev.curseStacks >= 2 && ev.slowed && ev.killedBy === 'tower',
    label: '☠️👁️❄ Triple Threat — poisoned, cursed, slowed. A truly bleak ending.',
    bonus: 30,
    complexity: 5,
  },
  // ── Two-status combos ─────────────────────────────────────────────────────
  {
    id: 'corrupted',
    check: (ev) => ev.poisoned && ev.curseStacks >= 1 && ev.killedBy === 'tower',
    label: '☠️👁️ Corrupted! The most miserable death possible.',
    bonus: 20,
    complexity: 3,
  },
  {
    id: 'drained_helpless',
    check: (ev) => ev.maxHpDrained && ev.slowed && ev.killedBy === 'tower',
    label: '🦇❄ Drained and Helpless — max HP sapped, body slowed, spirit broken.',
    bonus: 20,
    complexity: 3,
  },
  // ── Named single-synergy combos ───────────────────────────────────────────
  {
    id: 'frozen_hellfire',
    check: (ev) => ev.slowed && ev.killTowerType === TILE.FIRE,
    label: '❄🔥 Frozen Hellfire! Slowed then incinerated.',
    bonus: 15,
    complexity: 2,
  },
  {
    id: 'ambush',
    check: (ev) => ev.killTowerType === TILE.SHADOW && ev.hadGold,
    label: '🌑💰 Ambushed on the return trip! Gold secured.',
    bonus: 15,
    complexity: 2,
  },
  {
    id: 'pinned',
    check: (ev) => ev.slowed && ev.killTowerType === TILE.DART,
    label: '❄🏹 Pinned! Slowed and skewered mid-corridor.',
    bonus: 10,
    complexity: 2,
  },
  {
    id: 'cursed_gargoyle',
    check: (ev) => ev.curseStacks >= 2 && ev.killTowerType === TILE.GARGOYLE,
    label: '👁️🦅 Curse-Amplified Strike! Gargoyle hit for maximum bonus damage.',
    bonus: 15,
    complexity: 2,
  },
]

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

  // ── Global Events state ────────────────────────────────────────────────
  activeGlobalEvent:  null,   // current GLOBAL_EVENTS entry or null
  showEventOverlay:   false,  // show dramatic announcement popup
  caveInTiles:        [],     // [{col,row}] — off-path towers that will collapse mid-wave
  holyGroundZone:     null,   // {minCol,minRow,maxCol,maxRow} — no-placement zone this wave

  // ── Boss Heroes (feature 12) ──────────────────────────────────────────────
  bossSpawnedThisWave:       false,  // prevent double-spawn
  activeBossName:            null,   // shown as nameplate in HUD while boss is alive
  bossEntranceFanfareEnd:    0,      // performance.now() timestamp when fanfare ends
  bossEntranceFanfareColor:  null,   // color of canvas flash

  // ── Dark Lord's Demands (feature 11) ──────────────────────────────────────
  darkLordDemandMet:         null,   // null=pending, true/false after endWave()
  firstHeroKilledType:       null,   // hero type of the first kill this wave
  trapKillsThisWave:         0,      // heroes killed by on-path traps / DoT (killedBy:'path')
  magesEscapedThisWave:      0,      // mage heroes who escaped (any state) this wave
  heroesReachedTreasureCount: 0,     // heroes who grabbed the gold (treasure_reached events)
  trollAttackedThisWave:     false,  // troll fired at least once this wave
  waveElapsedMs:             0,      // total ms since wave start (for speed-run demand)
  totalGridCost:             0,      // sum of tool costs on grid at wave end (gold_efficiency)

  // ── Feature 14: Combo + Synergy tracking ─────────────────────────────────
  bestComboThisWave: null,   // { label: string, heroLabel: string, complexity: number }

  // ── Feature 13: Hero AI Adaptations ──────────────────────────────────────
  // Persists across waves for the lifetime of a run.
  heroMemory: {
    trapTriggersByTile:  {},  // "col,row" → cumulative trigger count (all waves)
    warlordDestroyCount: 0,   // warlord trap-disarms across all waves
  },

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
      activeGlobalEvent: null, showEventOverlay: false, caveInTiles: [], holyGroundZone: null,
      heroMemory: { trapTriggersByTile: {}, warlordDestroyCount: 0 },
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
      activeGlobalEvent: null, showEventOverlay: false, caveInTiles: [], holyGroundZone: null,
      heroMemory: { trapTriggersByTile: {}, warlordDestroyCount: 0 },
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
      activeGlobalEvent: null, showEventOverlay: false, caveInTiles: [], holyGroundZone: null,
      heroMemory: saveData.heroMemory ?? { trapTriggersByTile: {}, warlordDestroyCount: 0 },
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
    const { grid, selectedTool, bank, unlockedTools, phase, holyGroundZone } = get()
    if (phase !== PHASE.WAVE) return
    if (!selectedTool || !unlockedTools.includes(selectedTool)) return

    const cur = grid[row]?.[col]
    if (!cur || cur === TILE.ENTRANCE || cur === TILE.TREASURE) return

    // Holy Ground event: block emergency placements in the blessed zone
    if (holyGroundZone) {
      const { minCol, minRow, maxCol, maxRow } = holyGroundZone
      if (col >= minCol && col <= maxCol && row >= minRow && row <= maxRow) return
    }

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

  // ── Spawn boss after regular heroes resolve ────────────────────────────────
  spawnBoss(bossId) {
    const { waveIndex, heroes, layoutData } = get()
    const bossType = BOSS_TYPES[bossId]
    if (!bossType) return

    const waveConfig     = WAVE_CONFIGS[waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1]
    const diff           = DIFFICULTIES[get().difficulty] ?? DIFFICULTIES.medium
    const hpMult         = waveConfig.hpMult ?? 1
    const effectiveMult  = 1.0 + (hpMult - 1.0) * diff.hpScaling
    const boss           = createBossHero(bossType, effectiveMult, layoutData.pathTiles)
    const now            = performance.now()

    get().triggerScreenShake(6)
    audio.play('wave_start')   // dramatic entrance sting

    set({
      bossSpawnedThisWave:       true,
      activeBossName:            bossType.name,
      bossEntranceFanfareEnd:    now + 1200,
      bossEntranceFanfareColor:  bossType.auraColor,
      heroes: [...heroes, boss],
      battleLog: [
        ...get().battleLog.slice(-26),
        '══════════════════════════════',
        `👑  ${bossType.name.toUpperCase()}`,
        `💀  ${bossType.entranceDialogue}`,
        '══════════════════════════════',
      ],
    })
  },

  // ── Feature 13: commit wave AI observations into heroMemory ───────────────
  // Called from within the RAF loop right before endWave() so closure data is fresh.
  _finalizeWaveAI(waveTrapTriggers, waveWarlordDisarms) {
    const { heroMemory } = get()
    const updated = { ...heroMemory.trapTriggersByTile }
    Object.entries(waveTrapTriggers).forEach(([key, count]) => {
      updated[key] = (updated[key] ?? 0) + count
    })
    set({
      heroMemory: {
        trapTriggersByTile:  updated,
        warlordDestroyCount: heroMemory.warlordDestroyCount + waveWarlordDisarms,
      },
    })
  },

  startWave() {
    const { waveIndex, layoutData, activeModifier, isEndlessMode, endlessWave, grid } = get()

    // ── Endless mode: generate wave beyond WAVE_CONFIGS ──────────────────────
    const isEndlessWave = waveIndex >= WAVE_CONFIGS.length
    const waveConfig = isEndlessWave
      ? {
          wave:   waveIndex + 1,
          hpMult: 9.0 * Math.pow(1.15, waveIndex - (WAVE_CONFIGS.length - 1)),
          gold:   600,
          label:  `Endless Wave ${waveIndex - WAVE_CONFIGS.length + 2}`,
          heroes: WAVE_CONFIGS[WAVE_CONFIGS.length - 1].heroes,
        }
      : (WAVE_CONFIGS[waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1])

    const diff     = DIFFICULTIES[get().difficulty] ?? DIFFICULTIES.medium
    const waveMult = waveConfig.hpMult ?? 1
    const effectiveMult = 1.0 + (waveMult - 1.0) * diff.hpScaling

    // ── Determine global event for this wave ──────────────────────────────────
    const globalEvent = isEndlessWave
      ? (Math.random() < 0.6 ? getRandomEvent() : null)   // 60% chance in endless
      : getEventForWave(waveIndex)

    // ── Prepare cave-in tiles ─────────────────────────────────────────────────
    let caveInTiles = []
    if (globalEvent?.id === 'cave_in') {
      const offPathTowers = []
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const tId = grid[r]?.[c]
          if (!tId) continue
          const def = DUNGEON_TOOLS.find(t => t.id === tId && t.placesOn === 'open')
          if (def) offPathTowers.push({ col: c, row: r })
        }
      }
      // Shuffle and pick up to 3
      for (let i = offPathTowers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [offPathTowers[i], offPathTowers[j]] = [offPathTowers[j], offPathTowers[i]]
      }
      caveInTiles = offPathTowers.slice(0, 3)
    }

    // ── Prepare holy ground zone ──────────────────────────────────────────────
    let holyGroundZone = null
    if (globalEvent?.id === 'holy_ground') {
      const minCol = Math.floor(Math.random() * (GRID_COLS - 3))
      const minRow = Math.floor(Math.random() * (GRID_ROWS - 3))
      holyGroundZone = { minCol, minRow, maxCol: minCol + 2, maxRow: minRow + 2 }
    }

    // ── Modifier: group_spawn — remove stagger delay ─────────────────────────
    const isGroupSpawn = activeModifier === 'group_spawn'
    // ── Modifier: hero_speed — apply speed multiplier ────────────────────────
    const speedMult = activeModifier === 'hero_speed' ? 1.25 : 1.0

    // ── Feature 13: Hero AI Adaptations — derive per-wave context ─────────────
    const { heroMemory } = get()

    // 13.1: Build set of "memorized" trap tiles (3+ cumulative triggers, wave 6+)
    const memorizedDangerKeys = new Set()
    if (waveIndex >= 5) {
      Object.entries(heroMemory.trapTriggersByTile).forEach(([key, count]) => {
        if (count >= 3) memorizedDangerKeys.add(key)
      })
    }

    // 13.2: Warlord speed boost — if Warlords have destroyed 3+ traps across prior waves
    const warlordSpeedBoostActive = heroMemory.warlordDestroyCount >= 3

    // ── Apply global event hero modifiers ─────────────────────────────────────
    const heroIds = [...waveConfig.heroes]
    // wrong_dungeon: first 3 heroes flee immediately
    const wrongDungeonCount = globalEvent?.id === 'wrong_dungeon' ? 3 : 0

    const heroes = heroIds.map((heroId, i) => {
      let base = createHero(HERO_TYPES[heroId], isGroupSpawn ? 0 : i, effectiveMult, layoutData.pathTiles)

      // Campaign modifier overrides
      if (speedMult !== 1.0) base = { ...base, speed: base.speed * speedMult }
      if (activeModifier === 'thieves_disarm_all' && heroId === 'thief')
        base = { ...base, canDisarmAll: true }

      // ── Global event hero mods ──────────────────────────────────────────
      if (globalEvent?.id === 'heroes_motivated')
        base = { ...base, speed: base.speed * 1.3 }

      if (globalEvent?.id === 'shield_potion')
        base = { ...base, shieldHp: 150 }

      if (globalEvent?.id === 'blessed') {
        base = {
          ...base,
          selfHealRate:  base.selfHealRate  * 2,
          partyHealRate: base.partyHealRate * 2,
          healAmount:    base.healAmount    * 2,
        }
      }

      if (globalEvent?.id === 'know_the_way')
        base = { ...base, doorImmune: true }   // checked in simulation doorSlow logic

      if (globalEvent?.id === 'armored_up')
        base = { ...base, damageReduction: Math.min(0.9, (base.damageReduction ?? 0) + 0.2) }

      // wrong_dungeon: first N heroes flee immediately (spawnDelay = 0, flagged to escape)
      if (i < wrongDungeonCount)
        base = { ...base, wrongDungeon: true }

      // ── Feature 13.1: memorized danger speed boost ──────────────────────
      if (memorizedDangerKeys.size > 0)
        base = { ...base, memorizedDangerKeys }

      // ── Feature 13.2: Warlord speed boost after 3+ cumulative disarms ──
      if (warlordSpeedBoostActive && heroId === 'warlord')
        base = { ...base, speed: base.speed * 1.2 }

      // ── Feature 13.3: Healer clustering (wave 8+) ──────────────────────
      // Paladins and Clerics always spawn right after the first hero,
      // regardless of their position in the wave array.
      if (!isGroupSpawn && waveIndex >= 7 && (heroId === 'paladin' || heroId === 'cleric') && i > 0)
        base = { ...base, spawnDelay: HERO_SPAWN_STAGGER_MS }

      // ── Feature 13.4: Scout designation (wave 9+, first hero only) ─────
      if (waveIndex >= 8 && i === 0)
        base = { ...base, isScout: true }

      return base
    })

    audio.play('wave_start')

    // Build initial battle log with event announcement
    const initLog = [`⚔ Wave ${waveIndex + 1}: ${waveConfig.label}`]
    if (globalEvent) {
      initLog.push(`${globalEvent.emoji} EVENT: ${globalEvent.name} — ${globalEvent.description}`)
    }

    // ── Feature 13: announce active AI adaptations ─────────────────────────────
    if (memorizedDangerKeys.size > 0) {
      initLog.push(
        `🧠 Intel: Heroes have learned from prior waves — they rush through ${memorizedDangerKeys.size} trap zone${memorizedDangerKeys.size !== 1 ? 's' : ''} at increased speed.`
      )
    }
    if (warlordSpeedBoostActive && heroIds.includes('warlord')) {
      initLog.push(
        `🪖 Warlord adaptation: Veteran Warlords charge trapped corridors faster after clearing them repeatedly.`
      )
    }

    set({
      phase:           PHASE.WAVE,
      heroes,
      treasureHp:      get().treasureMaxHp,
      heroesKilled:    0,
      heroesEscapedWithGold: 0,
      heroesEscapedEmpty:    0,
      battleLog:       initLog,
      goldEarnedThisWave: 0,
      goldStolenThisWave: 0,
      trapTimers:      {},
      attackFlashes:   [],
      showPathPreview: false,
      showCoverageMap: false,
      // Global event state
      activeGlobalEvent: globalEvent,
      showEventOverlay:  globalEvent ? true : false,
      caveInTiles,
      holyGroundZone,
      // Boss Heroes — reset for this wave
      bossSpawnedThisWave:        false,
      activeBossName:             null,
      bossEntranceFanfareEnd:     0,
      bossEntranceFanfareColor:   null,
      // Dark Lord's Demands — reset tracking for this wave
      darkLordDemandMet:          null,
      firstHeroKilledType:        null,
      trapKillsThisWave:          0,
      magesEscapedThisWave:       0,
      heroesReachedTreasureCount: 0,
      trollAttackedThisWave:      false,
      waveElapsedMs:              0,
      totalGridCost:              0,
      // Feature 14: reset combo tracking
      bestComboThisWave:          null,
    })

    // Auto-dismiss overlay after 3.5 seconds
    if (globalEvent) {
      setTimeout(() => set({ showEventOverlay: false }), 3500)
    }

    let lastTime = performance.now()
    // Track which hero types have appeared this wave so callouts fire only once
    const seenHeroTypes = new Set()

    // ── Feature 13: AI memory tracking for this wave (closure-local) ──────────
    const scoutObservedKeys = new Set()   // trap tiles the Scout has triggered
    const waveTrapTriggers  = {}          // trapKey → trigger count this wave
    let   waveWarlordDisarms = 0          // warlord trap disarms this wave

    // ── Per-wave event timing state (captured in closure) ─────────────────────
    let waveElapsed = 0              // total ms elapsed since wave start
    let caveInFired = false          // has cave-in collapse happened yet
    const caveInDelay = 6000 + Math.random() * 8000  // 6–14 seconds
    let geraldSpeechFired = false    // has gerald_speech pause started
    const geraldSpeechDelay = 7000 + Math.random() * 5000  // 7–12 seconds
    let geraldSpeechEnd = 0          // abs timestamp when speech pause ends
    const nextTremorAt = { t: 4000 + Math.random() * 4000 } // first tremor after 4–8s

    const loop = (now) => {
      const state = get()
      if (state.phase !== PHASE.WAVE) return

      let deltaMs = Math.min(now - lastTime, 100) // cap delta to avoid huge jumps
      lastTime = now
      waveElapsed += deltaMs

      // ── Gerald's speech pause: freeze all heroes for 3 s ─────────────────────
      const activeEvent = state.activeGlobalEvent
      if (activeEvent?.id === 'gerald_speech') {
        if (!geraldSpeechFired && waveElapsed >= geraldSpeechDelay) {
          geraldSpeechFired = true
          geraldSpeechEnd   = now + 3000
          const speechLog = `💀 Gerald: "${activeEvent.geraldLine.replace(/^"/, '').replace(/"$/, '')}"`
          set({ battleLog: [...state.battleLog.slice(-28), '🛑 ALL HEROES STOP! Gerald demands your attention.', speechLog] })
          audio.play('wave_start')   // dramatic sting
        }
        if (now < geraldSpeechEnd) {
          // During the speech pause, skip simulation (heroes frozen)
          const rafId = requestAnimationFrame(loop)
          set({ simulationRef: rafId })
          return
        }
      }

      // ── Cave-in: collapse off-path towers mid-wave ────────────────────────────
      if (activeEvent?.id === 'cave_in' && !caveInFired && waveElapsed >= caveInDelay) {
        caveInFired = true
        const tiles = get().caveInTiles
        if (tiles.length > 0) {
          const newGrid = get().grid.map(r => [...r])
          const newUpgrades = { ...get().tileUpgrades }
          tiles.forEach(({ col, row }) => {
            newGrid[row][col] = TILE.EMPTY
            delete newUpgrades[`${col},${row}`]
          })
          set({ grid: newGrid, tileUpgrades: newUpgrades, caveInTiles: [] })
          get().triggerScreenShake(6)
          set({ battleLog: [...get().battleLog.slice(-28), '💥 CAVE-IN! Three structures have collapsed!'] })
        }
      }

      // ── Tremors: random screen shakes ────────────────────────────────────────
      if (activeEvent?.id === 'tremors' && waveElapsed >= nextTremorAt.t) {
        get().triggerScreenShake(3 + Math.random() * 4)
        nextTremorAt.t = waveElapsed + 3000 + Math.random() * 5000  // next tremor in 3–8 s
      }

      const result = simulationTick(
        state.heroes, state.grid, deltaMs, state.trapTimers,
        state.tileUpgrades, state.layoutData.pathTiles, activeEvent,
        { scoutObservedKeys }   // feature 13 — scout observations for non-scout DR
      )

      // ── Feature 13: update AI tracking from this tick's events ───────────────
      result.events.forEach(ev => {
        if (ev.type === 'scout_observed_trap') {
          scoutObservedKeys.add(ev.trapKey)
        } else if (ev.type === 'trap_triggered') {
          waveTrapTriggers[ev.trapKey] = (waveTrapTriggers[ev.trapKey] ?? 0) + 1
        } else if (ev.type === 'trap_disarmed' && ev.heroType === 'warlord') {
          waveWarlordDisarms++
        }
      })

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
          if (ev.isBoss && ev.bossLine) return ev.bossLine
          return ev.hadGold
            ? `⚔️ ${ev.label} slain while fleeing! (+${ev.gold}g)`
            : `⚔️ ${ev.label} defeated (+${ev.gold}g)`
        }
        if (ev.type === 'treasure_reached') return `💰 ${ev.label} grabbed the gold — heading back!`
        if (ev.type === 'hero_escaped') {
          if (ev.isBoss && ev.bossLine) return ev.bossLine
          if (ev.wrongDungeon) return `🗺️ ${ev.label} left immediately. Wrong dungeon.`
          return ev.hadGold
            ? `🏃 ${ev.label} escaped WITH the gold!`
            : `💨 ${ev.label} fled empty-handed.`
        }
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

      // ── Feature 14.1: Combo detection ────────────────────────────────────
      // Count per-tick AoE kills for multi-kill combo checks
      const trollKillsThisTick  = result.events.filter(e => e.type === 'hero_killed' && e.killTowerType === TILE.TROLL).length
      const boulderTriggers     = result.events.filter(e => e.type === 'trap_triggered' && e.trap === 'boulder').length

      const comboLogEntries  = []
      let   comboBonusGold   = 0
      let   newBestCombo     = state.bestComboThisWave

      result.events.forEach(ev => {
        if (ev.type !== 'hero_killed') return

        // Find highest-complexity combo that applies to this kill
        const match = COMBO_DEFS
          .filter(c => c.check(ev))
          .sort((a, b) => b.complexity - a.complexity)[0]

        if (match) {
          comboLogEntries.push(`⚡ ${match.label} (+${match.bonus}g)`)
          comboBonusGold += match.bonus
          if (!newBestCombo || match.complexity > newBestCombo.complexity) {
            newBestCombo = { label: match.label, heroLabel: ev.label, complexity: match.complexity }
          }
        }
      })

      // Multi-kill combos (not tied to a single hero_killed event)
      if (trollKillsThisTick >= 3) {
        comboLogEntries.push(`🧌 Troll Rampage! ${trollKillsThisTick} heroes flattened simultaneously. (+25g)`)
        comboBonusGold += 25
        const rampageCombo = { label: '🧌 Troll Rampage!', heroLabel: `${trollKillsThisTick}×`, complexity: 4 }
        if (!newBestCombo || rampageCombo.complexity > newBestCombo.complexity) newBestCombo = rampageCombo
      }
      if (boulderTriggers >= 2) {
        comboLogEntries.push(`🪨 Double Crush! Boulder caught ${boulderTriggers} heroes. (+10g)`)
        comboBonusGold += 10
        const crushCombo = { label: '🪨 Double Crush!', heroLabel: `${boulderTriggers}×`, complexity: 2 }
        if (!newBestCombo || crushCombo.complexity > newBestCombo.complexity) newBestCombo = crushCombo
      }

      // ── Dark Lord's Demands — accumulate tracking fields ──────────────────
      let newFirstKill    = state.firstHeroKilledType
      let newTrapKills    = state.trapKillsThisWave
      let newTrollAtk     = state.trollAttackedThisWave
      let newReachedTreasure = state.heroesReachedTreasureCount
      let newMagesEscaped = state.magesEscapedThisWave

      result.events.forEach(ev => {
        if (ev.type === 'hero_killed') {
          if (newFirstKill === null) newFirstKill = ev.heroType
          if (ev.killedBy === 'path') newTrapKills++
        }
        if (ev.type === 'tower_attack' && ev.towerType === 'troll') newTrollAtk = true
        if (ev.type === 'treasure_reached') newReachedTreasure++
        if (ev.type === 'hero_escaped' && !ev.wrongDungeon) {
          const escapedHero = result.heroes.find(h => h.id === ev.hero)
          if (escapedHero?.type === 'mage') newMagesEscaped++
        }
      })

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
        bank:            state.bank + result.goldEarned + comboBonusGold,
        battleLog:       [...state.battleLog.slice(-30), ...newLog, ...comboLogEntries],
        bestComboThisWave: newBestCombo,
        attackFlashes:   activeFlashes,
        // Demand tracking
        firstHeroKilledType:       newFirstKill,
        trapKillsThisWave:         newTrapKills,
        trollAttackedThisWave:     newTrollAtk,
        heroesReachedTreasureCount: newReachedTreasure,
        magesEscapedThisWave:      newMagesEscaped,
        waveElapsedMs:             waveElapsed,
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

      // Handle Iron Crusher (T3 boulder) respawns
      if (result.boulderRespawns && result.boulderRespawns.length > 0) {
        const newGrid = get().grid.map(r => [...r])
        result.boulderRespawns.forEach(({ col: c, row: r }) => {
          newGrid[r][c] = TILE.BOULDER
        })
        set({ grid: newGrid })
      }

      // ── Boss entrance announcements in battle log ────────────────────────
      result.events.forEach(ev => {
        if (ev.type === 'boss_enraged') {
          set({ battleLog: [...get().battleLog.slice(-28),
            `🔥 ${ev.label} ENRAGES! Speed doubled — treasure damage tripled!`,
          ]})
          get().triggerScreenShake(8)
          audio.play('boulder_crush')
        }
      })

      // ── Boss spawn check: when all regular heroes resolve ─────────────────
      const currentState  = get()
      const bossConfig    = isEndlessWave ? null : waveConfig?.boss
      const regularHeroes = result.heroes.filter(h => !h.isBoss)
      const regularDone   = regularHeroes.length > 0 &&
        regularHeroes.every(h => h.spawned && (h.state === 'dead' || h.state === 'escaped'))

      if (regularDone && bossConfig && !currentState.bossSpawnedThisWave) {
        get().spawnBoss(bossConfig.id)
        const rafId = requestAnimationFrame(loop)
        set({ simulationRef: rafId })
        return
      }

      // ── Clear boss nameplate when boss resolves ───────────────────────────
      if (currentState.activeBossName) {
        const boss = result.heroes.find(h => h.isBoss)
        if (boss && (boss.state === 'dead' || boss.state === 'escaped')) {
          set({ activeBossName: null })
        }
      }

      // ── Wave-end conditions ──
      // 1. Treasure destroyed — early wave end (bad outcome)
      if (newTreasureHp <= 0) {
        get()._finalizeWaveAI(waveTrapTriggers, waveWarlordDisarms)
        get().endWave(); return
      }

      // 2. All heroes resolved (dead or escaped) — includes boss if spawned
      const waveOver = result.heroes.every(h =>
        h.spawned && (h.state === 'dead' || h.state === 'escaped')
      )
      if (waveOver) {
        get()._finalizeWaveAI(waveTrapTriggers, waveWarlordDisarms)
        get().endWave(); return
      }

      const rafId = requestAnimationFrame(loop)
      set({ simulationRef: rafId })
    }

    const rafId = requestAnimationFrame(loop)
    set({ simulationRef: rafId })
  },

  endWave() {
    const { simulationRef, waveIndex, unlockedTools, difficulty, isEndlessMode, grid } = get()
    if (simulationRef) cancelAnimationFrame(simulationRef)
    audio.play('wave_cleared')
    // Clear global event + boss state between waves
    set({
      activeGlobalEvent: null, showEventOverlay: false, caveInTiles: [], holyGroundZone: null,
      activeBossName: null, bossEntranceFanfareEnd: 0, bossEntranceFanfareColor: null,
    })

    const diff = DIFFICULTIES[difficulty] ?? DIFFICULTIES.medium

    // Generate upgrade cards (3 base)
    const locked   = DUNGEON_TOOLS.filter(t => !unlockedTools.includes(t.id))
    const shuffled = [...locked].sort(() => Math.random() - 0.5)
    const cards    = shuffled.slice(0, Math.min(3, shuffled.length)).map(tool => ({ type: 'unlock', tool }))
    const goldReward = Math.round(Math.min(80 + waveIndex * 12, 200) * diff.waveGoldMult)
    while (cards.length < 3) cards.push({ type: 'gold', amount: goldReward })

    // ── Dark Lord's Demand evaluation ──────────────────────────────────────
    const waveConfig   = WAVE_CONFIGS[waveIndex]
    const demand       = waveConfig?.darkLordDemand
    let demandMet      = null
    let demandRewardCard = null

    if (demand) {
      // Compute totalGridCost for gold_efficiency demand
      let gridCost = 0
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const tileId = grid[r]?.[c]
          if (!tileId) continue
          const def = DUNGEON_TOOLS.find(t => t.id === tileId)
          if (def) gridCost += def.cost
        }
      }

      const checkState = {
        ...get(),
        totalGridCost: gridCost,
      }
      demandMet = demand.check(checkState)

      if (demandMet) {
        // Build the reward card — a 4th upgrade option
        const { reward } = demand
        demandRewardCard = reward.type === 'unlock' && reward.toolId
          ? { type: 'unlock', tool: DUNGEON_TOOLS.find(t => t.id === reward.toolId), isDemandReward: true }
          : { type: 'gold', amount: reward.amount, isDemandReward: true }
      }

      set({ darkLordDemandMet: demandMet, totalGridCost: gridCost })
    }

    const finalCards = demandRewardCard ? [...cards, demandRewardCard] : cards

    const isLastDefinedWave = waveIndex + 1 >= WAVE_CONFIGS.length
    const baseGold = isEndlessMode || isLastDefinedWave
      ? 600
      : Math.round((WAVE_CONFIGS[waveIndex + 1]?.gold ?? 300) * diff.waveGoldMult)

    set({
      phase:         PHASE.RESULTS,
      simulationRef: null,
      upgradeCards:  finalCards,
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
