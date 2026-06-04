// ── Dungeon Architect — Procedural Audio Engine ──────────────────────────────
//
// All sounds are synthesised with the Web Audio API — zero external files.
// Design philosophy: every sound should feel "dungeon-y" and distinct.
// Sounds are throttled to prevent audio spam from frequent tower attacks.
//
// Usage:
//   import { audio } from './audioEngine.js'
//   audio.init()          // call once on first user gesture
//   audio.play('dart_fire')
//   audio.setMasterVolume(0.8)
//   audio.toggleMute()

// ── Per-sound throttle intervals (ms) ─────────────────────────────────────────
// Prevents ear fatigue from rapid-fire towers. 0 = no throttle.
const THROTTLE = {
  dart_fire:      70,
  slime_fire:     60,
  skeleton_fire:  90,
  bat_fire:       80,
  idol_fire:      120,
  poison_fire:    150,
  ice_fire:       140,
  fire_fire:      160,
  shadow_fire:    180,
  gargoyle_fire:  200,
  wraith_fire:    200,
  troll_fire:     250,
  lava_damage:    400,
  curse_applied:  300,
}

// ── Synthesis helpers ─────────────────────────────────────────────────────────

function makeNoise(ctx, duration) {
  const n = Math.floor(ctx.sampleRate * duration)
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  return src
}

function ramp(param, ctx, from, to, duration) {
  param.setValueAtTime(from, ctx.currentTime)
  if (to > 0.0001) param.exponentialRampToValueAtTime(to, ctx.currentTime + duration)
  else              param.linearRampToValueAtTime(0, ctx.currentTime + duration)
}

// Play a single oscillator tone and auto-stop it
function tone(ctx, dest, { type = 'sine', freq = 440, freqEnd, duration = 0.2,
  vol = 0.3, attack = 0.005, decay, filter } = {}) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (freqEnd && freqEnd > 0)
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration)

  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + attack)
  const off = decay ?? duration
  gain.gain.exponentialRampToValueAtTime(0.0001, t + off)

  let node = gain
  if (filter) {
    const f = ctx.createBiquadFilter()
    f.type = filter.type ?? 'lowpass'
    f.frequency.value = filter.freq ?? 2000
    f.Q.value = filter.Q ?? 1
    gain.connect(f); f.connect(dest); node = null
    osc.connect(gain)
  } else {
    osc.connect(gain)
    gain.connect(dest)
  }

  osc.start(t); osc.stop(t + duration + 0.05)
}

// Noise burst through a filter
function noiseBurst(ctx, dest, { filterType = 'bandpass', filterFreq = 1000,
  Q = 2, duration = 0.2, vol = 0.3, attack = 0.003 } = {}) {
  const t = ctx.currentTime
  const src = makeNoise(ctx, duration + 0.02)
  const filter = ctx.createBiquadFilter()
  filter.type = filterType; filter.frequency.value = filterFreq; filter.Q.value = Q
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  src.connect(filter); filter.connect(gain); gain.connect(dest)
  src.start(t); src.stop(t + duration + 0.03)
}

// Random pitch multiplier for variety
const jitter = (amt = 0.12) => 1 + (Math.random() - 0.5) * amt

// ── Sound definitions ─────────────────────────────────────────────────────────
// Each function receives (ctx, dest) and synthesises one sound.

