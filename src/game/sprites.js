// ── Animated Sprite System ──
// All sprites are drawn with the canvas 2D API — no external assets.
// Hero sprites:  drawHeroSprite(ctx, cx, cy, t, hero)  — cx/cy = center
// Tile sprites:  TILE_SPRITES[tileId](ctx, x, y, t)    — x/y = tile top-left

// ── Animation helpers ──────────────────────────────────────────────────────

const osc   = (t, speed = 0.004) => (Math.sin(t * speed) + 1) / 2        // 0→1 smooth loop
const swing = (t, speed = 0.007) => Math.sin(t * speed)                   // -1→1 smooth loop
const pulse = (t, speed = 0.006) => Math.abs(Math.sin(t * speed))         // 0→1→0 bounce
const step  = (t, frames, fps = 150) => Math.floor(t / fps) % frames      // frame counter


// ── HERO SPRITES ────────────────────────────────────────────────────────────

// Knight: plate armour, sword, shield, stomping walk
export function drawKnight(ctx, cx, cy, t, hero = {}) {
  const bob  = swing(t, 0.007) * 1.5
  const lean = swing(t, 0.007) * 0.06
  const lLeg = swing(t, 0.009) * 6
  const rLeg = -lLeg

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + bob))
  ctx.rotate(lean)

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath(); ctx.ellipse(0, 17, 11, 4, 0, 0, Math.PI * 2); ctx.fill()

  // greaves / boots
  ctx.fillStyle = '#4a4a5e'
  ctx.fillRect(-7, 8 + lLeg * 0.4, 6, 9)
  ctx.fillRect( 1, 8 + rLeg * 0.4, 6, 9)
  ctx.fillStyle = '#2a2a38'
  ctx.fillRect(-8, 15 + lLeg * 0.4, 7, 3)
  ctx.fillRect( 1, 15 + rLeg * 0.4, 7, 3)

  // hauberk / body
  ctx.fillStyle = '#6e6e82'
  ctx.fillRect(-9, -5, 18, 15)
  // breastplate
  ctx.fillStyle = '#8a8a9e'
  ctx.fillRect(-8, -4, 16, 12)
  ctx.fillStyle = '#c8a040'
  ctx.fillRect(-8, -4, 16, 2)   // top trim
  ctx.fillRect(-8,  7, 16, 2)   // bottom trim
  // cross emblem
  ctx.fillStyle = '#d8b050'
  ctx.fillRect(-1, -2, 2, 9)
  ctx.fillRect(-4,  1, 8, 2)

  // pauldrons
  ctx.fillStyle = '#7a7a90'
  ctx.fillRect(-13, -6, 6, 5)
  ctx.fillRect(  7, -6, 6, 5)

  // shield (left)
  ctx.fillStyle = '#7a1818'
  ctx.fillRect(-18, -8, 8, 14)
  ctx.fillStyle = '#c82020'
  ctx.fillRect(-17, -7, 6, 12)
  ctx.fillStyle = '#d8b050'
  ctx.fillRect(-15, -3, 4, 6)

  // sword (right) — slight sway
  const sway = swing(t, 0.007) * 2
  ctx.fillStyle = '#c8c8d8'
  ctx.fillRect(10 + sway * 0.3, -16 + sway, 3, 20)
  ctx.fillStyle = '#d8a840'
  ctx.fillRect( 8, -8, 7, 3)  // crossguard
  ctx.fillStyle = '#9a7830'
  ctx.fillRect(10, -5, 3, 6)  // grip

  // helmet
  ctx.fillStyle = '#7a7a90'
  ctx.fillRect(-7, -22, 14, 18)
  ctx.fillStyle = '#8e8ea4'
  ctx.fillRect(-5, -26, 10, 7)   // top dome
  // nasal / visor
  ctx.fillStyle = '#1e1e2e'
  ctx.fillRect(-5, -17, 10, 5)
  // visor glow slit
  ctx.fillStyle = `rgba(255,200,60,${0.3 + osc(t, 0.005) * 0.4})`
  ctx.fillRect(-4, -15, 8, 2)

  // poison tint
  if (hero.poisoned) {
    ctx.fillStyle = 'rgba(50,220,80,0.18)'
    ctx.fillRect(-18, -26, 36, 46)
  }

  ctx.restore()
}


