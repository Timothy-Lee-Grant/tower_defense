// ── Gerald Commentary Engine ──
//
// Gerald is the Dungeon's Management Consultant Skeleton.
// He is dry, bureaucratic, mildly disappointed, and deeply invested
// in the operational efficiency of villainy.
//
// Exports:
//   selectWaveComment(state)        — BattleLog, live during wave
//   getHeroCallout(heroType)        — first-time hero type appearance
//   selectResultsComment(stats)     — ResultsScreen post-wave memo
//   selectVictoryComment(stats)     — VictoryScreen final memo
//   selectSynergyComment(grid,      — PlanHints during plan phase
//                        nextHeroes)
//   MENU_QUIPS                      — Array for MainMenu

import { TILE } from './constants.js'

// ── Utility ───────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// Count non-structural tile types placed in the grid
function countTiles(grid) {
  const structural = new Set(['empty','path','entrance','treasure'])
  const counts = {}
  for (const row of grid)
    for (const tile of row)
      if (!structural.has(tile)) counts[tile] = (counts[tile] ?? 0) + 1
  return counts
}


// ── MENU QUIPS (22 lines, randomly selected once per session) ─────────────────

export const MENU_QUIPS = [
  '"Your spike trap placement last session lacked synergy. I\'ve filed a report."',
  '"The heroes returned. Again. I\'ve scheduled a performance review."',
  '"Three knights defeated in room two. Recommend investing in ambush diversity."',
  '"Your Wraith called in sick. I\'ve arranged temporary slime coverage."',
  '"Q3 villain metrics are down. Have you considered more boulders?"',
  '"The heroes have begun rating our dungeon on TripAdvisor. One star. Gerald disputes this professionally."',
  '"I\'ve reviewed the incident report from last wave. The word \'catastrophic\' appears eleven times."',
  '"The Dark Lord has requested a quarterly review. I\'ve scheduled it for \'after the treasure is safe\'."',
  '"A previous architect tried an all-lava layout. Briefly effective. Then regulatory issues."',
  '"Your trap-to-tower ratio is suboptimal. I\'ve prepared a spreadsheet. You\'ll find it under \'Concerns\'."',
  '"The skeleton guard has filed for union representation. We are handling this."',
  '"I\'ve benchmarked your dungeon against the industry average. The industry average is doing better."',
  '"The Thief left a note: \'Easy gold, nice spikes, zero stars.\' Gerald is considering a rebrand."',
  '"Last session, a single Ranger walked through unharmed. I\'ve scheduled a debrief for the traps."',
  '"The dungeon\'s threat assessment score: Moderate. Gerald considers this a personal failure."',
  '"A Champion once commented that our ice towers were \'decorative\'. He is not wrong. This will be addressed."',
  '"Hero incursion rate up 12% this quarter. On the bright side, so is the slime budget."',
  '"I\'ve submitted a requisition for additional boulders. The Dark Lord approved one (1) boulder."',
  '"The facility has been breached multiple times this month. Gerald has ordered motivational posters for the skeletons."',
  '"Your architectural choices suggest either deep strategic thinking or mild panic. Gerald supports both."',
  '"The Warlord destroyed three spike plates last wave. Gerald has updated the replacement order to quarterly."',
  '"Dungeon efficiency: pending. Trap maintenance: overdue. Gerald\'s patience: also pending."',
]


// ── WAVE COMMENTARY (priority-based, shown live in BattleLog) ────────────────
// State object: { treasureHp, treasureMaxHp, alive, dead, escaped, carryingGold }
// alive/dead/escaped/carryingGold are arrays of hero objects.