const SOUNDS = {

  // ── ON-PATH TRAPS ───────────────────────────────────────────────────────────

  spike_trigger(ctx, dest) {
    const p = jitter(0.25)
    // Metallic clang: triangle wave, falling frequency
    tone(ctx, dest, { type: 'triangle', freq: 640 * p, freqEnd: 140 * p,
      duration: 0.14, vol: 0.28, attack: 0.003,
      filter: { type: 'bandpass', freq: 2200, Q: 2.5 } })
    // Small spark noise
    noiseBurst(ctx, dest, { filterType: 'highpass', filterFreq: 3000,
      Q: 1, duration: 0.06, vol: 0.12 })
  },

  boulder_crush(ctx, dest) {
    const t = ctx.currentTime
    // Deep low thud
    const osc = ctx.createOscillator()
    const g1  = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(90, t)
    osc.frequency.exponentialRampToValueAtTime(18, t + 0.38)
    g1.gain.setValueAtTime(0.0001, t)
    g1.gain.exponentialRampToValueAtTime(0.65, t + 0.01)
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.38)
    osc.connect(g1); g1.connect(dest)
    osc.start(t); osc.stop(t + 0.4)
    // Rock-dust noise
    noiseBurst(ctx, dest, { filterType: 'lowpass', filterFreq: 500,
      Q: 1.2, duration: 0.25, vol: 0.38, attack: 0.005 })
    // High crack
    noiseBurst(ctx, dest, { filterType: 'bandpass', filterFreq: 2800,
      Q: 3, duration: 0.06, vol: 0.18, attack: 0.002 })
  },

  lava_damage(ctx, dest) {
    // Soft sizzle — very quiet, plays infrequently
    noiseBurst(ctx, dest, { filterType: 'bandpass', filterFreq: 2500 + Math.random() * 500,
      Q: 1.5, duration: 0.18, vol: 0.08 + Math.random() * 0.04 })
  },

  trap_disarmed(ctx, dest) {
    // Satisfying "clunk" — quick descending two-tone
    const p = jitter(0.1)
    tone(ctx, dest, { type: 'square', freq: 380 * p, freqEnd: 220 * p,
      duration: 0.1, vol: 0.18, attack: 0.005 })
  },

  // ── OFF-PATH TOWERS ─────────────────────────────────────────────────────────

  dart_fire(ctx, dest) {
    // Quick "pew" — short sine sweep
    const p = jitter(0.15)
    tone(ctx, dest, { type: 'sine', freq: 820 * p, freqEnd: 280 * p,
      duration: 0.07, vol: 0.15, attack: 0.002 })
  },

  fire_fire(ctx, dest) {
    // Whoosh + low boom
    noiseBurst(ctx, dest, { filterType: 'bandpass', filterFreq: 800,
      Q: 1.2, duration: 0.38, vol: 0.28, attack: 0.015 })
    tone(ctx, dest, { type: 'sine', freq: 65, freqEnd: 30,
      duration: 0.35, vol: 0.3, attack: 0.01 })
  },

  poison_fire(ctx, dest) {
    // Airy, slightly wet blob
    noiseBurst(ctx, dest, { filterType: 'lowpass', filterFreq: 700 + Math.random() * 300,
      Q: 0.8, duration: 0.42, vol: 0.13, attack: 0.02 })
    tone(ctx, dest, { type: 'sine', freq: 220 + Math.random() * 60, freqEnd: 140,
      duration: 0.3, vol: 0.07, attack: 0.04 })
  },

  ice_fire(ctx, dest) {
    // Crystalline "ting" with manual reverb tail
    const p = jitter(0.08)
    const delays = [0, 0.03, 0.07, 0.13]
    const vols   = [0.22, 0.14, 0.08, 0.04]
    delays.forEach((d, i) => {
      const t = ctx.currentTime
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 2400 * p
      gain.gain.setValueAtTime(0.0001, t + d)
      gain.gain.exponentialRampToValueAtTime(vols[i], t + d + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.22)
      osc.connect(gain); gain.connect(dest)
      osc.start(t + d); osc.stop(t + d + 0.25)
    })
  },

  skeleton_fire(ctx, dest) {
    // Metallic sword impact — two harmonics + brief noise
    const p = jitter(0.12)
    tone(ctx, dest, { type: 'sawtooth', freq: 420 * p, freqEnd: 200 * p,
      duration: 0.18, vol: 0.18, attack: 0.003,
      filter: { type: 'bandpass', freq: 1400, Q: 2 } })
    tone(ctx, dest, { type: 'sawtooth', freq: 840 * p, freqEnd: 400 * p,
      duration: 0.12, vol: 0.10, attack: 0.002,
      filter: { type: 'bandpass', freq: 2800, Q: 2 } })
    noiseBurst(ctx, dest, { filterType: 'bandpass', filterFreq: 3500,
      Q: 2.5, duration: 0.05, vol: 0.12 })
  },

  slime_fire(ctx, dest) {
    // Bubble pop — very short sine drop
    const p = jitter(0.2)
    tone(ctx, dest, { type: 'sine', freq: 280 * p, freqEnd: 55 * p,
      duration: 0.055, vol: 0.17, attack: 0.003 })
  },

  bat_fire(ctx, dest) {
    // Fast wing flutter + brief bite
    const t = ctx.currentTime
    // Amplitude-modulated noise = flutter
    const src = makeNoise(ctx, 0.22)
    const modOsc = ctx.createOscillator()
    const modGain = ctx.createGain()
    modOsc.frequency.value = 28
    modGain.gain.value = 0.5
    modOsc.connect(modGain)

    const mainGain = ctx.createGain()
    mainGain.gain.setValueAtTime(0.0001, t)
    mainGain.gain.exponentialRampToValueAtTime(0.18, t + 0.01)
    mainGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'; filter.frequency.value = 3500; filter.Q.value = 1.5

    // Naive ring-mod approximation: multiply noise through a gain node
    src.connect(filter)
    filter.connect(mainGain)
    mainGain.connect(dest)
    modOsc.start(t); modOsc.stop(t + 0.23)
    src.start(t); src.stop(t + 0.23)
  },

  wraith_fire(ctx, dest) {
    // Haunting doppler-ish whoosh: two detuned saws sweeping
    const p = jitter(0.1)
    tone(ctx, dest, { type: 'sawtooth', freq: 360 * p, freqEnd: 120 * p,
      duration: 0.45, vol: 0.16, attack: 0.04,
      filter: { type: 'bandpass', freq: 900, Q: 1.5 } })
    tone(ctx, dest, { type: 'sawtooth', freq: 366 * p, freqEnd: 124 * p,
      duration: 0.45, vol: 0.12, attack: 0.04,
      filter: { type: 'bandpass', freq: 900, Q: 1.5 } })
    noiseBurst(ctx, dest, { filterType: 'bandpass', filterFreq: 1200,
      Q: 1, duration: 0.3, vol: 0.07, attack: 0.03 })
  },

  troll_fire(ctx, dest) {
    // Bone-rattling ground slam — should be felt
    const t = ctx.currentTime
    // Sub bass thud
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(52, t)
    osc.frequency.exponentialRampToValueAtTime(16, t + 0.5)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    osc.connect(g); g.connect(dest)
    osc.start(t); osc.stop(t + 0.52)
    // Low rumble noise
    noiseBurst(ctx, dest, { filterType: 'lowpass', filterFreq: 350,
      Q: 1, duration: 0.35, vol: 0.45, attack: 0.008 })
    // High crunch on impact
    noiseBurst(ctx, dest, { filterType: 'bandpass', filterFreq: 2200,
      Q: 3, duration: 0.07, vol: 0.22, attack: 0.002 })
  },

  shadow_fire(ctx, dest) {
    // Dark dissonant swoosh
    const p = jitter(0.1)
    tone(ctx, dest, { type: 'sawtooth', freq: 700 * p, freqEnd: 180 * p,
      duration: 0.32, vol: 0.14, attack: 0.01,
      filter: { type: 'lowpass', freq: 1400, Q: 1.5 } })
    tone(ctx, dest, { type: 'sawtooth', freq: 360 * p, freqEnd: 90 * p,
      duration: 0.32, vol: 0.10, attack: 0.01,
      filter: { type: 'lowpass', freq: 900, Q: 1 } })
  },

  idol_fire(ctx, dest) {
    // Slow eerie pulse — ominous magic
    const p = jitter(0.06)
    const t = ctx.currentTime
    // Slowly wobbling sine pair (beating)
    tone(ctx, dest, { type: 'sine', freq: 380 * p, duration: 0.42,
      vol: 0.14, attack: 0.04, decay: 0.42 })
    tone(ctx, dest, { type: 'sine', freq: 384 * p, duration: 0.42,
      vol: 0.10, attack: 0.04, decay: 0.42 })
    // Quiet noise hiss
    noiseBurst(ctx, dest, { filterType: 'bandpass', filterFreq: 1800,
      Q: 2, duration: 0.2, vol: 0.06, attack: 0.05 })
  },

  gargoyle_fire(ctx, dest) {
    // Stone chunk hurled — crunch on impact
    noiseBurst(ctx, dest, { filterType: 'bandpass', filterFreq: 600,
      Q: 1.5, duration: 0.18, vol: 0.32, attack: 0.004 })
    tone(ctx, dest, { type: 'sine', freq: 95, freqEnd: 30,
      duration: 0.16, vol: 0.28, attack: 0.005 })
  },

  curse_applied(ctx, dest) {
    // Brief dark "hex" chime
    const p = jitter(0.08)
    tone(ctx, dest, { type: 'sine', freq: 320 * p, freqEnd: 240 * p,
      duration: 0.28, vol: 0.12, attack: 0.01,
      filter: { type: 'bandpass', freq: 600, Q: 2 } })
  },

  // ── HERO EVENTS ─────────────────────────────────────────────────────────────

  hero_death(ctx, dest) {
    // Descending 3-note minor arpeggio — sad and final
    const t  = ctx.currentTime
    const p  = jitter(0.08)
    const notes = [440 * p, 370 * p, 294 * p]  // A4 → F#4 → D4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = t + i * 0.11
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
      osc.connect(gain); gain.connect(dest)
      osc.start(start); osc.stop(start + 0.22)
    })
  },

  gold_pickup(ctx, dest) {
    // Three ascending coin chimes — bright and satisfying
    const t     = ctx.currentTime
    const freqs = [880, 1100, 1320]  // ascending perfect thirds
    freqs.forEach((freq, i) => {
      const p    = jitter(0.04)
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = t + i * 0.055
      osc.type = 'sine'
      osc.frequency.value = freq * p
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)
      osc.connect(gain); gain.connect(dest)
      osc.start(start); osc.stop(start + 0.2)
    })
  },

  treasure_damaged(ctx, dest) {
    // Ominous deep alarm — treasure is in danger
    tone(ctx, dest, { type: 'sine', freq: 80, freqEnd: 55,
      duration: 0.6, vol: 0.5, attack: 0.01 })
    tone(ctx, dest, { type: 'sine', freq: 400, freqEnd: 320,
      duration: 0.35, vol: 0.18, attack: 0.01 })
    noiseBurst(ctx, dest, { filterType: 'lowpass', filterFreq: 300,
      Q: 1, duration: 0.3, vol: 0.15, attack: 0.01 })
  },

  hero_escaped_gold(ctx, dest) {
    // Two-tone alarm — shame and urgency
    const t = ctx.currentTime
    const pairs = [
      [0,    800], [0.14, 600], [0.28, 800], [0.42, 600],
    ]
    pairs.forEach(([delay, freq]) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      const s = t + delay
      osc.type = 'square'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, s)
      gain.gain.exponentialRampToValueAtTime(0.2, s + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, s + 0.12)
      osc.connect(gain); gain.connect(dest)
      osc.start(s); osc.stop(s + 0.14)
    })
  },

  // ── WAVE EVENTS ─────────────────────────────────────────────────────────────

  wave_start(ctx, dest) {
    // Rising tension: low rumble crescendo + sweeping tone
    const t = ctx.currentTime
    noiseBurst(ctx, dest, { filterType: 'lowpass', filterFreq: 180,
      Q: 0.8, duration: 0.9, vol: 0.3, attack: 0.15 })
    tone(ctx, dest, { type: 'sine', freq: 180, freqEnd: 640,
      duration: 0.7, vol: 0.25, attack: 0.05 })
    // Short horn-like blast
    tone(ctx, dest, { type: 'sawtooth', freq: 220, duration: 0.5,
      vol: 0.15, attack: 0.06,
      filter: { type: 'lowpass', freq: 800, Q: 1 } })
  },

  wave_cleared(ctx, dest) {
    // Major resolution chord — C E G ascending
    const t = ctx.currentTime
    const notes = [523, 659, 784]   // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      const s = t + i * 0.06
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, s)
      gain.gain.exponentialRampToValueAtTime(0.18, s + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, s + 0.55)
      osc.connect(gain); gain.connect(dest)
      osc.start(s); osc.stop(s + 0.6)
    })
  },

  // ── UPGRADE / ECONOMY ───────────────────────────────────────────────────────

  upgrade_unlock(ctx, dest) {
    // Ascending chime pair — bright unlock sound
    [880, 1100].forEach((freq, i) => {
      const t   = ctx.currentTime + i * 0.1
      const osc = ctx.createOscillator()
      const g   = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = freq
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
      osc.connect(g); g.connect(dest)
      osc.start(t); osc.stop(t + 0.32)
    })
  },

  upgrade_gold(ctx, dest) {
    // Coin cascade — three quick descending chimes
    [1320, 1100, 880].forEach((freq, i) => {
      const t   = ctx.currentTime + i * 0.07
      const osc = ctx.createOscillator()
      const g   = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = freq
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
      osc.connect(g); g.connect(dest)
      osc.start(t); osc.stop(t + 0.25)
    })
  },

  // ── PLACEMENT ───────────────────────────────────────────────────────────────

  tile_placed(ctx, dest) {
    // Soft satisfying thud — confidence
    noiseBurst(ctx, dest, { filterType: 'bandpass', filterFreq: 800,
      Q: 3, duration: 0.06, vol: 0.14, attack: 0.002 })
    tone(ctx, dest, { type: 'sine', freq: 200, freqEnd: 140,
      duration: 0.06, vol: 0.1, attack: 0.003 })
  },

  tile_removed(ctx, dest) {
    // Slightly lighter "reverse" click
    tone(ctx, dest, { type: 'sine', freq: 160, freqEnd: 240,
      duration: 0.05, vol: 0.1, attack: 0.003 })
    noiseBurst(ctx, dest, { filterType: 'bandpass', filterFreq: 600,
      Q: 3, duration: 0.04, vol: 0.1, attack: 0.002 })
  },

  // ── UI ───────────────────────────────────────────────────────────────────────

  btn_click(ctx, dest) {
    noiseBurst(ctx, dest, { filterType: 'bandpass', filterFreq: 1200,
      Q: 4, duration: 0.035, vol: 0.1, attack: 0.001 })
  },

  difficulty_easy(ctx, dest) {
    // Bright, uplifting two-tone
    tone(ctx, dest, { type: 'sine', freq: 660, duration: 0.12, vol: 0.16, attack: 0.005 })
    setTimeout(() => {
      if (ctx.state !== 'closed')
        tone(ctx, dest, { type: 'sine', freq: 880, duration: 0.14, vol: 0.14, attack: 0.005 })
    }, 80)
  },

  difficulty_medium(ctx, dest) {
    // Neutral single tone
    tone(ctx, dest, { type: 'sine', freq: 520, duration: 0.16, vol: 0.15, attack: 0.008 })
  },

  difficulty_hard(ctx, dest) {
    // Ominous low tone
    tone(ctx, dest, { type: 'sawtooth', freq: 180, freqEnd: 140,
      duration: 0.28, vol: 0.18, attack: 0.01,
      filter: { type: 'lowpass', freq: 600, Q: 1.5 } })
  },
}

