# Dungeon Architect — Future Features Implementation Guide

> This guide is a living document of everything that needs to be built to make Dungeon Architect genuinely great. Every entry was derived from a full technical audit of the current codebase, playtesting observations, and game design first principles. Items are organized by theme, not priority — read the Priority Matrix at the end to sequence your work.

---

## Table of Contents

1. [Audio System](#1-audio-system)
2. [Game Feel — Juice, Particles, and Feedback](#2-game-feel--juice-particles-and-feedback)
3. [Gerald's Commentary — Making Him Actually Funny](#3-geralds-commentary--making-him-actually-funny)
4. [The Bank Gold Problem](#4-the-bank-gold-problem)
5. [Path Preview and Strategic Planning Tools](#5-path-preview-and-strategic-planning-tools)
6. [Save / Load / Persistence](#6-save--load--persistence)
7. [New Content — Traps, Towers, Heroes](#7-new-content--traps-towers-heroes)
8. [Trap and Tower Upgrade System](#8-trap-and-tower-upgrade-system)
9. [Campaign Mode and Multiple Dungeon Layouts](#9-campaign-mode-and-multiple-dungeon-layouts)
10. [Global Events System](#10-global-events-system)
11. [Dark Lord's Demands — Per-Wave Objectives](#11-dark-lords-demands--per-wave-objectives)
12. [Boss Heroes](#12-boss-heroes)
13. [Hero AI Adaptations](#13-hero-ai-adaptations)
14. [Combo and Synergy Recognition](#14-combo-and-synergy-recognition)
15. [Scoring, Achievements, and Leaderboards](#15-scoring-achievements-and-leaderboards)
16. [Replay System](#16-replay-system)
17. [UI and UX Improvements](#17-ui-and-ux-improvements)
18. [Technical Improvements](#18-technical-improvements)
19. [Priority Matrix](#19-priority-matrix)

---

## 1. Audio System

### Why This Matters First

Right now, every event in the game is completely silent. Traps fire, heroes die, treasure gets stolen — all without a single sound. Audio is the single highest-leverage improvement available. It transforms a functional game into a living one. Without it, events feel weightless.

### What to Build

#### 1.1 Audio Engine Wrapper

Create `src/audio/audioEngine.js` as a thin wrapper over the Web Audio API. Do NOT use HTML `<audio>` elements — they have latency and can't be pitched or layered.

```javascript
// src/audio/audioEngine.js
class AudioEngine {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.sfxGain = null
    this.musicGain = null
    this.buffers = {}
    this.muted = false
  }

  async init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    this.masterGain = this.ctx.createGain()
    this.sfxGain    = this.ctx.createGain()
    this.musicGain  = this.ctx.createGain()
    this.sfxGain.connect(this.masterGain)
    this.musicGain.connect(this.masterGain)
    this.masterGain.connect(this.ctx.destination)
  }

  // Procedurally generate each sound to avoid asset loading.
  // Each sound is a tiny synthesis function that creates a buffer and plays it.
  play(soundId, options = {}) { ... }

  setMuted(muted) {
    this.masterGain.gain.value = muted ? 0 : 1
    this.muted = muted
  }
}

export const audio = new AudioEngine()
```

#### 1.2 Procedural Sound Design (No Assets Required)

All sounds should be synthesized with the Web Audio API — this means zero external assets, zero loading time, and sounds that feel deliberately "dungeon-y" rather than stock. Here is the design for each sound:

**Trap / Structure sounds:**
- **Spike trigger** — short percussive metallic ping. Oscillator (sawtooth, 440Hz → 220Hz over 80ms) through a low-pass filter, amplitude envelope (attack 0ms, decay 80ms). Vary pitch ±15% per trigger to prevent repetition fatigue.
- **Boulder crush** — deep low thud. Oscillator (sine, 60Hz → 20Hz over 200ms), gain envelope (0 → 0.9 in 10ms, 0.9 → 0 in 190ms). Add a noise burst filtered to low frequencies for the "mass" effect.
- **Door creak** — frequency modulated tone that sweeps down (300Hz → 150Hz over 300ms), slight distortion via waveshaping.
- **Lava sizzle** — white noise filtered to mid-high frequencies (bandpass 2kHz–8kHz), modulated slowly, looping while hero is on tile.

**Tower / Monster sounds:**
- **Dart fire** — very short compressed "pew". Sine wave (800Hz → 300Hz over 60ms), fast attack/decay.
- **Fire vent** — noise burst filtered to 200Hz–2kHz, rising then falling amplitude over 400ms. Add a subtle rumble sub-oscillator.
- **Poison mist** — airy filtered noise, slightly wet feel. Lowpass filtered white noise (cutoff 1kHz), long release.
- **Ice shard** — high crystalline "ting" + brief reverb tail. Short sine at 2000Hz, fast decay, convolved with a tiny reverb impulse.
- **Skeleton sword** — metallic impact. Two tones (440Hz + 880Hz) with rapid decay through a short reverb.
- **Slime splat** — low bubble pop. Sine wave with heavy pitch drop (200Hz → 50Hz over 40ms), slight chorus.
- **Vampire Bat** — high-frequency flutter (oscillate gain 30Hz) on a narrow noise band. Short burst.
- **Troll slam** — very low frequency hit (40Hz) + explosion noise burst. Should rumble the speakers.
- **Shadow Stalker** — dissonant whoosh. Detuned oscillator pair sweeping from high to low, reversed decay.
- **Cursed Idol** — eerie sine with slow tremolo, "cursed magic" feel.
- **Wraith rush** — doppler-shift effect: pitch rises as wraith approaches target, peaks on hit, then falls back.
- **Gargoyle launch** — stone grinding then a sharp impact. Low rumble followed by impact crack.

**Hero / event sounds:**
- **Hero death** — sad descending arpeggio (3 notes: root, minor third, minor sixth) for regular heroes. For Champion and boss heroes, deeper and more dramatic.
- **Gold pickup** — satisfying "ching". Three ascending coins (random pitch variations ±5%), eighth-note spacing.
- **Treasure damaged** — ominous low drone stab. The dungeon shakes. Frequency: 80Hz, sharp attack, 500ms fade.
- **Hero escaped WITH gold** — alarm-style two-tone beep (shame sound). Player should wince slightly.
- **Wave start** — dramatic low rumble + rising tone. Signal that the dungeon is about to be tested.
- **Wave cleared** — brief satisfying resolution chord (major triad).
- **Upgrade unlock** — ascending two-note chime. Brief and pleasant.
- **Placement success** — soft click. Very quiet, should not distract.
- **Sell/remove** — slight reverse click. Softer than placement.

**UI sounds:**
- **Button hover** — barely audible tick. Optional.
- **Button click** — crisp tick at ~1kHz, 20ms decay.
- **Difficulty selected** — each difficulty gets a different tone (easy: bright, medium: neutral, hard: ominous).

#### 1.3 Wiring Audio to the Event System

The `simulationTick` already emits events. In `gameStore.js`, after processing events, pass them to the audio engine:

```javascript
// In the RAF loop in gameStore.js, after processing result.events:
result.events.forEach(ev => {
  switch (ev.type) {
    case 'trap_triggered':  audio.play(ev.trap + '_trigger'); break
    case 'hero_killed':     audio.play('hero_death', { pitch: heroTypePitch[ev.heroType] }); break
    case 'treasure_reached': audio.play('treasure_damaged'); break
    case 'tower_attack':    audio.play(ev.towerType + '_fire'); break
    // etc.
  }
})
```

#### 1.4 Volume Controls

Add a compact audio panel in the HUD (small speaker icon) that expands to show:
- Master Volume slider
- SFX Volume slider
- Music Volume slider (when music is added)
- Mute toggle

Store volume preferences in `localStorage`.

#### 1.5 Background Music (Phase 2)

Procedurally generated ambient music using the Web Audio API:
- **Plan phase**: Slow, thoughtful pad drone. Low BPM, minor key. Conveys "calculating villain energy."
- **Wave phase**: Tension builds as heroes enter. Percussion layer kicks in. BPM increases slightly as the wave progresses.
- **Victory phase**: Brief triumphant fanfare.
- **Loss / Treasure stolen**: Short dirge.

Use a music state machine that crossfades between layers based on game phase and treasure HP percentage.

---

## 2. Game Feel — Juice, Particles, and Feedback

### Why This Matters

"Juice" is the term game designers use for all the small visual and audio feedback that makes interactions feel satisfying. Right now, Dungeon Architect has almost none. Heroes die silently. Traps fire without drama. Gold gets stolen without a visible consequence. Adding juice is the fastest way to go from "this works" to "this is cool."

### 2.1 Screen Shake

Implement a screen shake system in `DungeonGrid.jsx` — apply a small canvas transform offset that decays over time.

```javascript
// In DungeonGrid.jsx, add a shakeRef
const shakeRef = useRef({ x: 0, y: 0, intensity: 0, decay: 0.85 })

// In the RAF draw loop, before drawing anything:
const shake = shakeRef.current
if (shake.intensity > 0.1) {
  shake.x = (Math.random() - 0.5) * shake.intensity
  shake.y = (Math.random() - 0.5) * shake.intensity
  shake.intensity *= shake.decay
  ctx.translate(shake.x, shake.y)
}
```

**When to trigger shake:**
- Treasure takes damage: intensity 8, decay 0.8 (strong, fast)
- Troll slam: intensity 6, decay 0.75 (strong, moderate)
- Boulder crushes hero: intensity 4, decay 0.85
- Champion takes damage: intensity 2, decay 0.9
- Hero escapes with gold: intensity 10, decay 0.7 (ALARMING)

### 2.2 Particle System

Add a lightweight particle emitter to the canvas rendering loop. Particles are just tiny colored squares or circles with velocity, gravity, and lifetime.

```javascript
// src/rendering/particles.js
class ParticleSystem {
  constructor() { this.particles = [] }
  
  emit(x, y, options) {
    // Create N particles at (x, y) with given color, velocity range, gravity, lifetime
  }
  
  update(deltaMs) {
    // Move all particles, apply gravity, decrement lifetime
    this.particles = this.particles.filter(p => p.life > 0)
  }
  
  draw(ctx) {
    // Draw all particles as small colored rects/circles
  }
}
```

**Particle effects to implement:**

- **Hero death**: Blood-red particles burst outward from hero position. ~15 particles, outward velocity, gravity pulls them down, 600ms lifetime.
- **Gold pickup at treasure**: Golden sparkle burst from treasure tile. ~20 particles, upward float, 800ms lifetime.
- **Trap trigger (spikes)**: Small gray/silver sparks from the spike tile.
- **Boulder hit**: Rock fragments flying outward (brown/gray, angular velocity).
- **Fire vent**: Flickering orange/yellow embers floating upward from blast.
- **Poison hit**: Green bubble particles rising from hero.
- **Ice hit**: White/blue crystal fragments, slow fall.
- **Curse applied**: Dark purple wisps spiraling up from hero.
- **Upgrade unlock**: Bright sparkles cascading from upgrade card when selected.
- **Wave start**: Torchlight flare effect at dungeon entrance.

### 2.3 Hero Death Animation

Right now dead heroes fade to 35% opacity and stay. That's weak. Implement a proper death sequence:

1. **Frame 0**: Hero sprite plays a "hit" flash (white fill over sprite for 2 frames).
2. **Frame 1-8**: Hero sprite rotates and falls (canvas transform: rotate + translate down).
3. **Frame 9-20**: Fade out to 0 opacity.
4. **Frame 20+**: Hero removed from rendering.

Add a `deathAnimation` property to dead heroes: `{ startTime, duration: 800 }`. The `drawHeroSprite` function checks this and applies the transform.

### 2.4 Tile Placement Animation

When a tile is placed on the grid, play a brief "stamp" animation: scale from 0.3 → 1.15 → 1.0 over 200ms. Store pending tile animations in a ref: `{ col, row, startTime }`.

### 2.5 Treasure HP Flash

When the treasure takes damage (hero picks up gold), briefly flash the treasure tile red and display a floating damage number above it. The number fades upward over 800ms.

### 2.6 Floating Damage Numbers

When a tower hits a hero, display the damage number floating above the hero's position. Color-coded:
- Normal damage: white
- Critical / curse-amplified: yellow-orange
- Healing: green
- Drain: purple (negative max HP)

Numbers float upward and fade over 700ms. Cap at 6 simultaneous numbers on screen to avoid clutter.

### 2.7 Tower "Ready to Fire" Indicator

Each tower/monster should have a subtle visual cue when its cooldown completes. A brief glow ring around the tile (1-2 frame flash). This gives the player feedback about attack timing — they can see why a tower didn't fire.

### 2.8 Hero Entry Effect

When each hero spawns, play an entry flash at the entrance gate. The gate tile pulses once with the hero's color, and a small "incoming!" label briefly appears above it.

### 2.9 Status Effect Visualizations on Sprites

Currently heroes have minimal status indicators. Enhance:

- **Poisoned**: Green tint overlaid on sprite (already partially implemented) + dripping green particles from sprite bottom
- **Slowed**: Blue crystalline ring around sprite + hero sprite moves with a "frozen" stutter effect (skip 1 in 4 frames of walk cycle)
- **Cursed** (currently NO indicator): Dark purple rune rotating slowly above hero head
- **Drained** (Bat victim): Gray desaturation overlay that increases with each drain stack
- **Full HP drain** warning: When a hero's maxHp drops to <30% of original, a warning indicator appears

---

## 3. Gerald's Commentary — Making Him Actually Funny

### Current State

Gerald has ~6 static lines per phase. By wave 5, players have heard them all. The comedy has run dry.

### 3.1 Expand the Commentary Pool

The existing system works well — it just needs 10× more content. Gerald should have something unique to say about:

**During wave (BattleLog sidebar):**
- Specific hero types being present ("A Warlord? He destroys everything. I've filed a grievance.")
- Low treasure HP (graduated panic: 60%, 40%, 20%, 10%)
- Specific traps firing ("The boulder just took out two at once. Cost analysis: excellent.")
- Gold-carrier heroes on the return trip ("The thief has the gold. EVERYONE focus on the thief.")
- A tower killing the last hero ("Final hero eliminated. I've drafted a press release.")
- Heroes escaping with gold ("That's two with gold. The Dark Lord will hear about this.")
- All heroes dead before reaching treasure ("Dungeon integrity at 100%. I'm updating my LinkedIn.")
- Wave 1 specifically ("First wave. Historically, this is when architects panic-place boulders.")

**Post-wave (ResultsScreen):**
- Perfect wave ("No gold was stolen. No heroes survived. I've approved a modest bonus. Very modest.")
- Treasure lost ("The hoard is gone. I've prepared a severance package. For them, not you.")
- One hero escaped with gold ("A single hero escaped with gold. I've cross-referenced their footprints.")
- Multiple escapes ("Three escaped? I've rescheduled the Dark Lord's quarterly review.")
- Large kill count ("47 heroes slain this wave. That is excessive. And also: excellent.")

**Main menu (rotating):**
At least 20 unique Gerald quips for the main menu, updated randomly each session.

### 3.2 Contextual Commentary System

Instead of fixed conditions, build a priority-based commentary selector:

```javascript
const GERALD_CONTEXTS = [
  {
    priority: 100,
    condition: (state) => state.treasureHp < state.treasureMaxHp * 0.15,
    lines: [
      '"The treasure is critically compromised. I am updating my emergency contacts."',
      '"Fifteen percent integrity remaining. I want it on record that I raised concerns about trap placement."',
    ]
  },
  {
    priority: 80,
    condition: (state) => state.heroes.filter(h => h.hasGold && h.state === 'moving').length > 2,
    lines: [
      '"Three gold-carrying heroes on the return trip simultaneously. This is a management failure."',
    ]
  },
  // ... etc
]

function selectGeraldLine(state) {
  const applicable = GERALD_CONTEXTS
    .filter(c => c.condition(state))
    .sort((a, b) => b.priority - a.priority)
  if (!applicable.length) return getDefaultLine()
  const ctx = applicable[0]
  return ctx.lines[Math.floor(Math.random() * ctx.lines.length)]
}
```

### 3.3 Hero-Specific Callouts

When specific hero types appear in a wave for the first time, Gerald should acknowledge them:

- Warlord first appears: *"The Warlord destroys on-path traps. Everything you placed on the corridor: irrelevant. I've prepared a refund request."*
- Champion appears: *"The Champion. 45% damage reduction. Not built to die in this dungeon. Possibly built to laugh at it."*
- Regenerator appears: *"The Regenerator heals faster than our towers can damage. Sustained fire only. This is in the briefing materials you didn't read."*

### 3.4 Synergy Detection Commentary

When the player sets up a specific trap combination, Gerald reacts at wave start:

- Ice + Dart cluster detected: *"I see you've arranged a slow field followed by rapid fire. I've approved this on a provisional basis."*
- 3+ Cursed Idols: *"You've placed three Cursed Idols. Either this is genius or hubris. Possibly both."*
- Warlord-resistant layout (no on-path traps): *"No on-path traps. Either you know something about Warlords or this was an oversight. Gerald's money is on oversight."*

---

## 4. The Bank Gold Problem

### Current State

The `bank` accumulates gold from upgrade cards and hero kills but can **never be spent**. It's displayed in the ResultsScreen as a stat but has no mechanical use. This is confusing — players reasonably expect to spend saved gold.

### Option A — Mid-Wave Emergency Purchases (Recommended)

Allow players to spend bank gold to place defenses **during waves only** (not during plan phase). This creates exciting mid-wave decision-making:

- Plan phase: spend `gold` (wave budget) — free planning time
- Wave phase: spend `bank` — emergency, expensive, real-time

To implement: add a `bankPlaceTile(col, row)` action that deducts from `bank` instead of `gold`. The ToolPalette shows a `[B]` badge on each tool during wave phase indicating bank cost. Maybe bank costs are 1.5× tool cost (premium for urgency).

This creates the fantasy of watching your dungeon fail and desperately spending your war chest to stop the breach. Very fun.

### Option B — Between-Wave Upgrades

Between waves (during the Results screen), allow bank gold to be spent on:
- Permanent tower upgrades (see Section 8)
- Extra upgrade card draws (reroll 1 card for 50g bank)
- Scouting report for next wave (see hero weaknesses for 30g bank)

### Option C — Prestige / Carry-Over

Bank gold carries over across campaign runs — used as a meta-currency to unlock permanent starting bonuses (extra starting gold, a free tier-2 tool at game start, etc.).

### Implementation Notes

Regardless of option chosen, rename `bank` to something clearer in the UI. "Bank" implies savings but no spending. Better: "War Chest" (if spendable mid-wave) or "Treasury" (if post-wave upgrades) or "Vault Score" (if pure scoring).

In the HUD, the current small `{bank}g` display should be more prominent with a distinct visual treatment that signals what it's for.

---

## 5. Path Preview and Strategic Planning Tools

### Current State

`pathfinding.js` exists and works (A* with per-hero terrain weights) but is **never called during gameplay**. The PlanHints panel shows "👁 Paths — Preview hero routes" in the controls list but clicking nothing actually shows paths.

### 5.1 Wire Up the Path Preview

Add a "Preview Paths" toggle button to the plan phase UI. When enabled, for each hero type in the upcoming wave, run `previewPaths(grid, ENTRANCE, TREASURE)` and draw dashed route overlays on the canvas.

Color-code by hero type:
- Knight: gold dashed line
- Mage: purple (avoids fire)
- Thief: green  
- Berserker: red (charges through)
- Ranger: teal (avoids poison)

Show path preview on hover of the "Preview Paths" button (no persistent toggle needed — it's primarily a "what would happen?" tool).

### 5.2 Threat Assessment Panel

In the PlanHints sidebar, add a "Threat Score" indicator per hero type:

```
⚔️ Knight (×2)         ████████░░  80% likely to reach treasure
🏹 Ranger                ██████████  95% likely (immune to your current defenses!)
🪓 Berserker             ████████░░  82% — immune to your ice towers
```

This is calculated by simulating the wave with current defenses (dry-run the simulation for a few frames at 10× speed, check if hero survives to treasure). Show as a % estimate, not a guarantee.

### 5.3 Defense Coverage Heatmap

A toggleable overlay that shows which tiles have the most tower coverage (darker = more towers can hit here). Helps players identify gaps. Draw as a semi-transparent red-to-green gradient overlay on the grid.

### 5.4 Gold Efficiency Display

In the ToolPalette, show DPS-per-gold for each tower on hover, so players can make informed decisions:
- "20 DPS / 45g = 0.44 DPS/g"
- "Troll: 35 AoE DPS / 130g = 0.27 DPS/g (×3 heroes = 0.81)"

---

## 6. Save / Load / Persistence

### Current State

Game state is entirely in-memory. Refreshing the browser loses everything.

### 6.1 Auto-Save Between Waves

After each wave's results screen, serialize game state to `localStorage`:

```javascript
function saveGame(state) {
  const saveData = {
    version: '1.0',
    timestamp: Date.now(),
    difficulty: state.difficulty,
    waveIndex: state.waveIndex,
    grid: state.grid,
    gold: state.gold,
    bank: state.bank,
    unlockedTools: state.unlockedTools,
    treasureHp: state.treasureHp,
    heroesKilled: state.heroesKilled,
  }
  localStorage.setItem('dungeon_save', JSON.stringify(saveData))
}
```

On game boot, check for a saved game and show a "Continue" option on the main menu.

### 6.2 Multiple Save Slots

Three save slots (autosave + 2 manual). Displayed on main menu as dungeon thumbnails showing:
- Wave number reached
- Difficulty
- Timestamp
- Treasure HP remaining

### 6.3 Run History / Stats

Track persistent statistics across all runs:
- Total games played
- Best wave reached per difficulty
- Most heroes killed in a single wave
- Favorite tool (most placed)
- Gerald's most-triggered line

Display in a "Records" section on the main menu (small, not intrusive).

### 6.4 Grid Snapshot Export

Allow players to export their current dungeon layout as a JSON string (or QR code) and share it with friends. The "Share Dungeon" button in plan phase generates a compact layout code. The main menu has an "Import Layout" option. This is a social feature that costs almost nothing to build.

---

## 7. New Content — Traps, Towers, Heroes

### 7.1 Missing Trap Types

The current on-path trap set is limited (spike, boulder, door, lava). Heroes traverse a long path — more variety is needed.

**New On-Path Traps:**

**Pit Trap** `pit` — 🕳️ Cost: 45g
Heroes who step on it fall in and take 50 damage, then climb out slowed for 3 seconds. Unlike boulder (one-use), pit resets after 8 seconds. Counter: Warlord disarms it. Mechanic already supportable — add handling in `handleOnPathTrap`.

**Pendulum** `pendulum` — ⚙️ Cost: 55g
Swings on a timer (2s on, 2s off). Only deals damage when the pendulum is in the "swing" state. Creates timing-dependent play — if you time your trap cluster right, heroes enter the pendulum at exactly the wrong moment. Requires a per-tile animation timer (separate from tower timers).

**Tar Pit** `tar` — 🟤 Cost: 50g
Slows heroes to 25% speed (stronger than door) but no damage. Key: tar does NOT slow Berserkers (immune to slows) — but Berserkers take 15 HP/s damage while moving through it instead (simulates their rage burning through the tar). Makes Berserkers harder to counter with the usual slow-then-damage combo.

**Electric Floor** `electric` — ⚡ Cost: 80g
Deals 25 damage AND chains to the nearest other hero within 2 tiles for 15 damage. Creates pressure to bunch heroes vs spread them — perfect counter to Paladins and Clerics who want to stay grouped for healing.

**Stasis Field** `stasis` — ❄️ Cost: 90g
Completely stops one hero for 2 seconds (freezes movement, immune to damage while frozen, but all towers reload during freeze). Expensive. Effectively gives all nearby towers a free full reload cycle on one hero.

### 7.2 New Off-Path Towers

**Catapult** `catapult` — 🏹 Cost: 100g
Range 5, damage 50, fires every 3.5s. Hits a random hero in range rather than the closest. The chaos element — you can't predict which hero it hits, but the long range lets it cover the entire path from one tile. Tier 2.

**Spider Nest** `spider` — 🕷️ Cost: 60g
Range 2, damage 5, fires every 0.4s, applies BOTH slow and poison on hit. Low individual damage but layered with every single hit. Pairs extremely well with Cursed Idol (cursed + slow + poison + drain = controlled disintegration). Tier 2.

**Mimic Chest** `mimic` — 📦 Cost: 85g
Placed anywhere. Does NOT attack. Instead, when a hero passes within range 2, they're "distracted" for 1.5 seconds (briefly stops moving to investigate the chest). During distraction, all towers in range fire twice as fast. Heroes who have already been distracted by a Mimic are immune. Tier 2.

**Lich** `lich` — 💀✨ Cost: 120g
Range 3, damage 20, fires every 1.5s. Unique: when the Lich kills a hero, that hero's ghost rises and walks the path again (as a "wraith clone" with 50 HP and no attacks) before dissipating after 8 seconds. Wraith clones keep towers busy and reload-locked. Dramatic and terrifying. Tier 3 (available only in waves 10+).

**Barrel of Poison** `barrel` — 🛢️ Cost: 40g
Not a tower — a one-use trap placed off-path. When a hero walks within range 2, the barrel explodes: 30 damage AoE to all heroes in range 2 + medium poison. Then disappears. Like a mine. Player places it tactically during wave. Cheap, finite, disposable.

### 7.3 New Hero Types for Later Waves

**Crusader** `crusader` — ✝️⚔️ Wave 15+ (if extending campaign)
- 400 HP base, 1.1 speed
- Takes only 50% damage from monsters (skeletons, slimes, wraiths, bats, trolls etc.) but normal damage from traps and magical towers
- "Blessed by a deity" — resists the dungeon's creature army specifically. Forces the player to rely on traps and fire/ice/poison rather than monster swarms.

**Engineer** `engineer` — 🔧 Wave 12+
- 350 HP base, 0.95 speed  
- Deactivates one random off-path tower per tile passed (tower goes dark for 10 seconds)
- Creates a "snaking" dead zone through the dungeon as the engineer walks. Very threatening in a heavily towered dungeon.

**Phantom** `phantom` — 👁️ Wave 13+
- 180 HP base, 1.8 speed
- Completely immune to poison, slow, AND fire
- Only takes damage from physical attacks (spikes, boulders, darts, skeletons, slimes)
- The "magic doesn't work" challenge — forces players who built magic-heavy dungeons to reconsider

**Medic** `medic` — ➕ Wave 14+
- 150 HP base, 1.0 speed
- Passively resurrects dead heroes: when a hero dies within 3 tiles of the Medic, they revive with 40% HP after 3 seconds
- Only resurrects each hero once
- Priority target — kill the Medic first or your kill count is a lie

---

## 8. Trap and Tower Upgrade System

### The Problem It Solves

Currently, placement is permanent with no growth. A dart tower placed in wave 1 is identical in wave 14. There's no attachment to individual placements, no satisfying improvement loop, no "I grew this dungeon over 14 waves" narrative.

### 8.1 Upgrade Tiers (3 per tower)

Each tower/trap can be upgraded up to 2 times (3 total tiers). Upgrades are purchased between waves using bank gold.

**Design philosophy**: Upgrades shouldn't just be stat boosts — each tier should add a new behavior or change the feel.

Example — Dart Tower upgrades:
- **Tier 1** (base): 20 damage, 1s fire rate, range 3. Single dart.
- **Tier 2** — "Crossbow" (75g bank): 30 damage, 0.85s fire rate, range 3.5. Visual: larger, crossbow-shaped sprite.
- **Tier 3** — "Ballista" (150g bank): 50 damage, 1.5s fire rate, range 5. **Piercing**: dart passes through first target and hits the next hero in line too. Visual: massive siege weapon.

Example — Spike Plate upgrades:
- **Tier 1** (base): 25 damage, 1-use per hero, Thief disarms.
- **Tier 2** — "Blade Gauntlet" (50g bank): 45 damage, regenerates after 4s (not one-use). Still disarmable.
- **Tier 3** — "Death Corridor" (100g bank): 60 damage, fires twice per step, can no longer be disarmed by anyone.

Example — Skeleton Guard upgrades:
- **Tier 1**: 18 damage, range 2, 0.9s.
- **Tier 2** — "Veteran Guard" (60g bank): 28 damage, range 2.5, 0.85s. Visual: shield added to sprite.
- **Tier 3** — "Death Knight" (130g bank): 40 damage, range 3, 0.8s. **Aura**: heroes within 1.5 tiles of the Death Knight take an additional 5 HP/s dark energy damage. Visual: glowing red armor, taller sprite.

### 8.2 Upgrade UI

During the Plan phase and Wave phase, right-clicking an existing tower opens an upgrade panel overlay instead of selling:
- Shows current stats and tier
- Shows cost of next upgrade (bank gold)
- Shows preview of upgraded stats and new ability
- Separate "Sell" button (50% refund, base price only — upgrades are not refundable)

### 8.3 Visual Upgrade Indicators

Each upgrade tier changes the sprite appearance. This is critical — players should be able to glance at their dungeon and see "there's my Tier 3 Ballista." Add an upgrade badge (small crown or gem in corner of tile) as a fallback if sprite changes are complex.

---

## 9. Campaign Mode and Multiple Dungeon Layouts

### Current State

One dungeon, one path, 14 waves. After 14 waves, victory. That's it.

### 9.1 Different Dungeon Layouts

The current path is hardcoded in `constants.js`. To add new layouts:

1. Extract path definition into a `DUNGEON_LAYOUTS` array
2. Each layout has its own `waypoints`, `entrance`, `treasure` position, and a `name` / `description`
3. The grid dimensions stay at 20×13 but the path shape changes

**Proposed layouts:**

**The Catacombs** (current default) — S-curve through the middle. Familiar.

**The Gauntlet** — Path runs straight across the top of the map (col 0-19, row 2), then straight back along the bottom (row 10). Two parallel corridors very close together. Forces the player to cover two horizontal strips. Towers near the middle hit heroes twice (outbound AND return).

**The Labyrinth** — Path zigzags 6 times across the full grid. Very long path, heroes spend much more time traversing. Ideal for DoT-heavy builds.

**The Throne Room** — Path spirals inward toward the center (treasure in center), then spirals back out. Circular layout. Places all your defenses in concentric rings. Very different feel.

**The Bottleneck** — Wide open grid with path that converges through a single 1-tile chokepoint in the middle. Everything passes through that one tile. Massive strategic weight on the chokepoint tile.

### 9.2 Campaign Map

A meta-level "campaign map" screen (between runs, not between waves) showing:
- 5-10 dungeons to unlock, arranged as a progression tree
- Each dungeon has a different layout, starting conditions, and unique modifier
- Completing one dungeon unlocks the next in the tree
- Star rating (1-3 stars) based on performance: stars persist across runs

**Dungeon modifiers** (unique per level, shown at level select):
- "Lava is 3× more effective"
- "Thieves can disarm all traps"
- "Heroes spawn in groups of 3, no stagger"
- "Boulders regenerate after each wave"
- "Fire towers deal double damage"

### 9.3 Endless Mode

After completing wave 14, instead of Victory screen: "The heroes are not stopping." Waves continue indefinitely. `hpMult` continues scaling (formula: `9.0 * 1.15 ^ (waveIndex - 14)`). Hero compositions repeat from wave 14 configuration. Waves come faster.

Endless mode has a separate leaderboard. High score = waves survived.

---

## 10. Global Events System

### What This Is

At the start of certain waves, a **global event** is announced that changes the rules for that entire wave. This adds unpredictability and forces players to adapt their strategy on the fly.

### Implementation

Add `event` field to `WAVE_CONFIGS` entries (optional). Some waves have pre-set events; others are random.

```javascript
{ wave: 6, hpMult: 2.4, gold: 260, label: '...', event: 'heroes_motivated' }
```

At wave start, the event is displayed dramatically in the battle log and on a brief overlay popup.

### Event Types

**Terrain Events** (modify the dungeon environment):
- **Cave-In Warning** — 3 random off-path tiles (chosen at wave start, shown to player) will collapse mid-wave, destroying any tower on them. Introduces anxiety about which tiles are "safe."
- **Flooding** — Lava Floor tiles deal only 5 HP/s this wave (heroes wade through slowly). Counters lava-heavy dungeons.
- **Holy Ground** — One 3×3 section of the grid (shown at wave start) cannot have defenses placed in it this wave. A gap in your coverage.
- **Tremors** — Screen shake at random intervals. Doesn't affect mechanics, just nerve-wracking.

**Hero Buff Events** (make heroes temporarily stronger):
- **Heroes Are Motivated** — All heroes move 30% faster this wave.
- **They Drank a Potion** — All heroes start with a 150-HP shield that must be broken before real HP is damaged.
- **Blessed** — All hero healing (from Paladins, Clerics, self-heal) is doubled this wave.
- **They Know the Way** — Heroes are immune to door slows this wave.
- **Armored Up** — All heroes have 20% damage reduction this wave (on top of existing DR).

**Player Advantage Events** (occasionally give the player a break):
- **Weapon Cache Discovered** — All towers deal 40% extra damage this wave.
- **Monster Fury** — All monsters have +50% attack speed this wave.
- **Spike Overload** — Spike traps trigger twice per step this wave.
- **Gold Bounty** — All hero kill rewards doubled this wave.

**Wild Events** (chaotic, hilarious):
- **Gerald's Motivational Speech** — Heroes stop for 3 seconds mid-wave to "listen to Gerald's speech." (They're confused.) All of them. Simultaneously. It's surreal and funny.
- **Wrong Dungeon** — The first 3 heroes immediately turn around and leave (escaped empty-handed, no treasure damage). "They were looking for the dungeon next door."
- **Equipment Failure** — All off-path towers lose 1 tier of attack speed this wave only (timers 1.5×). Maintenance was overdue.

---

## 11. Dark Lord's Demands — Per-Wave Objectives

### What This Is

At the start of each wave, the Dark Lord issues a demand (an optional objective). Completing it awards bonus gold or a special unlock. Failing it has no penalty but missing consistent bonus gold is its own punishment over 14 waves.

This is the "challenge mode within a challenge mode" — completionists will agonize over these.

### Implementation

Add `darkLordDemand` to each `WAVE_CONFIG`. The store tracks whether the demand was met when the wave ends.

```javascript
{ wave: 3, ..., darkLordDemand: {
  id: 'no_escaped_gold',
  text: '"Let NO hero escape with my gold." — The Dark Lord',
  reward: { type: 'gold', amount: 60 },
  check: (state) => state.heroesEscapedWithGold === 0,
}}
```

Demands at wave end are evaluated. Met → reward is added to upgrade card pool (4th card option).

### Demand Examples

- **"Kill the Paladin First"** — The Paladin must die before any other hero in the wave.
- **"Perfect Defense"** — Treasure HP must remain above 200 after the wave.
- **"No On-Path Casualties"** — No hero may be killed by a trap (only tower kills count). Encourages tower-focused play.
- **"The Mage Must Not Escape"** — Every Mage in the wave must die. Requires targeting specific hero types.
- **"Speed Run"** — All heroes must be resolved (dead or escaped) within 45 seconds of wave start.
- **"Gold Efficiency"** — No more than 500g of total defenses on the grid when the wave ends.
- **"Let Them Through (Halfway)"** — At least 3 heroes must reach the treasure. (Dark Lord wants the challenge. Or is testing the dungeon.)
- **"Finish Without a Troll"** — The Cave Troll may not attack this wave.

---

## 12. Boss Heroes

### What This Is

Certain waves (every 3-4 waves) feature a **Boss Hero** — a single uniquely powerful hero who gets a dramatic entrance animation, a name, and special dialogue. Bosses are separate from the regular wave composition (they arrive after all other heroes resolve, or as the final hero).

### Implementation

Add `boss` field to `WAVE_CONFIGS`:
```javascript
{ wave: 7, ..., boss: { type: 'champion_variant', name: 'Sir Aldric the Unyielding', dialogue: '...' }}
```

### Boss Roster

**Wave 7 Boss — "Sir Aldric the Unyielding"**
A veteran Knight with 3× normal Knight HP and a 30% damage reduction. He walks slowly and deliberately. Entry dialogue (typed out in battle log): *"I've cleared seventeen dungeons this quarter. Yours will be eighteen."* He speaks to Gerald directly.

**Wave 10 Boss — "Mira the Untouchable"**
A Mage variant immune to ALL elemental damage (fire, ice, poison, lava). Only physical attacks (spikes, boulders, darts, melee monsters) can hurt her. Entry: *"Your fire vents are decorative. Your ice shards: art installations. Your dungeon: a disappointment."*

**Wave 12 Boss — "The Berserker King"**
A Berserker with 5× base HP who, when brought below 50% HP, ENRAGES — doubles in speed and deals 3× treasure damage if he reaches the vault. Entry: *"(no words. Just the distant sound of things being destroyed.)"*

**Wave 14 Boss — "The Eternal Champion"**
The hardest enemy in the game. Same Champion stats but: fully immune to slow AND poison, heals 5 HP/s passively, takes 55% damage reduction instead of 45%. He appears last, alone, after all other wave-14 heroes resolve. Entry: *"I've heard about this dungeon. The traps. The monsters. Gerald. I want you to know — I came here specifically for the challenge."*

Bosses have:
- Custom sprite (slight variation on base hero with added crown/aura)
- Entrance fanfare (one second of screen flash in boss's color)
- Name plate displayed in HUD during their traversal
- Unique death message (or escape message)

---

## 13. Hero AI Adaptations

### What This Is

Heroes currently follow a fixed path with no memory between waves. In later waves, they should adapt to your dungeon — making repeat strategies less reliable and forcing you to iterate.

### 13.1 Path Learning

After wave 5, if the same tile type killed multiple heroes (e.g., Spike Plate at position 5,2 killed 3 heroes), subsequent waves have heroes who walk FASTER through that section (they've been warned). Mechanically: heroes who have a `memorizedDangers` set of tile positions move at 1.3× speed through those tiles.

### 13.2 Defensive Priority Targets

If the Warlord has been in a wave and destroyed 3+ on-path traps, subsequent waves have Warlords prioritize walking slightly faster through heavily trapped corridors. (They know where to go.)

### 13.3 Healer Clustering

From wave 8 onward, if a Paladin or Cleric is in the wave, they spawn with a slightly shorter spawn delay than heroes who need healing (so healers are always close to the fighters). This is a subtle AI improvement that makes healing actually work as intended.

### 13.4 Scout Hero

From wave 9 onward, the FIRST hero of each wave is designated a "Scout" (no visual change — this is invisible to the player). The Scout's path data is observed: every tile that dealt damage to the Scout is flagged. All heroes AFTER the Scout in that wave have 20% reduced damage from flagged traps (they prepared for it). This means your opening burst of traps is slightly less effective as waves progress.

---

## 14. Combo and Synergy Recognition

### What This Is

The game has synergies (Ice + Dart, Cursed Idol + everything, Shadow Stalker + return corridor) but they're invisible — the player has to discover them. Making the game show recognized combos builds excitement and teaches strategy.

### 14.1 Combo Notifications

When a tower kills a hero and at least one other mechanic contributed to the death, display a combo banner in the battle log:

- Slow + Fire tower kill → *"❄🔥 Frozen Hellfire! (+10% kill gold bonus)"*
- Poison + Cursed + any tower kill → *"☠️👁️ Corrupted! The most miserable death possible."*
- Shadow Stalker kills gold carrier → *"🌑💰 Ambushed on the return trip! Gold secured."*
- Boulder kills 2+ heroes at once → *"🪨 Double Crush! Boulder was worth it."*
- Troll kills 3+ heroes simultaneously → *"🧌 Troll Rampage! That's what we bought it for."*

Combo kills provide a small gold bonus (+10-25g) and a brief screen flash in the combo's color.

### 14.2 Combo Tiles in Plan Phase

In the plan phase, when you hover over an existing tower while another type is selected for placement, if those two tower types have a known synergy, a subtle glow highlights the pairing and shows a tooltip: *"These pair well — Idol debuffs increase Gargoyle damage by up to 45%."*

### 14.3 Session Stats Card

At the end of each wave, the ResultsScreen shows a "Best Combo" stat: *"Best kill: Cursed (3 stacks) + Slowed + Bat drain → Knight (18 HP remaining before final Skeleton hit)"* — this is the most complex kill chain of the wave.

---

## 15. Scoring, Achievements, and Leaderboards

### 15.1 Wave Score System

Each wave produces a score based on:
- Heroes killed × their gold value
- Damage prevented (treasureHp remaining × 100)
- Wave efficiency bonus (% of planning gold NOT spent × 0.5)
- Combo kills (bonuses per combo)
- Dark Lord Demand completed (+500 per wave)
- Time bonus (waves completed under average time get multiplier)

Score is displayed in ResultsScreen (subtle — not the focus).

### 15.2 Achievements

A panel (accessible from main menu) showing achievements. Mix of:

**Strategic Achievements:**
- *"The Economist"* — Complete a wave spending less than 30% of your gold budget.
- *"Layered Defense"* — Kill a hero who has all 4 status effects simultaneously (poisoned, slowed, cursed, drained).
- *"Warlord's Nightmare"* — Complete a wave with a Warlord using zero on-path traps.
- *"Perfect Run"* — Complete all 14 waves without the treasure HP dropping below 150.
- *"The Tower of Babel"* — Have 10+ different tower types placed simultaneously.

**Funny / Quirky Achievements:**
- *"Gerald Approved"* — Get Gerald's highest-praise quote.
- *"The Budget Committee"* — Sell and rebuy the same tile 5 times in one wave.
- *"Oops"* — Have a Thief disarm your final spike on the path (treasure then accessible).
- *"Rock Bottom"* — Let the treasure HP reach 1.
- *"Hired the Wrong Monsters"* — Have a Cursed Idol, a Bat, and a Shadow Stalker all hit the same hero in 2 seconds.

**Endurance Achievements:**
- *"Unstoppable"* — Survive all 14 waves on Hard difficulty.
- *"The Dungeon Eternal"* — Reach wave 25 in Endless mode.
- *"First Blood"* — Kill a hero on wave 1.

### 15.3 Local Leaderboard

`localStorage`-based leaderboard tracking:
- Best wave reached per difficulty
- Highest total score per difficulty
- Fastest completion (total time for all 14 waves)
- Most heroes killed in a single run

Display on main menu as a "Gerald's Hall of Excellence" panel. Gerald has commentary for your current rank.

---

## 16. Replay System

### What This Is

Record each wave's events and replay them later. This serves two purposes: showing your best moments, and learning from your worst.

### 16.1 Event Recording

The simulation already produces an event stream. Recording a replay just means storing:
1. The initial grid state at wave start
2. The wave config (hero compositions, hpMult)
3. The full `simulationTick` event log with timestamps

This is compact — a 90-second wave might have 5,000 events, but each event is small (50-100 bytes). Full 14-wave run: maybe 1-2 MB.

```javascript
const replayBuffer = {
  waveIndex: 5,
  difficulty: 'hard',
  grid: [...],
  events: [
    { t: 0, type: 'spawn', heroId: 'knight_0', ... },
    { t: 1500, type: 'spawn', heroId: 'mage_0', ... },
    // ...
  ]
}
```

### 16.2 Replay Playback

A "Watch Replay" button on the VictoryScreen and GameOver screen. The replay uses the existing renderer but drives it from recorded events instead of live simulation. Playback speed controls (1×, 2×, 4×, pause).

### 16.3 Highlight Reel

Automatically identify the three most dramatic moments of a run:
- Closest call (hero reached treasure with least HP remaining)
- Most simultaneous damage (largest combined damage applied in one frame)
- Last-second kill (hero closest to escape point when killed)

Generate a 15-second "highlight reel" that jumps between these moments.

---

## 17. UI and UX Improvements

### 17.1 Range Preview During Wave Phase

Currently, range preview (the gold ring on hover) only shows in Plan phase. During Wave phase, players can still place tiles but can't preview range. Fix: show range preview in Wave phase too. One-line change in DungeonGrid.jsx.

### 17.2 Tooltip System

Replace description text in ToolPalette with proper hovering tooltips. The current inline descriptions are small and easy to miss. Tooltips should:
- Appear on hover after 400ms delay
- Show full stats (damage, range, attack speed, special effects)
- Show synergy suggestions ("Pairs well with: Ice Shard, Cursed Idol")
- Show hero weakness info ("Mages take 50% damage from this")

### 17.3 Hero Status Panel

Expand the BattleLog hero status section. Each hero row should show:
- HP bar
- Current status effects as icons (🧊 slow, ☠️ poison, 👁️ curse, 💉 drain)
- Current speed (vs. base speed) — so player can see slow taking effect
- Distance from treasure (as %, "62% to treasure")

Scrollable if heroes exceed panel height.

### 17.4 Upgrade Card Preview

On the ResultsScreen, when hovering over an upgrade card, show a side panel with:
- The tool's full stats
- Which waves it first appears in (relevant context)
- "Synergizes with" list

### 17.5 Dungeon Summary on Plan Screen

A small "Dungeon Stats" panel in the right sidebar during plan phase showing:
- Total gold invested so far
- Estimated total DPS (rough calculation)
- Number of each tool type placed
- Coverage % of path (how many path tiles are within range of at least one tower)

### 17.6 Pause Menu

During a wave, an Escape key or pause button should open a pause menu with:
- Resume
- Change volume
- View controls
- Restart wave (forfeit gold for this wave, keep grid)
- Return to main menu

### 17.7 First-Time Tutorial

When difficulty is selected and a new game starts (no save data), show a 5-step interactive tutorial:
1. "Click a Spike Plate from the left panel, then click a path tile to place it."
2. "Right-click the tile you just placed to see the sell option."
3. "Hover over the Dart Tower — notice the range ring preview."
4. "Click ⚔ Send Them In."
5. "Watch the battle log. Gold appears in the top bar when heroes die."

Skip button always visible. Tutorial doesn't appear for returning players.

---

## 18. Technical Improvements

### 18.1 Spatial Grid for Tower Lookups

The current Pass 2 tower targeting iterates all heroes for each tower: O(towers × heroes). With 150+ towers and 15 heroes, that's 2,250 distance calculations per frame. Optimize by building a spatial hash:

```javascript
// Divide grid into 4×4 regions
// For each tick, bucket heroes into regions
// Towers only check heroes in their own region + adjacent regions
// Reduces distance calculations by ~75%
```

### 18.2 Component Memoization

`ToolPalette`, `BattleLog`, and `HUD` re-render on every store tick (60× per second during waves). Add `React.memo` and `useCallback` wrappers to prevent unnecessary re-renders. Profile first to confirm this is measurable.

### 18.3 Shared Component Library

Extract the following repeated patterns into `src/components/shared/`:
- `StatCard` (used in ResultsScreen, VictoryScreen)
- `GeraldMemo` (memo box with from/text formatting)
- `PillBadge` (status indicator pill)
- `CinzelButton` (gold-styled primary button)
- `CinzelLabel` (small uppercase tracking label)

### 18.4 Design Token Centralization

All color values, font families, and spacing units are scattered as inline styles. Consolidate into CSS custom properties in `index.css`:

```css
:root {
  --color-easy: #20a060;
  --color-medium: #c8a048;
  --color-hard: #8b1a1a;
  --color-poison: #3d7a1a;
  --color-ice: #2a5f8b;
  --color-fire: #c4430a;
  --font-serif: 'Cinzel', serif;
  --font-italic: 'Crimson Text', serif;
}
```

### 18.5 pathfinding.js — Wire Up or Remove

The file exists and works but is never called during gameplay. Either:
- Wire it up properly for the path preview feature (Section 5.1 above) — recommended
- Remove it to reduce dead code if path preview isn't planned

### 18.6 ResultsScreen Treasure HP Ratio Fix

ResultsScreen uses `TREASURE_MAX_HP` constant instead of `treasureMaxHp` from store (which is difficulty-adjusted). On Easy mode, this creates a wrong ratio. Fix: import and use `treasureMaxHp` from store in ResultsScreen, same as HUD already does.

```javascript
// Change in ResultsScreen.jsx:
const treasureMaxHp = useGameStore(s => s.treasureMaxHp)  // add this
const hpRatio = treasureHp / treasureMaxHp  // use this instead of TREASURE_MAX_HP
```

---

## 19. Priority Matrix

Rate by: **Impact on Fun** × **Ease of Implementation**

### Tier 1 — Do These First (High Impact, Achievable)

| Feature | Impact | Effort | Notes |
|---|---|---|---|
| Audio system (synthesized SFX) | 🔥🔥🔥🔥🔥 | Medium | Single biggest quality of life improvement possible |
| Screen shake | 🔥🔥🔥🔥 | Low | ~50 lines in DungeonGrid.jsx |
| Floating damage numbers | 🔥🔥🔥🔥 | Low | Particles system first half |
| Bank gold spendable mid-wave | 🔥🔥🔥🔥 | Low | One new action in store |
| Hero death animation | 🔥🔥🔥 | Low | Add deathAnimation field to hero |
| Curse visual on hero sprite | 🔥🔥🔥 | Low | 5 lines in drawHeroSprite |
| Path preview wired up | 🔥🔥🔥 | Low | pathfinding.js already works |
| Expand Gerald commentary (×10) | 🔥🔥🔥 | Low | Just writing content |
| ResultsScreen treasure HP fix | 🔥🔥 | Trivial | 2-line fix |
| Range preview during wave phase | 🔥🔥 | Trivial | 1-line change |

### Tier 2 — Build Next (High Impact, More Work)

| Feature | Impact | Effort | Notes |
|---|---|---|---|
| Trap/tower upgrade system | 🔥🔥🔥🔥 | High | New store actions, new UI panel, new sprite tiers |
| Particle system | 🔥🔥🔥🔥 | Medium | Generic emitter + 8-10 effect presets |
| Save / load system | 🔥🔥🔥 | Medium | localStorage serialize/deserialize |
| Global events system | 🔥🔥🔥🔥 | Medium | New wave config field + event handler |
| Dark Lord's Demands | 🔥🔥🔥 | Medium | New wave config field + condition evaluation |
| New trap types (Pit, Pendulum, Electric) | 🔥🔥🔥 | Medium | constants + simulation + sprites each |
| Tooltip system | 🔥🔥🔥 | Medium | New React component, hover state |
| Combo recognition + notifications | 🔥🔥🔥 | Medium | Enrich death event with kill chain context |
| Tutorial overlay | 🔥🔥 | Medium | State machine + overlay component |
| Pause menu | 🔥🔥 | Low | Simple overlay with resume/volume/restart |

### Tier 3 — Long-Term Vision

| Feature | Impact | Effort | Notes |
|---|---|---|---|
| Campaign map + multiple layouts | 🔥🔥🔥🔥🔥 | Very High | New paths, UI, level select, star ratings |
| Boss heroes | 🔥🔥🔥🔥 | High | Custom sprites + entrance animation + dialogue |
| Endless mode | 🔥🔥🔥 | Low | Simple: keep scaling hpMult past wave 14 |
| Replay system | 🔥🔥🔥 | High | Event recording + playback engine |
| Achievements system | 🔥🔥🔥 | Medium | Achievement definitions + check hooks + UI |
| Leaderboard | 🔥🔥 | Low | localStorage-based, no server needed |
| Hero AI adaptations | 🔥🔥🔥 | Medium | Memory system in simulation |
| Background music (procedural) | 🔥🔥🔥 | High | Web Audio API music engine |
| Lich tower (new monster) | 🔥🔥🔥 | Medium | Resurrection mechanic is novel |
| Mimic Chest tower | 🔥🔥🔥 | Medium | Distraction mechanic, highly thematic |
| Grid snapshot sharing | 🔥🔥 | Low | JSON encode/decode layout |
| Spatial grid optimization | 🔥 | Medium | Only matters at 150+ towers + 20+ heroes |

---

## Closing Note

The core of this game — the dungeon loop, the wave escalation, the hero variety, the trap synergies — is genuinely solid. It plays well. The gaps are all in the *feel* layer: feedback, audio, ceremony, and reward.

The single most impactful thing you can do right now is **add audio**. A dungeon with clanging traps, monster growls, and the satisfying *crunch* of a boulder landing on the Berserker King is a completely different game than the one you currently have. Do that first.

Second most impactful: **make the bank gold spendable mid-wave**. The fantasy of "I have emergency gold — should I place one more Gargoyle while the Champion is still on the path?" is exactly the kind of high-stakes decision that makes tower defense addictive.

After that: **upgrade systems**. When a player looks at their Dart Tower that's been there since wave 1 and thinks "I've grown this into a Ballista," they care about it. Attachment to individual pieces is what keeps people playing.

Everything else is frosting on a cake that's already pretty good. Build in that order.

---

*Last updated to reflect codebase state after: difficulty system, 14 waves, 11 hero types, 16 towers/traps, hpMult scaling, 5 new monsters, in-wave placement, score scaling.*