// Mage: pointed hat, robes, glowing staff
export function drawMage(ctx, cx, cy, t, hero = {}) {
  const bob      = swing(t, 0.006) * 1.5
  const staffSw  = swing(t, 0.004) * 3
  const orbGlow  = osc(t, 0.005)
  const lLeg     = swing(t, 0.008) * 4
  const rLeg     = -lLeg

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + bob))

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath(); ctx.ellipse(0, 17, 9, 3, 0, 0, Math.PI * 2); ctx.fill()

  // robe hem (legs hidden under robe)
  ctx.fillStyle = '#4a2e8e'
  ctx.fillRect(-8, 7, 16, 10)
  ctx.fillRect(-10, 10, 20, 7)  // wider at hem
  // robe shimmer
  ctx.fillStyle = '#5a3aa0'
  ctx.fillRect(-6, 8, 12, 8)

  // robe body
  ctx.fillStyle = '#5a3aa0'
  ctx.fillRect(-8, -5, 16, 14)
  // robe trim (gold)
  ctx.fillStyle = '#c8a040'
  ctx.fillRect(-8, -5, 2, 14)
  ctx.fillRect( 6, -5, 2, 14)
  ctx.fillRect(-8, 12, 16, 2)
  // stars on robe
  ctx.fillStyle = `rgba(200,180,255,${0.3 + orbGlow * 0.3})`
  ctx.fillRect(-4, -2, 2, 2); ctx.fillRect(2, 2, 2, 2); ctx.fillRect(-2, 6, 2, 2)

  // staff
  const stx = 10 + staffSw * 0.5
  const sty = -staffSw * 0.4
  ctx.fillStyle = '#7a5a22'
  ctx.fillRect(stx, sty - 22, 3, 38)
  // orb glow halo
  ctx.fillStyle = `rgba(220,80,80,${0.1 + orbGlow * 0.3})`
  ctx.beginPath(); ctx.arc(stx + 1.5, sty - 24, 10, 0, Math.PI * 2); ctx.fill()
  // orb
  ctx.fillStyle = `rgb(${180 + orbGlow * 75|0}, 50, 50)`
  ctx.beginPath(); ctx.arc(stx + 1.5, sty - 24, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,200,200,0.7)'
  ctx.beginPath(); ctx.arc(stx - 0.5, sty - 26, 2.5, 0, Math.PI * 2); ctx.fill()

  // left arm / sleeve
  ctx.fillStyle = '#4a2e8e'
  ctx.fillRect(-14, -4, 6, 10)
  ctx.fillStyle = '#e8c890'
  ctx.fillRect(-15, 4, 5, 4)  // hand

  // head / face
  ctx.fillStyle = '#e8c890'
  ctx.fillRect(-6, -16, 12, 12)
  // eyes
  ctx.fillStyle = '#1a1010'
  ctx.fillRect(-4, -12, 3, 3)
  ctx.fillRect( 1, -12, 3, 3)
  ctx.fillStyle = `rgba(200,80,80,${0.5 + orbGlow * 0.5})`
  ctx.fillRect(-3, -11, 2, 2)
  ctx.fillRect( 2, -11, 2, 2)
  // beard
  ctx.fillStyle = '#c8c8b0'
  ctx.fillRect(-4, -7, 8, 3)

  // hat brim
  ctx.fillStyle = '#2e1e6e'
  ctx.fillRect(-10, -18, 20, 4)
  // hat cone (built from stacked rects)
  ctx.fillStyle = '#3a2880'
  ctx.fillRect(-7, -24, 14, 7)
  ctx.fillRect(-5, -30, 10, 7)
  ctx.fillRect(-3, -36, 6, 7)
  ctx.fillRect(-1, -42, 2, 7)
  // star on hat
  ctx.fillStyle = `rgba(255,220,80,${0.5 + orbGlow * 0.5})`
  ctx.fillRect(-2, -28, 4, 2); ctx.fillRect(-1, -30, 2, 6)

  if (hero.poisoned) {
    ctx.fillStyle = 'rgba(50,220,80,0.18)'
    ctx.fillRect(-15, -42, 32, 60)
  }
  ctx.restore()
}


