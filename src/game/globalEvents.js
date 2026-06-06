// ── Global Events System (Feature #10) ────────────────────────────────────
//
// At the start of certain waves, a global event changes the rules for that
// entire wave. Four categories:
//   terrain        — modify the dungeon environment
//   hero_buff      — make heroes stronger this wave
//   player_advantage — give the dungeon owner a boost
//   wild           — chaotic, surprising, sometimes funny
//
// Events are assigned to specific waves via WAVE_EVENTS.
// Endless waves beyond WAVE_CONFIGS draw randomly from the full pool.

export const GLOBAL_EVENTS = {

  // ── Terrain Events ────────────────────────────────────────────────────────

  cave_in: {
    id: 'cave_in', category: 'terrain',
    name: 'Cave-In Warning',
    emoji: '💥',
    color: '#c47a30',
    bgColor: 'rgba(80,30,10,0.92)',
    description: 'Three off-path structures will collapse mid-wave. Marked tiles are doomed.',
    geraldLine: '"Structural integrity report: abysmal. I flagged three tiles for collapse in a maintenance request submitted six months ago. No one responded."',
  },

  flooding: {
    id: 'flooding', category: 'terrain',
    name: 'Flooding',
    emoji: '🌊',
    color: '#3a8fc4',
    bgColor: 'rgba(10,30,60,0.92)',
    description: 'Lava Floors deal only 5 HP/s this wave. Heroes wade through the diluted magma.',
    geraldLine: '"The drainage system has catastrophically failed. Lava diluted to approximately 30% efficacy. I filed a maintenance request. It was marked as low priority."',
  },

  holy_ground: {
    id: 'holy_ground', category: 'terrain',
    name: 'Holy Ground',
    emoji: '✨',
    color: '#a0c8ff',
    bgColor: 'rgba(20,30,60,0.92)',
    description: 'A blessed 3×3 zone cannot receive new emergency placements this wave.',
    geraldLine: '"Clerics have consecrated a section of the dungeon floor. Our operational permits do not cover blessed ground. Emergency placement blocked accordingly. Gerald apologises for the inconvenience. He does not mean it."',
  },

  tremors: {
    id: 'tremors', category: 'terrain',
    name: 'Tremors',
    emoji: '🌍',
    color: '#a08050',
    bgColor: 'rgba(30,20,10,0.92)',
    description: 'Random seismic tremors throughout the wave. Purely cosmetic. Mostly.',
    geraldLine: '"Seismic activity has been detected beneath the dungeon. Structural reports are pending. This is — I am told — not my fault."',
  },

  // ── Hero Buff Events ──────────────────────────────────────────────────────

  heroes_motivated: {
    id: 'heroes_motivated', category: 'hero_buff',
    name: 'Heroes Are Motivated',
    emoji: '⚡',
    color: '#d0d030',
    bgColor: 'rgba(40,40,10,0.92)',
    description: 'All heroes move 30% faster this wave.',
    geraldLine: '"Someone gave the intruders a motivational speech before entry. Not me. I would never. Movement speed increased by 30%. This is deeply unwelcome."',
  },

  shield_potion: {
    id: 'shield_potion', category: 'hero_buff',
    name: 'They Drank a Potion',
    emoji: '🧪',
    color: '#40d090',
    bgColor: 'rgba(10,40,25,0.92)',
    description: 'All heroes enter with a 150-HP shield. Destroy it before real HP is affected.',
    geraldLine: '"They located the alchemist district. Each hero carries a 150-HP shield. I have submitted an invoice for the alchemist\'s immediate arrest and professional licence revocation."',
  },

  blessed: {
    id: 'blessed', category: 'hero_buff',
    name: 'Blessed',
    emoji: '🙏',
    color: '#d0c060',
    bgColor: 'rgba(40,35,10,0.92)',
    description: 'All hero healing (self-heal, party heal, paladin, cleric) is doubled this wave.',
    geraldLine: '"A senior priest blessed the entire party before entry. All healing output doubled. The gods are, frankly, working against this dungeon."',
  },

  know_the_way: {
    id: 'know_the_way', category: 'hero_buff',
    name: 'They Know the Way',
    emoji: '🗺️',
    color: '#80c8e0',
    bgColor: 'rgba(10,25,35,0.92)',
    description: 'Heroes are immune to door slows this wave. Someone sold them the blueprints.',
    geraldLine: '"They have the dungeon layout memorized. Iron doors no longer impede movement. Someone has been selling dungeon blueprints. Gerald has suspects. Gerald is looking at the skeleton guard."',
  },

  armored_up: {
    id: 'armored_up', category: 'hero_buff',
    name: 'Armored Up',
    emoji: '🛡️',
    color: '#8898a8',
    bgColor: 'rgba(15,20,25,0.92)',
    description: 'All heroes have +20% damage reduction this wave.',
    geraldLine: '"The adventurers\' guild issued emergency armour upgrades before this wave. Twenty percent damage reduction across all heroes. This is deeply irregular and slightly impressive."',
  },

  // ── Player Advantage Events ───────────────────────────────────────────────

  weapon_cache: {
    id: 'weapon_cache', category: 'player_advantage',
    name: 'Weapon Cache Discovered',
    emoji: '⚔️',
    color: '#c8a048',
    bgColor: 'rgba(35,25,10,0.92)',
    description: 'All towers deal 40% extra damage this wave.',
    geraldLine: '"We located an old weapon cache behind the east wall. All tower damage increased by 40% for this wave. Finally. Good news. Gerald has approved a modest celebration."',
  },

  monster_fury: {
    id: 'monster_fury', category: 'player_advantage',
    name: 'Monster Fury',
    emoji: '😤',
    color: '#d04030',
    bgColor: 'rgba(40,10,10,0.92)',
    description: 'All monster and tower units attack 50% faster this wave.',
    geraldLine: '"The dungeon\'s creatures are furious. Something about unpaid wages and poor working conditions. Attack speed increased by 50%. Gerald has noted the grievance. Gerald will not address it."',
  },

  spike_overload: {
    id: 'spike_overload', category: 'player_advantage',
    name: 'Spike Overload',
    emoji: '🔩',
    color: '#9898c8',
    bgColor: 'rgba(20,20,35,0.92)',
    description: 'Spike traps trigger twice per step this wave.',
    geraldLine: '"A pressure system malfunction has caused all spike plates to double-fire. I have classified this as an intended feature pending formal review. The heroes are not going to enjoy it."',
  },

  gold_bounty: {
    id: 'gold_bounty', category: 'player_advantage',
    name: 'Gold Bounty',
    emoji: '💰',
    color: '#e0c020',
    bgColor: 'rgba(35,30,5,0.92)',
    description: 'All hero kill rewards are doubled this wave.',
    geraldLine: '"The Bounty Board has declared premium rates on adventurers this week. All kill gold doubled. I have already updated the ledger. The Dark Lord will be pleased."',
  },

  // ── Wild Events ───────────────────────────────────────────────────────────

  gerald_speech: {
    id: 'gerald_speech', category: 'wild',
    name: "Gerald's Motivational Speech",
    emoji: '💀',
    color: '#c8a048',
    bgColor: 'rgba(25,18,5,0.92)',
    description: "All heroes stop for 3 seconds mid-wave to listen to Gerald's mandatory address.",
    geraldLine: '"Attention, intruders. Per dungeon regulatory compliance, I am required to deliver a mandatory motivational address. Duration: three seconds. Attendance: compulsory. You will stop. You will listen. You will regret it."',
  },

  wrong_dungeon: {
    id: 'wrong_dungeon', category: 'wild',
    name: 'Wrong Dungeon',
    emoji: '🗺️',
    color: '#60a8d0',
    bgColor: 'rgba(10,20,30,0.92)',
    description: 'The first 3 heroes immediately turn around and leave. Embarrassing for everyone.',
    geraldLine: '"The first three heroes have confirmed: they were looking for the dungeon next door. They apologise. They have left. The remaining heroes seem embarrassed. Gerald takes no pleasure in this. Gerald takes significant pleasure in this."',
  },

  equipment_failure: {
    id: 'equipment_failure', category: 'wild',
    name: 'Equipment Failure',
    emoji: '🔧',
    color: '#c07030',
    bgColor: 'rgba(30,15,5,0.92)',
    description: 'All off-path towers fire at 1.5× their normal interval this wave. Maintenance was overdue.',
    geraldLine: '"Routine tower maintenance was overdue by eight months. All mechanisms are running at reduced speed. I submitted a work order. No one responded. I am looking at the skeleton guard again."',
  },
}

