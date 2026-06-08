// ── Feature 15: Scoring, Achievements, and Leaderboards ──────────────────────
//
// Exports:
//   calcWaveScore(params)          — compute score for a completed wave
//   ACHIEVEMENTS                   — array of achievement definitions
//   checkWaveAchievements(state)   — returns newly-unlocked achievement IDs (wave-end)
//   checkRunAchievements(state)    — returns newly-unlocked achievement IDs (run-end)

// ── Wave Score Formula ────────────────────────────────────────────────────────
//
//  waveScore =
//    goldEarnedThisWave * 2          (kill bounties × 2)
//  + Math.floor(treasureHp)          (every surviving HP point counts)
//  + efficiencyBonus                 (reward frugal architects)
//  + darkLordBonus                   (+500 if demand met)
//  + timeBonus                       (+150 if wave resolved under 60 s)
//  + comboBonus                      (bonus gold awarded × 3)

export function calcWaveScore({
  goldEarnedThisWave,
  treasureHp,
  waveStartGold,
  goldSpentThisWave,   // = waveStartGold - gold (after wave budget set)
  darkLordDemandMet,
  waveElapsedMs,
  comboBonusGold,      // total combo bonus gold awarded during wave
}) {
  // Kill value
  const killScore = (goldEarnedThisWave ?? 0) * 2

  // Treasure survival
  const hpScore = Math.floor(Math.max(0, treasureHp ?? 0))

  // Efficiency: % of wave gold NOT spent, rewarded up to 200 pts
  let efficiencyBonus = 0
  if (waveStartGold > 0 && goldSpentThisWave >= 0) {
    const pctUnspent = Math.max(0, 1 - goldSpentThisWave / waveStartGold)
    efficiencyBonus = Math.round(pctUnspent * 200)
  }

  // Dark Lord demand
  const darkLordBonus = darkLordDemandMet ? 500 : 0

  // Time bonus: under 60 s earns +150; 60–120 s earns proportional; over 120 s nothing
  const elapsedSec = (waveElapsedMs ?? 0) / 1000
  const timeBonus = elapsedSec < 60
    ? 150
    : elapsedSec < 120
      ? Math.round(150 * (1 - (elapsedSec - 60) / 60))
      : 0

  // Combo bonus multiplied × 3
  const comboScore = (comboBonusGold ?? 0) * 3

  return killScore + hpScore + efficiencyBonus + darkLordBonus + timeBonus + comboScore
}

// ── Achievement Definitions ───────────────────────────────────────────────────
//
// Each entry:
//   id          — stable key for localStorage
//   emoji       — display icon
//   name        — short title
//   desc        — unlock description (shown in panel)
//   hint        — vague hint shown before unlock (spoiler-free)
//   category    — 'strategic' | 'quirky' | 'endurance'

export const ACHIEVEMENTS = [
  // ── Strategic ──────────────────────────────────────────────────────────────
  {
    id: 'economist',
    emoji: '💰',
    name: 'The Economist',
    desc: 'Complete a wave spending less than 30% of your gold budget.',
    hint: 'Sometimes the best defense is a frugal one.',
    category: 'strategic',
  },
  {
    id: 'layered_defense',
    emoji: '🎯',
    name: 'Layered Defense',
    desc: 'Kill a hero who simultaneously has all four status effects: poisoned, slowed, cursed, and drained.',
    hint: 'Apply every debuff at once for a truly miserable death.',
    category: 'strategic',
  },
  {
    id: 'warlords_nightmare',
    emoji: '🪖',
    name: "Warlord's Nightmare",
    desc: 'Complete a wave that includes a Warlord using zero on-path traps.',
    hint: 'Show the Warlord there is nothing left to disarm.',
    category: 'strategic',
  },
  {
    id: 'perfect_run',
    emoji: '⚜',
    name: 'Perfect Run',
    desc: 'Complete all 14 waves without the treasure HP ever dropping below 150.',
    hint: 'An impenetrable dungeon is a well-designed dungeon.',
    category: 'strategic',
  },
  {
    id: 'tower_of_babel',
    emoji: '🏰',
    name: 'Tower of Babel',
    desc: 'Have 10 or more different tower/trap types placed on the grid simultaneously.',
    hint: 'Variety is the soul of a thorough dungeon.',
    category: 'strategic',
  },
  // ── Quirky ─────────────────────────────────────────────────────────────────
  {
    id: 'gerald_approved',
    emoji: '💀',
    name: 'Gerald Approved',
    desc: 'Earn a perfect wave: no gold stolen, all heroes slain, 80%+ treasure HP intact.',
    hint: "Gerald does not give praise easily. Or at all, really.",
    category: 'quirky',
  },
  {
    id: 'budget_committee',
    emoji: '🔁',
    name: 'The Budget Committee',
    desc: 'Sell and replace the same tile 5 or more times in a single plan phase.',
    hint: 'Indecision has its own tax.',
    category: 'quirky',
  },
  {
    id: 'oops',
    emoji: '🔓',
    name: 'Oops',
    desc: 'Let a Thief disarm your last spike trap on the path.',
    hint: 'Some architectural decisions invite commentary.',
    category: 'quirky',
  },
  {
    id: 'rock_bottom',
    emoji: '🩸',
    name: 'Rock Bottom',
    desc: 'Let the treasure HP reach 1.',
    hint: 'One. Single. Point.',
    category: 'quirky',
  },
  {
    id: 'hired_wrong_monsters',
    emoji: '🎪',
    name: 'Hired the Wrong Monsters',
    desc: 'Have a Cursed Idol, a Vampire Bat, and a Shadow Stalker all strike the same hero within 2 seconds.',
    hint: "Your three weirdest hires, cooperating for once.",
    category: 'quirky',
  },
  // ── Endurance ──────────────────────────────────────────────────────────────
  {
    id: 'unstoppable',
    emoji: '🔥',
    name: 'Unstoppable',
    desc: 'Survive all 14 waves on Hard difficulty.',
    hint: 'The hardest path. The only path worth remembering.',
    category: 'endurance',
  },
  {
    id: 'dungeon_eternal',
    emoji: '∞',
    name: 'The Dungeon Eternal',
    desc: 'Reach wave 25 in Endless mode.',
    hint: 'They never stop. Eventually, neither do you.',
    category: 'endurance',
  },
  {
    id: 'first_blood',
    emoji: '⚔',
    name: 'First Blood',
    desc: 'Kill a hero on wave 1.',
    hint: 'The first wave is not a warmup.',
    category: 'endurance',
  },
]