// Thief: dark hood, twin daggers, quick scurrying walk
export function drawThief(ctx, cx, cy, t, hero = {}) {
  const bob  = swing(t, 0.012) * 1.2
  const lLeg = swing(t, 0.012) * 7
  const rLeg = -lLeg
  const lean = swing(t, 0.012) * 0.08

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + bob))
  ctx.rotate(lean)

  // shadow (small — thief is quick and light)
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath(); ctx.ellipse(0, 15, 8, 3, 0, 0, Math.PI * 2); ctx.fill()

  // legs (dark pants)
  ctx.fillStyle = '#1e2e1e'
  ctx.fillRect(-5, 6 + lLeg * 0.35, 4, 8)
  ctx.fillRect( 1, 6 + rLeg * 0.35, 4, 8)
  // boots
  ctx.fillStyle = '#3a2210'
  ctx.fillRect(-6, 12 + lLeg * 0.35, 5, 3)
  ctx.fillRect( 1, 12 + rLeg * 0.35, 5, 3)

  // torso / cloak
  ctx.fillStyle = '#2a3e2a'
  ctx.fillRect(-6, -4, 12, 12)
  // cloak detail
  ctx.fillStyle = '#1e301e'
  ctx.fillRect(-7, -3, 3, 10)
  // belt & pouches
  ctx.fillStyle = '#4a3010'
  ctx.fillRect(-6, 4, 12, 2)
  ctx.fillStyle = '#6a4818'
  ctx.fillRect(-4, 4, 3, 3); ctx.fillRect(2, 4, 3, 3)

  // daggers
  ctx.fillStyle = '#b0b0c0'
  ctx.fillRect(-14, -2, 2, 12)   // left blade
  ctx.fillRect( 12, -2, 2, 12)   // right blade
  ctx.fillStyle = '#5a3010'
  ctx.fillRect(-15, -6, 4, 5)    // left grip
  ctx.fillRect( 11, -6, 4, 5)    // right grip
  ctx.fillStyle = '#8a8a9a'
  ctx.fillRect(-15, -1, 5, 2)    // left guard
  ctx.fillRect( 10, -1, 5, 2)    // right guard

  // hood (drawn last to be on top)
  ctx.fillStyle = '#1e2e1e'
  ctx.fillRect(-8, -20, 16, 18)   // hood body
  ctx.fillRect(-6, -24, 12,  6)   // hood top curve approximation
  // face (partially hidden by hood)
  ctx.fillStyle = '#c8a070'
  ctx.fillRect(-5, -16, 10,  8)
  // scarf
  ctx.fillStyle = '#162016'
  ctx.fillRect(-6, -11, 12,  5)
  // eyes (above scarf)
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(-3, -14, 2, 2)
  ctx.fillRect( 1, -14, 2, 2)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillRect(-2, -14, 1, 1)
  ctx.fillRect( 2, -14, 1, 1)

  if (hero.poisoned) {
    ctx.fillStyle = 'rgba(50,220,80,0.18)'
    ctx.fillRect(-15, -24, 32, 42)
  }
  ctx.restore()
}