const WAVE_CONTEXTS = [
  {
    priority: 100,
    condition: (s) => s.treasureHp < s.treasureMaxHp * 0.15,
    lines: [
      '"The treasure is at critical integrity. I am updating my emergency contacts."',
      '"Fifteen percent remaining. This is not a drill. This is a Gerald emergency."',
      '"The hoard is nearly gone. I want it on record that I recommended more spikes."',
    ]
  },
  {
    priority: 90,
    condition: (s) => s.treasureHp < s.treasureMaxHp * 0.35,
    lines: [
      '"Treasure integrity is compromised. I have started a resignation letter. Just in case."',
      '"Below thirty-five percent. At this rate, I am updating my Wikipedia page."',
      '"The hoard is diminishing. I am drafting a strongly-worded memo to the trap supplier."',
    ]
  },
  {
    priority: 85,
    condition: (s) => s.treasureHp < s.treasureMaxHp * 0.60,
    lines: [
      '"Some gold has been taken. I am not panicking. This is my calm voice."',
      '"The treasure has taken damage. I\'ve flagged this as a Priority Two incident."',
      '"Over forty percent of the hoard is gone. Gerald is prioritising containment."',
    ]
  },
  {
    priority: 80,
    condition: (s) => s.carryingGold.length >= 3,
    lines: [
      '"Three of them have the gold simultaneously. This is a structural failure."',
      '"Multiple carriers on the return path. Gerald is filing an emergency overtime request for the traps."',
      '"Three gold-carrying heroes on the return trip. This is a management failure. I\'ve written it down."',
    ]
  },
  {
    priority: 75,
    condition: (s) => s.carryingGold.length > 0 && s.carryingGold.length === s.alive.length && s.alive.length > 0,
    lines: [
      '"Every surviving target is on the return trip with our gold. Full defensive lockdown. NOW."',
      '"All active hostiles are fleeing with treasure. The facility is experiencing a coordinated withdrawal. Gerald is displeased."',
      '"They all have the gold. Every single one. This is precisely the scenario the briefing warned about."',
    ]
  },
  {
    priority: 70,
    condition: (s) => s.carryingGold.length === 1,
    lines: [
      '"One target has the gold and is fleeing. This is containable. Probably."',
      '"The thief has acquired our gold. Focus everything on that one specifically."',
      '"Gold carrier spotted on return path. This is what the Shadow Stalker was purchased for."',
      '"One of them has the gold. Gerald notes that \'one\' is still one too many."',
    ]
  },
  {
    priority: 65,
    condition: (s) => s.alive.some(h => h.type === 'warlord'),
    lines: [
      '"The Warlord is active. On-path traps are irrelevant against him. Towers only. This is in the briefing."',
      '"I see the Warlord. He destroys everything on the path. I\'ve filed a retroactive refund request for your spike plates."',
      '"The Warlord has entered the facility. The on-path traps are now decorative. Gerald is aware of the irony."',
    ]
  },
  {
    priority: 60,
    condition: (s) => s.alive.some(h => h.type === 'champion'),
    lines: [
      '"The Champion is present. Forty-five percent damage reduction. Sustained fire is the only answer."',
      '"Champion detected. Note that he will absorb approximately half of everything you deploy against him."',
      '"The Champion is absorbing damage at a statistically annoying rate. More towers. Immediately."',
    ]
  },
  {
    priority: 55,
    condition: (s) => s.alive.some(h => h.type === 'regenerator'),
    lines: [
      '"The Regenerator is healing faster than our damage output. Sustained fire. Do not let up for any reason."',
      '"The Regenerator is undoing our work in real time. This is deeply, personally annoying to Gerald."',
      '"Regeneration rate exceeds damage rate. Gerald recommends more towers and fewer pauses."',
    ]
  },
  {
    priority: 50,
    condition: (s) => s.alive.length >= 5,
    lines: [
      '"Five or more hostiles remain active. This exceeds the projected incursion volume."',
      '"The wave count exceeds projections. I\'ve escalated to the skeleton union representative."',
      '"A significant number of heroes are still alive. Gerald is reconsidering his initial optimism."',
    ]
  },
  {
    priority: 45,
    condition: (s) => s.carryingGold.length === 2,
    lines: [
      '"Two gold carriers on the return path. Gerald is not happy but remains professional."',
      '"Two of them have the gold. Double containment priority. Traps, towers, everything."',
    ]
  },
  {
    priority: 40,
    condition: (s) => s.alive.length === 0 && s.escaped.length === 0 && s.dead.length > 0,
    lines: [
      '"All targets neutralised. Not a single coin stolen. This is the performance review I wanted to file."',
      '"Complete elimination. Zero escapes. I\'ve ordered a modest celebration. Emphasis on modest."',
      '"Wave cleared without any gold leaving the facility. Gerald has booked himself an afternoon off."',
      '"Total hero elimination achieved. I\'ve already drafted the commendation memo."',
    ]
  },
  {
    priority: 35,
    condition: (s) => s.alive.length === 1,
    lines: [
      '"One hostile remaining. Finish it. Gerald will wait."',
      '"Final target active. All resources on this one. Do not let it reach the treasure."',
    ]
  },
  {
    priority: 30,
    condition: (s) => s.alive.some(h => h.type === 'archmage'),
    lines: [
      '"The Archmage is in the facility. Fire-resistant, self-healing, and deeply irritating. Non-fire towers prioritised."',
      '"Archmage confirmed active. Your fire infrastructure is currently losing money. Adjust accordingly."',
    ]
  },
]

