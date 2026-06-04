// ── Particle System ──
// Lightweight canvas 2D particle emitter for visual effects.
// Particles are colored squares/circles with velocity, gravity, drag, and lifetime.
// FloatingTexts are damage/event labels that float upward and fade.

export class ParticleSystem {
  constructor() {
    this.particles = []
    this.texts     = []
  }

  // ── Particle emitter ─────────────────────────────────────────────────────
  // x, y      — world pixel position
  // options   — shape of the burst
  emit(x, y, {
    count    = 10,
    color    = '#ffffff',
    colors   = null,       // if set, pick randomly from array instead of color
    speed    = 80,         // px/s base speed
    spread   = Math.PI * 2,
    angle    = -Math.PI / 2, // default: upward
    gravity  = 200,        // px/s²
    lifetime = 600,        // ms
    size     = 3,
    drag     = 0.97,
    circular = false,      // if true draw circle, else square
  } = {}) {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread
      const s = speed * (0.35 + Math.random() * 0.65)
      this.particles.push({
        x, y,
        vx:      Math.cos(a) * s,
        vy:      Math.sin(a) * s,
        life:    lifetime * (0.7 + Math.random() * 0.3),
        maxLife: lifetime,
        color:   colors ? colors[Math.floor(Math.random() * colors.length)] : color,
        size:    size * (0.5 + Math.random() * 0.8),
        gravity,
        drag,
        circular,
      })
    }
    // Hard cap — prevents perf degradation in long waves
    if (this.particles.length > 400) {
      this.particles = this.particles.slice(-400)
    }
  }

  // ── Floating text / damage number ────────────────────────────────────────
  emitText(x, y, text, color = '#ffffff', size = 11) {
    this.texts.push({
      x: x + (Math.random() - 0.5) * 10,  // slight horizontal scatter
      y,
      text:    String(text),
      color,
      size,
      life:    750,
      maxLife: 750,
      vy:      -45,
    })
    if (this.texts.length > 24) {
      this.texts = this.texts.slice(-24)
    }
  }

  // ── Update (call every frame with deltaMs) ────────────────────────────────
  update(deltaMs) {
    const dt = deltaMs / 1000

    for (const p of this.particles) {
      const dragFactor = Math.pow(p.drag, deltaMs / 16)
      p.vx  *= dragFactor
      p.vy  *= dragFactor
      p.x   += p.vx * dt
      p.y   += p.vy * dt
      p.vy  += p.gravity * dt
      p.life -= deltaMs
    }

    for (const t of this.texts) {
      t.y   += t.vy * dt
      t.vy  *= Math.pow(0.92, deltaMs / 16)
      t.life -= deltaMs
    }

    this.particles = this.particles.filter(p => p.life > 0)
    this.texts     = this.texts.filter(t => t.life > 0)
  }

  // ── Draw (call every frame, canvas already in correct transform) ──────────
  draw(ctx) {
    // Particles
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife)
      const s     = p.size * (0.3 + 0.7 * alpha)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle   = p.color
      if (p.circular) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, s / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
      }
      ctx.restore()
    }

    // Floating texts
    for (const t of this.texts) {
      const alpha = Math.max(0, t.life / t.maxLife)
      ctx.save()
      ctx.globalAlpha  = alpha
      ctx.fillStyle    = t.color
      ctx.font         = `bold ${t.size}px monospace`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      // Subtle text shadow for readability
      ctx.shadowColor  = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur   = 3
      ctx.fillText(t.text, t.x, t.y)
      ctx.restore()
    }
  }

  get isEmpty() {
    return this.particles.length === 0 && this.texts.length === 0
  }
}

// ── Pre-defined effect presets ────────────────────────────────────────────────
// Called by DungeonGrid to emit the right particles for each game event.