// ── Engine class ──────────────────────────────────────────────────────────────

class AudioEngine {
  constructor() {
    this.ctx          = null
    this.masterGain   = null
    this.sfxGain      = null
    this.initialized  = false
    this.muted        = false
    this.masterVolume = 0.75
    this.sfxVolume    = 1.0
    this._throttleMap = new Map()
    this._loadPrefs()
  }

  // Must be called inside a user-gesture handler (click, keydown, etc.)
  init() {
    if (this.initialized) return
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
      this.masterGain = this.ctx.createGain()
      this.sfxGain    = this.ctx.createGain()
      this.sfxGain.connect(this.masterGain)
      this.masterGain.connect(this.ctx.destination)
      this._applyVolumes()
      this.initialized = true
    } catch (e) {
      console.warn('[Audio] Web Audio API unavailable:', e)
    }
  }

  play(soundId, opts = {}) {
    if (!this.initialized || !this.ctx) return
    // Resume if browser suspended the context
    if (this.ctx.state === 'suspended') this.ctx.resume()
    if (this.ctx.state === 'closed')    return

    // Throttle check
    const interval = THROTTLE[soundId] ?? 0
    if (interval > 0) {
      const last = this._throttleMap.get(soundId) ?? 0
      const now  = Date.now()
      if (now - last < interval) return
      this._throttleMap.set(soundId, now)
    }

    const fn = SOUNDS[soundId]
    if (fn) {
      try { fn(this.ctx, this.sfxGain, opts) } catch (e) {
        // Swallow audio errors — they should never crash gameplay
      }
    }
  }

  setMasterVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, v))
    this._applyVolumes()
    this._savePrefs()
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v))
    this._applyVolumes()
    this._savePrefs()
  }

  setMuted(muted) {
    this.muted = muted
    this._applyVolumes()
    this._savePrefs()
  }

  toggleMute() {
    this.setMuted(!this.muted)
    return this.muted
  }

  _applyVolumes() {
    if (!this.masterGain) return
    this.masterGain.gain.value = this.muted ? 0 : this.masterVolume
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume
  }

  _loadPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem('da_audio') || '{}')
      this.masterVolume = saved.masterVolume ?? 0.75
      this.sfxVolume    = saved.sfxVolume    ?? 1.0
      this.muted        = saved.muted        ?? false
    } catch {}
  }

  _savePrefs() {
    try {
      localStorage.setItem('da_audio', JSON.stringify({
        masterVolume: this.masterVolume,
        sfxVolume:    this.sfxVolume,
        muted:        this.muted,
      }))
    } catch {}
  }
}

export const audio = new AudioEngine()