// Paladin: golden armour, radiant shield, slow but glowing
export function drawPaladin(ctx, cx, cy, t, hero = {}) {
  const bob   = swing(t, 0.005) * 1.2
  const lLeg  = swing(t, 0.005) * 5
  const rLeg  = -lLeg
  const aura  = osc(t, 0.003)
  const shGlow= osc(t, 0.004)

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + bob))

  // divine aura ring
  ctx.fillStyle = `rgba(255,255,150,${0.04 + aura * 0.08})`
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill()

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath(); ctx.ellipse(0, 18, 12, 4, 0, 0, Math.PI * 2); ctx.fill()

  // greaves
  ctx.fillStyle = '#8a8830'
  ctx.fillRect(-8, 9 + lLeg * 0.4, 7, 9)
  ctx.fillRect( 1, 9 + rLeg * 0.4, 7, 9)
  // sabaton (foot)
  ctx.fillStyle = '#a0a038'
  ctx.fillRect(-9, 16 + lLeg * 0.4, 8, 3)
  ctx.fillRect( 1, 16 + rLeg * 0.4, 8, 3)

  // body — golden plate (chunky)
  ctx.fillStyle = '#909018'
  ctx.fillRect(-11, -7, 22, 18)
  ctx.fillStyle = '#b8b828'
  ctx.fillRect(-10, -6, 20, 15)
  // trim
  ctx.fillStyle = '#d8d840'
  ctx.fillRect(-10, -6, 20, 2)
  ctx.fillRect(-10, 8, 20, 2)
  // holy cross
  ctx.fillStyle = 'rgba(255,255,200,0.9)'
  ctx.fillRect( -1, -5, 2, 12)
  ctx.fillRect( -5,  0, 10,  2)

  // pauldrons (wide)
  ctx.fillStyle = '#a0a020'
  ctx.fillRect(-17, -9, 7, 6)
  ctx.fillRect( 10, -9, 7, 6)

  // large radiant shield (left)
  ctx.fillStyle = `rgba(180,180,40,${0.25 + shGlow * 0.4})`
  ctx.fillRect(-22, -12, 11, 18)
  ctx.fillStyle = '#c0c030'
  ctx.fillRect(-21, -11, 9, 16)
  ctx.fillStyle = '#e0e050'
  ctx.fillRect(-20, -7, 7, 8)
  // shield cross
  ctx.fillStyle = `rgba(255,255,220,${0.7 + shGlow * 0.3})`
  ctx.fillRect(-18, -5, 5, 2)
  ctx.fillRect(-17, -7, 3, 6)

  // mace (right)
  ctx.fillStyle = '#808080'
  ctx.fillRect(11, -12, 3, 18)
  ctx.fillStyle = '#b0b0a0'
  ctx.fillRect( 9, -14, 7, 8)
  ctx.fillRect( 8, -12, 9, 4)

  // helmet (great helm)
  ctx.fillStyle = '#909018'
  ctx.fillRect(-8, -24, 16, 20)
  ctx.fillStyle = '#a8a820'
  ctx.fillRect(-6, -28, 12,  6)
  // holy plume
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(-2, -36, 4, 10)
  ctx.fillStyle = '#e0e050'
  ctx.fillRect(-2, -32, 4,  3)
  // visor glow
  ctx.fillStyle = `rgba(255,255,150,${0.55 + shGlow * 0.45})`
  ctx.fillRect(-5, -18, 10, 4)

  if (hero.poisoned) {
    ctx.fillStyle = 'rgba(50,220,80,0.18)'
    ctx.fillRect(-22, -36, 44, 58)
  }
  ctx.restore()
}


// ── TILE SPRITES ─────────────────────────────────────────────────────────────
// Each takes (ctx, tx, ty, t) where tx/ty = tile top-left (multiples of TILE_SIZE=48)

const TS = 48  // tile size

// Skeleton Guard tower
export function drawSkeletonTile(ctx, tx, ty, t) {
  const cx = tx + TS / 2
  const cy = ty + TS * 0.55
  const patrol = swing(t, 0.003) * 3
  const eyeG   = osc(t, 0.005)

  ctx.save()
  ctx.translate(patrol, 0)

  // legs/feet
  ctx.fillStyle = '#a09070'
  ctx.fillRect(cx - 5, cy + 8,  4, 9);  ctx.fillRect(cx + 1,  cy + 8,  4, 9)
  ctx.fillRect(cx - 7, cy + 16, 6, 3);  ctx.fillRect(cx - 1,  cy + 16, 6, 3)

  // ribcage
  ctx.fillStyle = '#c8b89a'
  ctx.fillRect(cx - 7, cy - 4, 14, 14)
  ctx.fillStyle = '#12100e'
  for (let i = 0; i < 4; i++) ctx.fillRect(cx - 5, cy - 2 + i * 3, 10, 1)
  ctx.fillStyle = '#c8b89a'
  ctx.fillRect(cx - 1, cy - 4, 2, 14)  // spine

  // arms
  ctx.fillStyle = '#a09070'
  ctx.fillRect(cx - 16, cy - 3, 8, 3)
  ctx.fillRect(cx - 14, cy,     3, 8)
  ctx.fillRect(cx +  8, cy - 3, 8, 3)
  ctx.fillRect(cx + 11, cy,     3, 8)

  // rusty sword
  ctx.fillStyle = '#7a5030'
  ctx.fillRect(cx + 12, cy - 18, 3, 24)
  ctx.fillStyle = '#6a6a7a'
  ctx.fillRect(cx + 10, cy - 16, 7,  2)

  // skull
  ctx.fillStyle = '#d8c8a8'
  ctx.fillRect(cx - 8, cy - 20, 16, 18)
  ctx.fillRect(cx - 6, cy - 24, 12,  6)
  // jaw slots
  ctx.fillStyle = '#12100e'
  ctx.fillRect(cx - 6, cy - 5,  3, 4)
  ctx.fillRect(cx - 1, cy - 5,  3, 4)
  ctx.fillRect(cx + 3, cy - 5,  3, 4)
  // eyes
  ctx.fillStyle = `rgba(255,50,50,${0.7 + eyeG * 0.3})`
  ctx.fillRect(cx - 7, cy - 17, 5, 5)
  ctx.fillRect(cx + 2, cy - 17, 5, 5)
  ctx.fillStyle = `rgba(255,160,160,${eyeG * 0.8})`
  ctx.fillRect(cx - 6, cy - 16, 3, 3)
  ctx.fillRect(cx + 3, cy - 16, 3, 3)

  ctx.restore()
}