const WAVE_DEFAULTS = [
  '"Traps performing at median efficiency. Gerald remains cautiously optimistic."',
  '"The dungeon holds. Incident reports are being compiled."',
  '"Status: acceptable. Gerald will note this as a passing grade."',
  '"Defensive systems nominal. Heroic incursion: ongoing. Gerald: monitoring."',
  '"The heroes are inside the facility. The traps were also deployed. Let us see who wins."',
  '"Dungeon security measures are active. Gerald is watching. Gerald is always watching."',
  '"Current threat level: managed. Gerald has not yet opened his emergency biscuits."',
  '"Trap throughput nominal. Hero throughput unacceptable. Gerald is taking notes."',
]

export function selectWaveComment(state) {
  const applicable = WAVE_CONTEXTS
    .filter(ctx => ctx.condition(state))
    .sort((a, b) => b.priority - a.priority)

  if (applicable.length > 0) return pick(applicable[0].lines)
  return pick(WAVE_DEFAULTS)
}


// ── HERO CALLOUTS (first time each type appears in a wave) ───────────────────

const HERO_CALLOUTS = {
  knight: [
    '"A Knight has entered the facility. Standard plate armour, standard motivations. Proceed normally."',
    '"Knight confirmed. Heavily armoured, moderately predictable. Classic heroic archetype. The traps know what to do."',
  ],
  mage: [
    '"The Mage is inside. Fire-resistant. Do not deploy fire vents against this target. I cannot stress this enough."',
    '"Mage detected. Note that fire towers are purely decorative against this one. I\'ve highlighted this in the briefing."',
  ],
  thief: [
    '"A Thief has entered. He will disarm your spike plates. Consider this when admiring your spike placement."',
    '"The Thief is active. Spike traps: ineffective. He also moves faster with gold. Budget for this."',
  ],
  paladin: [
    '"Paladin detected. He heals adjacent allies in real time. He is, frankly, a nuisance. Priority target."',
    '"The Paladin is here. He undoes our damage every second. Kill him first. This is not a suggestion."',
  ],
  berserker: [
    '"Berserker confirmed. Immune to slowing effects. Your ice towers are decorative against this one specifically."',
    '"The Berserker cannot be slowed. He compensates by taking more trap damage. There are two sides to every contract."',
  ],
  ranger: [
    '"Ranger sighted. Immune to poison. Do not deploy poison towers against this target. Filed under: obvious."',
    '"The Ranger. Poison-immune. Fast. Annoying. Towers are recommended over poison infrastructure for this wave."',
  ],
  cleric: [
    '"A Cleric. She heals the party continuously. The damage you\'re dealing is partially cancelled. Gerald is displeased."',
    '"The Cleric is active. Party heals every second. She is the highest-priority target on the field. Act accordingly."',
  ],
  archmage: [
    '"The Archmage. Fire-resistant AND self-healing. Your fire infrastructure is suffering a crisis of purpose."',
    '"Archmage detected. Heals. Resists fire. Disrupts nearby spells. Filed under: Exceptionally Annoying."',
  ],
  champion: [
    '"The Champion has arrived. Forty-five percent damage reduction on all sources. He will take a great deal of killing."',
    '"Champion on the field. Nearly half your damage is being absorbed. Plan accordingly. Gerald has already planned."',
  ],
  warlord: [
    '"The Warlord. He destroys on-path traps. Everything placed on the corridor: now decorative rubble. I\'ve noted this."',
    '"Warlord detected. On-path infrastructure: compromised. Tower-only defence until he is neutralised."',
  ],
  regenerator: [
    '"The Regenerator heals faster than standard damage output. Sustained fire is the only viable answer. Do not stop."',
    '"Regenerator confirmed. HP regenerates continuously. Single-hit traps are wasted here. Sustained damage only."',
  ],
}