// Lookup by id for fast access
const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]))
export function getAchievement(id) { return ACHIEVEMENT_MAP[id] }

// ── Wave-end achievement checks ───────────────────────────────────────────────
// Returns array of achievement IDs that are newly unlocked this wave.
// Already-unlocked IDs are filtered by the caller (via persistence).
//
// state shape (passed from gameStore after endWave):
//   waveIndex, difficulty, treasureHp, treasureMaxHp, heroesEscapedWithGold,
//   goldEarnedThisWave, waveStartGold, goldSpentThisWave,
//   layeredDefenseKilled (bool), hasWarlordThisWave (bool), onPathTrapCount (int),
//   towerOfBabelCount (int, distinct tower types on grid simultaneously),
//   rockBottomReached (bool), firstBloodWave (bool),
//   tileSwapMax (int, max removes for any single tile this plan phase),
//   oopsTriggered (bool), hiredWrongMonstersTriggered (bool),
//   heroesKilledThisWave (int),

export function checkWaveAchievements(state) {
  const unlocked = []

  // The Economist: < 30% of wave gold spent
  if (state.waveStartGold > 0) {
    const pctSpent = (state.goldSpentThisWave ?? 0) / state.waveStartGold
    if (pctSpent < 0.30) unlocked.push('economist')
  }

  // Layered Defense
  if (state.layeredDefenseKilled) unlocked.push('layered_defense')

  // Warlord's Nightmare: wave had a warlord AND zero on-path traps when wave ended
  if (state.hasWarlordThisWave && state.onPathTrapCount === 0) unlocked.push('warlords_nightmare')

  // Tower of Babel: 10+ distinct types on grid
  if (state.towerOfBabelCount >= 10) unlocked.push('tower_of_babel')

  // Gerald Approved: no gold stolen, 80%+ treasure HP, at least 1 kill
  if (
    state.heroesEscapedWithGold === 0 &&
    state.treasureMaxHp > 0 &&
    state.treasureHp / state.treasureMaxHp >= 0.8 &&
    state.heroesKilledThisWave > 0
  ) unlocked.push('gerald_approved')

  // Budget Committee: same tile sold+rebought 5+ times
  if (state.tileSwapMax >= 5) unlocked.push('budget_committee')

  // Oops: Thief disarmed the last spike
  if (state.oopsTriggered) unlocked.push('oops')

  // Rock Bottom
  if (state.rockBottomReached) unlocked.push('rock_bottom')

  // Hired the Wrong Monsters
  if (state.hiredWrongMonstersTriggered) unlocked.push('hired_wrong_monsters')

  // First Blood: killed at least 1 hero on wave 1 (waveIndex 0)
  if (state.waveIndex === 0 && state.heroesKilledThisWave > 0) unlocked.push('first_blood')

  return unlocked
}

// ── Run-end achievement checks ────────────────────────────────────────────────
// Called at VictoryScreen (all 14 waves done).
// state: { difficulty, minTreasureHpThisRun, endlessWave }

export function checkRunAchievements(state) {
  const unlocked = []

  // Perfect Run
  if (state.minTreasureHpThisRun !== null && state.minTreasureHpThisRun >= 150)
    unlocked.push('perfect_run')

  // Unstoppable
  if (state.difficulty === 'hard') unlocked.push('unstoppable')

  // The Dungeon Eternal: wave 25 = 11 endless waves beyond WAVE_CONFIGS.length (14)
  // endlessWave is incremented in pickUpgradeCard for endless mode
  if ((state.endlessWave ?? 0) >= 11) unlocked.push('dungeon_eternal')

  return unlocked
}