export const PARTICLE_EFFECTS = {
  // Hero death — blood burst
  blood: {
    count: 16, colors: ['#cc0000', '#aa0000', '#880000', '#ff2020'],
    speed: 90, spread: Math.PI * 2, angle: 0,
    gravity: 280, lifetime: 650, size: 3.5,
  },

  // Gold sparkle at treasure
  gold_sparkle: {
    count: 20, colors: ['#ffe066', '#ffd020', '#ffb800', '#fff0a0'],
    speed: 60, spread: Math.PI * 2, angle: -Math.PI / 2,
    gravity: -60, lifetime: 800, size: 3, circular: true,
  },

  // Spike trap trigger — metallic sparks
  spark: {
    count: 10, colors: ['#c8c8cc', '#a0a0b0', '#e0e0f0'],
    speed: 100, spread: Math.PI * 1.6, angle: -Math.PI / 2,
    gravity: 250, lifetime: 400, size: 2.5,
  },

  // Boulder crush — rock fragments
  rock: {
    count: 14, colors: ['#5e5e4a', '#4a3e2e', '#7a7a62', '#3e3e2e'],
    speed: 110, spread: Math.PI * 2, angle: 0,
    gravity: 320, lifetime: 600, size: 4, drag: 0.94,
  },

  // Fire tower — embers floating up
  ember: {
    count: 8, colors: ['#ff6a00', '#ff9020', '#ffb040', '#cc3000'],
    speed: 55, spread: Math.PI * 1.2, angle: -Math.PI / 2,
    gravity: -80, lifetime: 550, size: 2.5, circular: true,
  },

  // Poison tower — green bubbles rising
  bubble: {
    count: 7, colors: ['#40aa20', '#60cc30', '#80c840', '#3d7a1a'],
    speed: 35, spread: Math.PI * 1.4, angle: -Math.PI / 2,
    gravity: -50, lifetime: 650, size: 3, circular: true,
  },

  // Ice tower — crystal shards
  crystal: {
    count: 9, colors: ['#a0d8f0', '#60b0e0', '#c8ecff', '#ffffff'],
    speed: 75, spread: Math.PI * 1.8, angle: -Math.PI / 2,
    gravity: 120, lifetime: 500, size: 2.5,
  },

  // Cursed Idol / curse applied — dark purple wisps
  curse_wisp: {
    count: 8, colors: ['#8000cc', '#aa30ee', '#6000aa', '#cc00ff'],
    speed: 45, spread: Math.PI * 2, angle: -Math.PI / 2,
    gravity: -90, lifetime: 700, size: 3, circular: true,
  },

  // Dart tower — small impact chips
  dart_impact: {
    count: 5, colors: ['#c0c0a0', '#e0d8a0', '#808070'],
    speed: 60, spread: Math.PI * 1.4, angle: -Math.PI / 2,
    gravity: 180, lifetime: 350, size: 2,
  },

  // Skeleton — bone chips
  bone: {
    count: 6, colors: ['#d8c8a8', '#c8b898', '#e8d8b8'],
    speed: 65, spread: Math.PI * 1.6, angle: -Math.PI / 2,
    gravity: 220, lifetime: 450, size: 3,
  },

  // Slime — gooey splat
  slime: {
    count: 8, colors: ['#3d7a1a', '#4a9a20', '#2a6010'],
    speed: 50, spread: Math.PI * 1.8, angle: 0,
    gravity: 160, lifetime: 500, size: 3.5, circular: true,
  },

  // Vampire Bat — purple drain motes
  drain: {
    count: 6, colors: ['#6600aa', '#8800cc', '#440088'],
    speed: 40, spread: Math.PI * 1.5, angle: -Math.PI / 2,
    gravity: -70, lifetime: 600, size: 2.5, circular: true,
  },

  // Troll slam — heavy debris
  troll: {
    count: 14, colors: ['#704020', '#504030', '#303020', '#7a7a62'],
    speed: 120, spread: Math.PI * 2, angle: 0,
    gravity: 350, lifetime: 700, size: 5, drag: 0.92,
  },

  // Shadow Stalker — dark smoke puffs
  shadow: {
    count: 7, colors: ['#300050', '#200040', '#400060'],
    speed: 55, spread: Math.PI * 1.8, angle: 0,
    gravity: -40, lifetime: 600, size: 4, circular: true,
  },

  // Wraith rush — ethereal wisps
  wraith: {
    count: 8, colors: ['#8040cc', '#6020aa', '#a060ee'],
    speed: 50, spread: Math.PI * 1.6, angle: 0,
    gravity: -30, lifetime: 600, size: 3, circular: true,
  },

  // Gargoyle — stone chips
  gargoyle: {
    count: 8, colors: ['#606060', '#808080', '#484848'],
    speed: 80, spread: Math.PI * 1.6, angle: -Math.PI / 2,
    gravity: 240, lifetime: 500, size: 3,
  },

  // Tile placement stamp burst
  placement: {
    count: 8, colors: ['#e8c44a', '#c8a030', '#f0d060'],
    speed: 50, spread: Math.PI * 2, angle: 0,
    gravity: 100, lifetime: 350, size: 2.5,
  },

  // Hero spawn flash
  spawn_flash: {
    count: 10, colors: ['#e8c8ff', '#c8a0ff', '#a080ff'],
    speed: 40, spread: Math.PI * 2, angle: 0,
    gravity: -50, lifetime: 400, size: 2.5, circular: true,
  },
}