export function getHeroCallout(heroType) {
  const lines = HERO_CALLOUTS[heroType]
  return lines ? pick(lines) : null
}


// ── RESULTS MEMOS (post-wave, shown on ResultsScreen) ────────────────────────

const RESULTS_CONTEXTS = [
  {
    priority: 100,
    condition: (s) => s.treasureHp <= 0,
    lines: [
      '"The treasure room has been emptied. I have begun updating my résumé."',
      '"The hoard is gone. Completely. I have prepared a severance package. For myself."',
      '"Total treasure loss confirmed. I am not angry. I am updating my LinkedIn. There is a difference."',
    ]
  },
  {
    priority: 90,
    condition: (s) => s.heroesEscapedWithGold === 0 && s.heroesKilled >= 8,
    lines: [
      '"Zero thieves escaped. Eight or more heroes eliminated. I\'ve filed this under \'Exceptional\'. Well done."',
      '"Perfect containment with high kill count. This is, statistically, the best possible outcome. Gerald notes this."',
      '"No gold stolen, significant heroes eliminated. I\'ve already drafted the commendation. It is a good commendation."',
    ]
  },
  {
    priority: 80,
    condition: (s) => s.heroesEscapedWithGold === 0 && s.heroesKilled > 0,
    lines: [
      '"Zero thieves escaped with gold. The treasure is intact. I consider this acceptable."',
      '"No gold was stolen. Some heroes did flee, but they left empty-handed. Gerald is satisfied."',
      '"Perfect gold retention. I\'ve filed this as a passing grade. Emphasis on passing."',
    ]
  },
  {
    priority: 75,
    condition: (s) => s.heroesEscapedWithGold >= 5,
    lines: [
      '"Multiple thieves escaped with our gold. I am not angry. I am disappointed. There is a great deal of paperwork."',
      '"The treasure has been significantly redistributed by the heroes. Gerald is composing a formal complaint."',
      '"A statistically significant portion of our hoard is now in hero hands. Gerald has rescheduled the Dark Lord\'s review."',
    ]
  },
  {
    priority: 70,
    condition: (s) => s.heroesEscapedWithGold >= 3,
    lines: [
      '"Three or more thieves escaped with gold. I\'ve rescheduled the Dark Lord\'s quarterly review indefinitely."',
      '"Multiple escapes with treasure. Gerald is considering a career in a different dungeon."',
      '"Three heroes out the door with our gold. I\'ve cross-referenced their footprints and filed an incident report."',
    ]
  },
  {
    priority: 65,
    condition: (s) => s.heroesEscapedWithGold === 2,
    lines: [
      '"Two thieves escaped with gold. I\'ve opened an inquiry. Gerald is taking this personally."',
      '"Two escapes with treasure. The dungeon security has a gap. I\'ve already identified it. It is everything."',
    ]
  },
  {
    priority: 60,
    condition: (s) => s.heroesEscapedWithGold === 1,
    lines: [
      '"One thief escaped with gold. I\'ve opened an inquiry. This is a lapse in otherwise solid security."',
      '"A single hero escaped with our gold. I\'ve cross-referenced their footprints. Gerald is displeased but composed."',
      '"One gold carrier got through. A minor breach. Gerald has added it to the running tally."',
    ]
  },
  {
    priority: 55,
    condition: (s) => s.heroesKilled >= 10,
    lines: [
      '"10+ heroes slain this wave. That is excessive. And also: excellent."',
      '"Double-digit kills confirmed. The Dark Lord has been informed. He is, reportedly, satisfied."',
      '"High kill count. The dungeon\'s efficiency metrics are trending positive. Gerald is cautiously pleased."',
    ]
  },
  {
    priority: 50,
    condition: (s) => s.heroesKilled === 0 && s.heroesEscapedWithGold > 0,
    lines: [
      '"Zero kills, gold stolen. The heroes walked through the facility and left with our money. Gerald has no words."',
      '"Not a single hero was stopped. I\'ve scheduled an immediate architecture review."',
    ]
  },
]

const RESULTS_DEFAULTS = [
  '"Some gold was taken. Reviewing trap placement for inefficiencies. Will report to the Dark Lord by Thursday."',
  '"Partial breach recorded. Gerald has begun a trend analysis. The trend is concerning."',
  '"Wave complete. Performance: mixed. Gerald\'s assessment: also mixed."',
  '"The dungeon held, mostly. I\'ve noted the areas of mostly and will address them."',
]