// ── Wave event assignments (1-based wave number) ──────────────────────────
// Chosen to escalate drama: early waves get gentle events, later waves get
// hero-buffing or wild events that punish complacency.
export const WAVE_EVENTS = {
  3:  'tremors',          // Early game — purely visual, teaches the system
  5:  'heroes_motivated', // First speed threat — time to upgrade
  6:  'cave_in',          // Mid-campaign — structural stakes
  7:  'gold_bounty',      // Player reward for surviving the siege
  9:  'shield_potion',    // Extra complexity as elite heroes arrive
  10: 'weapon_cache',     // Player bonus on the brutal brute squad wave
  11: 'equipment_failure',// Punish tower-heavy players momentarily
  12: 'wrong_dungeon',    // Comic relief before the final stretch
  13: 'armored_up',       // Make the hardest wave harder
  14: 'blessed',          // Healers become terrifying on the champion wave
  15: 'gerald_speech',    // Grand finale wild card
}

// Category display labels and colours for the overlay badge
export const CATEGORY_META = {
  terrain:          { label: 'TERRAIN EVENT',    color: '#a08050' },
  hero_buff:        { label: 'HERO BUFF',         color: '#c04040' },
  player_advantage: { label: 'PLAYER ADVANTAGE',  color: '#40a060' },
  wild:             { label: 'WILD EVENT',         color: '#8050c8' },
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Returns the GLOBAL_EVENTS entry for the given 0-based wave index,
 * or null if this wave has no assigned event.
 */
export function getEventForWave(waveIndex) {
  const waveNum = waveIndex + 1
  const eventId = WAVE_EVENTS[waveNum]
  return eventId ? (GLOBAL_EVENTS[eventId] ?? null) : null
}

const _eventKeys = Object.keys(GLOBAL_EVENTS)

/**
 * Returns a random event — used for endless-mode waves beyond WAVE_CONFIGS.
 */
export function getRandomEvent() {
  return GLOBAL_EVENTS[_eventKeys[Math.floor(Math.random() * _eventKeys.length)]]
}