// Slime tower
export function drawSlimeTile(ctx, tx, ty, t) {
  const cx     = tx + TS / 2
  const cy     = ty + TS * 0.62
  const sq     = pulse(t, 0.007)
  const scaleY = 0.78 + sq * 0.44
  const scaleX = 1   + (1 - sq) * 0.24
  const blink  = (Math.floor(t / 2000) % 6 === 0) ? 0 : 1

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scaleX, scaleY)

  // dark underbelly
  ctx.fillStyle = '#1a4008'
  ctx.beginPath(); ctx.ellipse(0, 4, 15, 10, 0, 0, Math.PI * 2); ctx.fill()
  // main body
  ctx.fillStyle = '#2a6010'
  ctx.beginPath(); ctx.ellipse(0, 1, 14, 12, 0, 0, Math.PI * 2); ctx.fill()
  // mid highlight
  ctx.fillStyle = '#3d8818'
  ctx.beginPath(); ctx.ellipse(-1, -1, 11, 9, 0, 0, Math.PI * 2); ctx.fill()
  // top shine
  ctx.fillStyle = '#5aaa22'
  ctx.beginPath(); ctx.ellipse(-2, -4, 7, 5.5, -0.3, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(180,255,100,0.45)'
  ctx.beginPath(); ctx.ellipse(-4, -6, 4, 3, -0.4, 0, Math.PI * 2); ctx.fill()

  // eyes
  if (blink) {
    ctx.fillStyle = '#0a1804'
    ctx.beginPath(); ctx.ellipse(-5, -3, 3.5, 3.5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse( 5, -3, 3.5, 3.5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.ellipse(-4, -4, 1.8, 1.8, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse( 6, -4, 1.8, 1.8, 0, 0, Math.PI * 2); ctx.fill()
  } else {
    ctx.fillStyle = '#0a1804'
    ctx.fillRect(-8, -5, 6, 2); ctx.fillRect(2, -5, 6, 2)
  }

  // drip
  const dp = (t * 0.0025) % (Math.PI * 2)
  ctx.fillStyle = '#3d7a1a'
  ctx.beginPath(); ctx.ellipse(6, 11 + Math.sin(dp) * 3, 2.5, 3.5 + Math.sin(dp) * 2, 0, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}


// Wraith tower
export function drawWraithTile(ctx, tx, ty, t) {
  const cx    = tx + TS / 2
  const cy    = ty + TS * 0.52
  const fl    = swing(t, 0.004) * 6
  const fadeV = osc(t, 0.003)
  const eyeG  = osc(t, 0.005)

  ctx.save()
  ctx.translate(cx, cy + fl)
  ctx.globalAlpha = 0.55 + fadeV * 0.45

  // wispy tail strands
  ctx.fillStyle = 'rgba(70,35,110,0.4)'
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.ellipse(swing(t * (0.002 + i * 0.001)) * 5, 14 + i * 6, 6 - i * 1.5, 3, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // robe body
  ctx.fillStyle = '#3a1e58'
  ctx.fillRect(-12, -18, 24, 30)
  // inner glow
  ctx.fillStyle = '#5a3278'
  ctx.fillRect(-10, -16, 20, 26)
  ctx.fillStyle = 'rgba(160,100,255,0.12)'
  ctx.fillRect(-7, -14, 14, 20)

  // side cloak drape
  ctx.fillStyle = 'rgba(80,40,120,0.7)'
  ctx.fillRect(-18, -12, 6, 20)
  ctx.fillRect( 12, -12, 6, 20)
  ctx.fillRect(-22, -8,  4, 14)
  ctx.fillRect( 18, -8,  4, 14)

  // hood
  ctx.fillStyle = '#2a1240'
  ctx.fillRect(-12, -30, 24, 14)
  ctx.fillRect(-10, -34, 20, 6)

  // head / face area
  ctx.fillStyle = '#3e1e5e'
  ctx.fillRect(-9, -28, 18, 12)

  // glowing eyes
  const ea = 0.65 + eyeG * 0.35
  ctx.fillStyle = `rgba(255,80,255,${ea})`
  ctx.beginPath(); ctx.ellipse(-5, -24, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse( 5, -24, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `rgba(255,200,255,0.85)`
  ctx.beginPath(); ctx.ellipse(-5, -25, 2,   2,   0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse( 5, -25, 2,   2,   0, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}


// Spike Plate — spikes extend and retract
export function drawSpike(ctx, tx, ty, t) {
  const ext  = pulse(t, 0.005)      // 0→1 extension
  const sH   = Math.round(ext * 28)
  const base = ty + TS - 10

  // floor plate
  ctx.fillStyle = '#28283a'
  ctx.fillRect(tx + 2, base, TS - 4, 8)
  ctx.fillStyle = '#38384e'
  ctx.fillRect(tx + 4, base + 1, TS - 8, 3)
  // grate slots
  ctx.fillStyle = '#18182a'
  for (let i = 0; i < 5; i++) ctx.fillRect(tx + 5 + i * 8, base + 1, 3, 7)

  // spikes
  const nS = 5
  const sp = (TS - 8) / nS
  for (let i = 0; i < nS; i++) {
    const sx = tx + 4 + sp * i + sp / 2
    if (sH <= 0) continue
    // shaft
    ctx.fillStyle = sH > 18 ? '#c0c0cc' : '#6a6a80'
    ctx.fillRect(sx - 3, base - sH, 6, sH)
    // tip
    ctx.fillStyle = '#e0e0f0'
    ctx.fillRect(sx - 1, base - sH, 2, 5)
    // blood if fully out
    if (sH > 22) {
      ctx.fillStyle = 'rgba(200,0,0,0.65)'
      ctx.fillRect(sx - 2, base - sH + 2, 4, 4)
    }
  }
}


// Rolling Boulder — rotates in place
export function drawBoulder(ctx, tx, ty, t) {
  const cx   = tx + TS / 2
  const cy   = ty + TS / 2 - 2
  const roll = t * 0.003

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath(); ctx.ellipse(cx, ty + TS - 6, 14, 5, 0, 0, Math.PI * 2); ctx.fill()

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(roll)

  // outer rock
  ctx.fillStyle = '#3e3e2e'
  ctx.beginPath(); ctx.ellipse(0, 0, 17, 16, 0, 0, Math.PI * 2); ctx.fill()
  // mid
  ctx.fillStyle = '#5e5e4a'
  ctx.beginPath(); ctx.ellipse(-1, -1, 15, 14, 0, 0, Math.PI * 2); ctx.fill()
  // surface highlight
  ctx.fillStyle = '#7a7a62'
  ctx.beginPath(); ctx.ellipse(-4, -5, 8, 6, -0.4, 0, Math.PI * 2); ctx.fill()
  // cracks
  ctx.fillStyle = '#222210'
  ctx.fillRect(-10, -1, 5, 2)
  ctx.fillRect( -5, -1, 2, 7)
  ctx.fillRect(  3, -8, 1, 6)
  ctx.fillRect(  3, -2, 5, 1)
  // moss patches
  ctx.fillStyle = '#3a5020'
  ctx.fillRect(-8, 6, 6, 3); ctx.fillRect(4, -4, 5, 3)

  ctx.restore()
}


// Iron Door — solid gate with glowing metal studs
export function drawDoor(ctx, tx, ty, t) {
  const glow = osc(t, 0.002)

  // door frame
  ctx.fillStyle = '#22140a'
  ctx.fillRect(tx + 1, ty + 1, TS - 2, TS - 2)
  // door planks
  ctx.fillStyle = '#4a3218'
  ctx.fillRect(tx + 3, ty + 3, TS - 6, TS - 6)
  ctx.fillStyle = '#3a2810'
  for (let i = 0; i < 3; i++) ctx.fillRect(tx + 3, ty + 3 + i * 14, TS - 6, 2)

  // iron band horizontal
  ctx.fillStyle = '#3a3a48'
  ctx.fillRect(tx + 3, ty + 16, TS - 6, 4)
  ctx.fillRect(tx + 3, ty + 30, TS - 6, 4)

  // studs
  const studs = [[6,6],[TS-11,6],[6,TS-11],[TS-11,TS-11],[TS/2-3,TS/2-3]]
  for (const [sx, sy] of studs) {
    ctx.fillStyle = `rgba(160,160,170,${0.7 + glow * 0.3})`
    ctx.fillRect(tx + sx, ty + sy, 6, 6)
    ctx.fillStyle = 'rgba(220,220,240,0.6)'
    ctx.fillRect(tx + sx + 1, ty + sy + 1, 2, 2)
  }

  // handle ring
  ctx.strokeStyle = `rgba(200,160,60,${0.6 + glow * 0.4})`
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(tx + TS / 2, ty + TS / 2 + 4, 5, 0, Math.PI * 2); ctx.stroke()
}


// Dart Tower — rotating aiming arm
export function drawDartTower(ctx, tx, ty, t) {
  const cx     = tx + TS / 2
  const aimAng = swing(t, 0.0012) * 0.9
  const shot   = (t * 0.001) % (Math.PI * 2)
  const firing = Math.sin(shot) > 0.75

  // base stones
  ctx.fillStyle = '#1e1828'
  ctx.fillRect(tx + 3, ty + 28, TS - 6, TS - 30)
  ctx.fillStyle = '#2a2238'
  ctx.fillRect(tx + 5, ty + 30, TS - 10, 6)
  ctx.fillRect(tx + 5, ty + 38, TS - 10, 6)
  // mortar lines
  ctx.fillStyle = '#14101e'
  ctx.fillRect(tx + 3, ty + 36, TS - 6, 1)
  ctx.fillRect(tx + 3, ty + 44, TS - 6, 1)

  // battlements
  ctx.fillStyle = '#1e1828'
  for (let i = 0; i < 3; i++) ctx.fillRect(tx + 5 + i * 13, ty + 18, 9, 12)
  ctx.fillRect(tx + 3, ty + 26, TS - 6, 4)

  // rotating crossbow mechanism
  ctx.save()
  ctx.translate(cx, ty + 22)
  ctx.rotate(aimAng)

  // barrel
  ctx.fillStyle = '#5a4020'
  ctx.fillRect(-3, -18, 6, 16)
  ctx.fillStyle = '#7a6030'
  ctx.fillRect(-2, -17, 4, 14)

  // bow arms
  ctx.fillStyle = '#4a3018'
  ctx.fillRect(-16, -6, 32, 4)
  ctx.fillStyle = '#6a4828'
  ctx.fillRect(-14, -5, 10, 3)
  ctx.fillRect(  4, -5, 10, 3)

  // dart in chamber
  if (firing) {
    ctx.fillStyle = '#c8a040'
    ctx.fillRect(-1, -28, 2, 12)
    ctx.fillStyle = '#d8b050'
    ctx.fillRect(-2, -22, 4,  2)
  }

  ctx.restore()
}


// Fire Vent — animated flames over metal grate
export function drawFire(ctx, tx, ty, t) {
  const cx  = tx + TS / 2
  const gy  = ty + TS - 12   // grate top
  const f1  = osc(t, 0.007)
  const f2  = osc(t + 350, 0.009)
  const f3  = osc(t + 700, 0.011)
  const fH  = gy - ty - 2    // flame height

  // grate housing
  ctx.fillStyle = '#1a1008'
  ctx.fillRect(tx + 2, gy, TS - 4, 10)
  ctx.fillStyle = '#2e1e10'
  ctx.fillRect(tx + 4, gy + 1, TS - 8, 4)
  // grate bars
  ctx.fillStyle = '#0e0806'
  for (let i = 0; i < 4; i++) ctx.fillRect(tx + 6 + i * 9, gy, 4, 10)

  // outer flame
  ctx.fillStyle = 'rgba(200,60,0,0.82)'
  ctx.beginPath()
  ctx.moveTo(cx - 16, gy)
  ctx.bezierCurveTo(cx - 14 + f1 * 10, gy - fH * 0.45, cx + f2 * 12 - 6, gy - fH * 0.8, cx, gy - fH)
  ctx.bezierCurveTo(cx + f3 * 12 - 6,  gy - fH * 0.8, cx + 14 - f1 * 10, gy - fH * 0.45, cx + 16, gy)
  ctx.fill()

  // mid flame
  ctx.fillStyle = 'rgba(255,110,0,0.9)'
  ctx.beginPath()
  ctx.moveTo(cx - 11, gy)
  ctx.bezierCurveTo(cx - 9 + f2 * 8, gy - fH * 0.38, cx + f3 * 9 - 4, gy - fH * 0.68, cx, gy - fH * 0.82)
  ctx.bezierCurveTo(cx + f1 * 9 - 4,  gy - fH * 0.68, cx + 9 - f2 * 8, gy - fH * 0.38, cx + 11, gy)
  ctx.fill()

  // core
  ctx.fillStyle = 'rgba(255,220,50,0.95)'
  ctx.beginPath()
  ctx.moveTo(cx - 5, gy)
  ctx.bezierCurveTo(cx - 4 + f3 * 5, gy - fH * 0.28, cx + f1 * 6 - 3, gy - fH * 0.55, cx, gy - fH * 0.68)
  ctx.bezierCurveTo(cx + f2 * 6 - 3,  gy - fH * 0.55, cx + 4 - f3 * 5, gy - fH * 0.28, cx + 5, gy)
  ctx.fill()

  // ember particles
  const eCount = 3
  for (let i = 0; i < eCount; i++) {
    const ep = (t * 0.002 + i * 2.1) % (Math.PI * 2)
    const ex = cx + Math.sin(ep + i) * 8
    const ey = gy - fH * 0.3 - Math.abs(Math.sin(ep)) * fH * 0.5
    const er = 1.5 + Math.sin(ep * 2) * 0.8
    ctx.fillStyle = `rgba(255,200,50,${0.4 + Math.sin(ep) * 0.3})`
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill()
  }
}


// Poison Mist — swirling green cloud
export function drawPoison(ctx, tx, ty, t) {
  const cx     = tx + TS / 2
  const cy     = ty + TS * 0.48
  const swirl  = t * 0.0008
  const pls    = osc(t, 0.004)

  // canister base
  ctx.fillStyle = '#121e06'
  ctx.fillRect(tx + 10, ty + TS - 16, TS - 20, 14)
  ctx.fillStyle = '#1e3008'
  ctx.fillRect(tx + 12, ty + TS - 14, TS - 24, 5)
  ctx.fillStyle = '#2e5010'
  ctx.fillRect(tx + 14, ty + TS - 12, TS - 28, 3)

  // mist clouds
  const clouds = [
    { ox:  0, oy: -6, rx: 14, ry: 12, s: 1.0 },
    { ox: -9, oy:-13, rx: 10, ry:  8, s: 1.3 },
    { ox:  9, oy:-11, rx: 11, ry:  9, s: 0.7 },
    { ox: -4, oy:-20, rx:  9, ry:  7, s: 1.7 },
    { ox:  5, oy:-18, rx:  8, ry:  7, s: 0.9 },
  ]
  for (const c of clouds) {
    const cp = osc(t * c.s, 0.004 * c.s)
    ctx.fillStyle = `rgba(70,150,20,${0.32 + cp * 0.28})`
    ctx.beginPath()
    ctx.ellipse(
      cx + c.ox + Math.sin(swirl * c.s + c.ox) * 3,
      cy + c.oy + Math.cos(swirl * c.s + c.oy) * 2,
      c.rx * (0.88 + pls * 0.22),
      c.ry * (0.85 + cp * 0.18),
      0, 0, Math.PI * 2
    )
    ctx.fill()
  }

  // skull in center
  const ska = 0.55 + pls * 0.35
  ctx.fillStyle = `rgba(15,40,5,${ska})`
  ctx.fillRect(cx - 6, cy - 18, 12, 10)
  ctx.fillRect(cx - 4, cy - 20,  8,  4)
  ctx.fillRect(cx - 4, cy - 9,   3,  4)
  ctx.fillRect(cx + 1, cy - 9,   3,  4)
  ctx.fillStyle = `rgba(15,40,5,${ska * 0.8})`
  ctx.fillRect(cx - 5, cy - 16,  3,  4)
  ctx.fillRect(cx + 2, cy - 16,  3,  4)
}


// ── Sprite maps ──────────────────────────────────────────────────────────────

export const HERO_SPRITES = {
  knight:  drawKnight,
  mage:    drawMage,
  thief:   drawThief,
  paladin: drawPaladin,
}

export const TILE_SPRITES = {
  skeleton: drawSkeletonTile,
  slime:    drawSlimeTile,
  wraith:   drawWraithTile,
  spike:    drawSpike,
  boulder:  drawBoulder,
  door:     drawDoor,
  dart:     drawDartTower,
  fire:     drawFire,
  poison:   drawPoison,
}