export function selectResultsComment(stats) {
  const applicable = RESULTS_CONTEXTS
    .filter(ctx => ctx.condition(stats))
    .sort((a, b) => b.priority - a.priority)

  if (applicable.length > 0) return pick(applicable[0].lines)
  return pick(RESULTS_DEFAULTS)
}


// ── VICTORY MEMOS (VictoryScreen, all 14 waves cleared) ──────────────────────

const VICTORY_LINES_CLEAN = [   // perfect or near-perfect run
  '"All fourteen waves repelled without significant treasure loss. I am taking next week off. The Dark Lord has been informed."',
  '"Fourteen waves. No gold stolen. The dungeon\'s Wikipedia page has been updated to reflect a flawless record."',
  '"Complete defensive success. I\'ve drafted a case study for the Annual Villain Operations Summit. It is very complimentary."',
]

const VICTORY_LINES_STANDARD = [  // some gold was taken but survived
  '"All fourteen waves repelled. The treasure is secured, minus some redistribution. Gerald considers this a win."',
  '"The final Champion has fallen. Some gold was lost along the way, but the dungeon stands. Gerald is satisfied."',
  '"Fourteen waves survived. The heroes failed to take the hoard. Some of the hoard. Gerald is focusing on the positive."',
  '"Campaign complete. The dungeon holds. I have composed a short speech for the Dark Lord. He will receive it Thursday."',
]

export function selectVictoryComment({ goldStolenTotal = 0, treasureHp = 0, treasureMaxHp = 300 } = {}) {
  const ratio = treasureMaxHp > 0 ? treasureHp / treasureMaxHp : 0
  if (ratio >= 0.85) return pick(VICTORY_LINES_CLEAN)
  return pick(VICTORY_LINES_STANDARD)
}


// ── SYNERGY DETECTION (plan phase, shown in PlanHints) ───────────────────────
// Returns a Gerald observation string, or null if nothing notable detected.
// nextHeroes: array of hero type ID strings for the upcoming wave

const SYNERGY_RULES = [
  {
    priority: 100,
    detect: (c, nh) => nh.includes('warlord') && ((c.spike ?? 0) + (c.boulder ?? 0) + (c.lava ?? 0)) > 0,
    lines: [
      '"Warlord incoming. On-path traps are his appetiser. I recommend reconsidering the corridor."',
      '"Warlord confirmed next wave. He will destroy your spike plates, boulders, and lava. In that order."',
    ]
  },
  {
    priority: 95,
    detect: (c, nh) => nh.includes('ranger') && (c.poison ?? 0) >= 2,
    lines: [
      '"Ranger incoming. She is immune to poison. Your mist towers are decorative against this wave\'s most annoying target."',
      '"Poison deployed, Ranger incoming. She cannot be poisoned. Gerald has noted the gap in coverage."',
    ]
  },
  {
    priority: 90,
    detect: (c, nh) => nh.includes('berserker') && (c.ice ?? 0) >= 2,
    lines: [
      '"Berserker incoming. He cannot be slowed. Your ice towers will perform magnificently against every target except him."',
      '"Ice deployed. Berserkers are immune to slow. Gerald has flagged this as a targeted concern."',
    ]
  },
  {
    priority: 85,
    detect: (c) => (c.idol ?? 0) >= 3,
    lines: [
      '"Three Cursed Idols. Either this is genius or hubris. Possibly both. Gerald endorses this provisionally."',
      '"Multiple Cursed Idol deployment. The synergy scales with every other source of damage. Ruthlessly efficient."',
    ]
  },
  {
    priority: 80,
    detect: (c) => (c.idol ?? 0) >= 1 && (c.shadow ?? 0) >= 1,
    lines: [
      '"Cursed Idol plus Shadow Stalker: curse them outbound, double-damage them on the return. I approve this explicitly."',
      '"Idol and Shadow Stalker in the same dungeon. Gold carriers will suffer specifically. Gerald has pre-approved this."',
    ]
  },
  {
    priority: 75,
    detect: (c) => (c.ice ?? 0) >= 1 && (c.dart ?? 0) >= 2,
    lines: [
      '"Ice tower plus dart cluster: slow then perforate. Classic combination. Budget-approved."',
      '"Freeze-and-fire configuration detected. I\'ve added this to the dungeon\'s strengths column."',
    ]
  },
  {
    priority: 70,
    detect: (c) => (c.troll ?? 0) >= 1 && (c.idol ?? 0) >= 1,
    lines: [
      '"Cave Troll plus Cursed Idol: amplified area damage on cursed targets. The maths are very encouraging."',
      '"Troll and Cursed Idol combination. Curse amplifies everything; the Troll hits everyone. Gerald approves the maths."',
    ]
  },
  {
    priority: 65,
    detect: (c) => (c.bat ?? 0) >= 1 && (c.idol ?? 0) >= 1,
    lines: [
      '"Bat drain plus Idol curse: permanently reduce max HP while amplifying all damage. Ruthlessly efficient."',
      '"Vampire Bat and Cursed Idol. The Bat lowers their ceiling; the Idol exploits it. Gerald approves."',
    ]
  },
  {
    priority: 60,
    detect: (c) => (c.ice ?? 0) >= 1 && (c.lava ?? 0) >= 1,
    lines: [
      '"Ice and Lava on the same path. They will be frozen while standing in lava. Gerald finds this reasonable."',
      '"Slow them with ice, then they stand in lava longer. A cruel geometry. I\'ve approved it."',
    ]
  },
  {
    priority: 55,
    detect: (c) => (c.fire ?? 0) >= 1 && (c.poison ?? 0) >= 1,
    lines: [
      '"Fire and poison deployed. The elements are contradictory but the damage is cumulative. Gerald appreciates the commitment."',
      '"Fire vents and poison mist. The heroes will be on fire and also dying slowly. Satisfactory."',
    ]
  },
  {
    priority: 50,
    detect: (c) => (c.boulder ?? 0) >= 3,
    lines: [
      '"Three boulders. Gerald has catalogued this under \'Rock-Based Architecture\'. One-time use only."',
      '"Multiple boulder deployment. High damage, single activation. Effective on entry. Plan for the aftermath."',
    ]
  },
  {
    priority: 45,
    detect: (c) => (c.gargoyle ?? 0) >= 1,
    lines: [
      '"Gargoyle deployed. Targets the most advanced hero. On the return trip, the most advanced hero will be the gold carrier."',
      '"Gargoyle confirmed. It hunts the front of the pack outbound and the gold carrier on return. This is intentional and good."',
    ]
  },
  {
    priority: 40,
    detect: (c) => (c.skeleton ?? 0) + (c.slime ?? 0) + (c.wraith ?? 0) + (c.troll ?? 0) + (c.bat ?? 0) >= 4,
    lines: [
      '"Heavy monster deployment. Note that the skeletons have filed for overtime. HR is reviewing this."',
      '"Four or more monster variants active. Maintenance costs will be discussed in the quarterly review."',
    ]
  },
  {
    priority: 35,
    detect: (c) => !(c.spike || c.boulder || c.door || c.lava),
    lines: [
      '"No on-path traps placed. A purely ranged approach. Bold. If a Warlord appears, Gerald will have said nothing."',
      '"Zero on-path traps. The heroes will walk the path unmolested until towers engage. This is a choice you have made."',
    ]
  },
  {
    priority: 25,
    detect: (c) => !(c.dart || c.fire || c.ice || c.poison || c.skeleton || c.slime || c.wraith || c.troll || c.bat || c.idol || c.shadow || c.gargoyle),
    lines: [
      '"No towers placed. The entire defence relies on the path traps alone. Gerald is experiencing mild anxiety."',
      '"Tower count: zero. On-path traps will need to carry the full defensive load. Gerald has noted this in three separate memos."',
    ]
  },
  {
    priority: 15,
    detect: (c) => Object.keys(c).length === 0,
    lines: [
      '"The dungeon is currently empty. Architecturally speaking, this is a concern. Heroes are incoming."',
      '"No defences detected. Gerald is experiencing what he describes as \'significant professional concern\'."',
    ]
  },
]

export function selectSynergyComment(grid, nextHeroes = []) {
  const counts = countTiles(grid)

  const applicable = SYNERGY_RULES
    .filter(r => r.detect(counts, nextHeroes))
    .sort((a, b) => b.priority - a.priority)

  if (applicable.length > 0) return pick(applicable[0].lines)
  return null   // nothing notable to say
}
