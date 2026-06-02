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


// Berserker: horned helm, giant axe, tattered red armour, heavy rage-stomp walk
export function drawBerserker(ctx, cx, cy, t, hero = {}) {
  const bob  = swing(t, 0.010) * 2.2
  const lean = swing(t, 0.010) * 0.10
  const lLeg = swing(t, 0.012) * 8
  const rLeg = -lLeg
  const rage = osc(t, 0.008)

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + bob))
  ctx.rotate(lean)

  // shadow (large — heavy unit)
  ctx.fillStyle = 'rgba(0,0,0,0.36)'
  ctx.beginPath(); ctx.ellipse(0, 20, 14, 5, 0, 0, Math.PI * 2); ctx.fill()

  // boots
  ctx.fillStyle = '#3a2010'
  ctx.fillRect(-10, 15 + lLeg * 0.4, 9, 4)
  ctx.fillRect(  1, 15 + rLeg * 0.4, 9, 4)
  // greaves
  ctx.fillStyle = '#5a3818'
  ctx.fillRect( -9, 7 + lLeg * 0.4, 8, 10)
  ctx.fillRect(  1, 7 + rLeg * 0.4, 8, 10)

  // tattered battle armor — body
  ctx.fillStyle = '#6a2810'
  ctx.fillRect(-12, -9, 24, 18)
  ctx.fillStyle = '#8a3818'
  ctx.fillRect(-11, -8, 22, 15)
  // tattered rips
  ctx.fillStyle = '#4a1808'
  ctx.fillRect(-11, 2, 5, 2); ctx.fillRect(6, -3, 5, 2)
  // rage-heat glow over chest
  ctx.fillStyle = `rgba(255,80,20,${0.05 + rage * 0.12})`
  ctx.fillRect(-11, -8, 22, 15)

  // massive pauldrons
  ctx.fillStyle = '#5a2808'
  ctx.fillRect(-20, -13, 9, 8)
  ctx.fillRect( 11, -13, 9, 8)
  ctx.fillStyle = '#7a3818'
  ctx.fillRect(-19, -12, 7, 6)
  ctx.fillRect( 12, -12, 7, 6)

  // two-handed axe (right side)
  const axeSw = swing(t, 0.010) * 3
  // haft
  ctx.fillStyle = '#4a3a20'
  ctx.fillRect(11 + axeSw * 0.3, -30 + axeSw, 4, 40)
  // axe head
  ctx.fillStyle = '#8a8898'
  ctx.fillRect( 8 + axeSw * 0.3, -34 + axeSw, 14, 5)
  ctx.fillRect( 8 + axeSw * 0.3, -29 + axeSw, 14, 5)
  ctx.fillStyle = '#b0b0c0'
  ctx.fillRect( 9 + axeSw * 0.3, -33 + axeSw, 12, 4)
  ctx.fillStyle = 'rgba(200,200,220,0.75)'
  ctx.fillRect(20 + axeSw * 0.3, -33 + axeSw,  2, 9) // edge gleam

  // left arm
  ctx.fillStyle = '#7a3818'
  ctx.fillRect(-20, -8, 8, 12)
  ctx.fillStyle = '#c8a078'
  ctx.fillRect(-21, 3, 7, 4) // fist

  // face / neck
  ctx.fillStyle = '#c8a078'
  ctx.fillRect(-6, -22, 12, 11)

  // horned iron helmet
  ctx.fillStyle = '#4a4050'
  ctx.fillRect(-10, -30, 20, 13)
  ctx.fillStyle = '#5a5060'
  ctx.fillRect( -8, -36, 16,  8)
  // horns
  ctx.fillStyle = '#6a5840'
  ctx.fillRect(-14, -36, 5, 13); ctx.fillRect( 9, -36, 5, 13)
  ctx.fillRect(-13, -43, 4,  9); ctx.fillRect( 9, -43, 4,  9)
  // visor slot
  ctx.fillStyle = '#0a0808'
  ctx.fillRect( -8, -26, 16, 5)
  // rage eyes glowing red-orange
  ctx.fillStyle = `rgba(255,60,10,${0.65 + rage * 0.35})`
  ctx.fillRect(-7, -25, 5, 2)
  ctx.fillRect( 2, -25, 5, 2)

  if (hero.poisoned) {
    ctx.fillStyle = 'rgba(50,220,80,0.18)'
    ctx.fillRect(-21, -43, 42, 66)
  }
  // slow-immune shimmer
  if (hero.slowed === false && hero.immuneToSlow) {
    ctx.fillStyle = 'rgba(255,100,20,0.08)'
    ctx.fillRect(-21, -43, 42, 66)
  }
  ctx.restore()
}


// Ranger: forest-green hooded cloak, quiver on back, bow in hand, light quick steps
export function drawRanger(ctx, cx, cy, t, hero = {}) {
  const bob   = swing(t, 0.011) * 1.2
  const lLeg  = swing(t, 0.013) * 6
  const rLeg  = -lLeg
  const lean  = swing(t, 0.011) * 0.07
  const cloak = osc(t, 0.004)

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + bob))
  ctx.rotate(lean)

  // shadow (light — nimble)
  ctx.fillStyle = 'rgba(0,0,0,0.20)'
  ctx.beginPath(); ctx.ellipse(0, 15, 8, 3, 0, 0, Math.PI * 2); ctx.fill()

  // dark-leather legs
  ctx.fillStyle = '#2a3820'
  ctx.fillRect(-5, 5 + lLeg * 0.35, 4, 9)
  ctx.fillRect( 1, 5 + rLeg * 0.35, 4, 9)
  // boots
  ctx.fillStyle = '#3a2810'
  ctx.fillRect(-6, 12 + lLeg * 0.35, 5, 3)
  ctx.fillRect( 1, 12 + rLeg * 0.35, 5, 3)

  // cloak body
  ctx.fillStyle = '#2a4a20'
  ctx.fillRect(-7, -6, 14, 13)
  ctx.fillStyle = `rgba(60,90,40,${0.3 + cloak * 0.3})`
  ctx.fillRect(-6, -5, 12, 10)

  // quiver on back (left side)
  ctx.fillStyle = '#5a3a10'
  ctx.fillRect(-13, -9, 5, 14)
  // arrow shafts
  ctx.fillStyle = '#8a6030'
  ctx.fillRect(-12, -18, 1, 11)
  ctx.fillRect(-11, -17, 1, 10)
  ctx.fillRect(-10, -16, 1,  9)
  // fletching
  ctx.fillStyle = '#c04020'
  ctx.fillRect(-13, -20, 4, 4)

  // bow (right side)
  const bowSw = swing(t, 0.011) * 1.5
  ctx.fillStyle = '#6a4818'
  ctx.fillRect(9 + bowSw * 0.3, -22, 3, 34)
  ctx.fillStyle = '#8a6030'
  ctx.fillRect(11 + bowSw * 0.3, -20, 3, 4); ctx.fillRect(11 + bowSw * 0.3, 9, 3, 4)
  // string
  ctx.fillStyle = '#d0c090'
  ctx.fillRect(12 + bowSw * 0.3, -18, 1, 30)

  // left arm
  ctx.fillStyle = '#3a5828'
  ctx.fillRect(-15, -5, 7, 8)
  ctx.fillStyle = '#c8a878'
  ctx.fillRect(-16, 2, 6, 3)

  // hood
  ctx.fillStyle = '#2a4a20'
  ctx.fillRect(-7, -22, 14, 18)
  ctx.fillRect(-5, -26, 10,  6)
  // face
  ctx.fillStyle = '#c8a878'
  ctx.fillRect(-4, -18, 8, 7)
  // hood shadow brow
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.fillRect(-4, -18, 8, 4)
  // eyes
  ctx.fillStyle = '#1a1a10'
  ctx.fillRect(-3, -15, 2, 2)
  ctx.fillRect( 1, -15, 2, 2)
  ctx.fillStyle = 'rgba(120,200,80,0.75)'
  ctx.fillRect(-2, -15, 1, 1); ctx.fillRect(2, -15, 1, 1)

  if (hero.poisoned) {
    ctx.fillStyle = 'rgba(50,220,80,0.18)'
    ctx.fillRect(-16, -26, 32, 44)
  }
  ctx.restore()
}


// Cleric: white/silver robes, holy cross staff, radiant blue-white healing aura
export function drawCleric(ctx, cx, cy, t, hero = {}) {
  const bob  = swing(t, 0.005) * 1.3
  const lLeg = swing(t, 0.005) * 4
  const rLeg = -lLeg
  const aura = osc(t, 0.004)
  const glow = osc(t, 0.003)

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + bob))

  // healing aura (brighter and wider than paladin)
  ctx.fillStyle = `rgba(200,230,255,${0.06 + aura * 0.10})`
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `rgba(255,255,255,${0.02 + glow * 0.06})`
  ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill()

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.30)'
  ctx.beginPath(); ctx.ellipse(0, 18, 11, 4, 0, 0, Math.PI * 2); ctx.fill()

  // legs under robe
  ctx.fillStyle = '#c0ccd8'
  ctx.fillRect(-8, 6 + lLeg * 0.3, 6, 10)
  ctx.fillRect( 2, 6 + rLeg * 0.3, 6, 10)

  // robe body
  ctx.fillStyle = '#e8f0f8'
  ctx.fillRect(-9, -7, 18, 17)
  ctx.fillRect(-11, 8, 22, 8) // flared hem
  // blue trim
  ctx.fillStyle = '#4a70c0'
  ctx.fillRect( -9, -7, 2, 17); ctx.fillRect(7, -7, 2, 17)
  ctx.fillRect(-11, 14, 22, 2)
  // holy cross emblem (glowing)
  ctx.fillStyle = `rgba(200,230,255,${0.55 + glow * 0.45})`
  ctx.fillRect(-1, -6, 2, 12); ctx.fillRect(-5, 0, 10, 2)

  // silver pauldrons
  ctx.fillStyle = '#b0c0d8'
  ctx.fillRect(-15, -9, 6, 5); ctx.fillRect(9, -9, 6, 5)

  // holy cross staff
  const stSw = swing(t, 0.004) * 2
  ctx.fillStyle = '#c0c8d8'
  ctx.fillRect(11 + stSw * 0.3, -32 + stSw * 0.5, 3, 46)
  // crossbeam
  ctx.fillStyle = '#e0e8f8'
  ctx.fillRect( 7 + stSw * 0.3, -32 + stSw * 0.5, 11, 3)
  // radiant cross glow
  ctx.fillStyle = `rgba(200,230,255,${0.35 + glow * 0.55})`
  ctx.fillRect( 8 + stSw * 0.3, -38 + stSw * 0.5, 9, 18)

  // left arm
  ctx.fillStyle = '#d0dce8'
  ctx.fillRect(-17, -6, 7, 10)
  ctx.fillStyle = '#e8d0a8'
  ctx.fillRect(-18, 3, 6, 4)

  // head / face
  ctx.fillStyle = '#e8d0a8'
  ctx.fillRect(-6, -19, 12, 12)
  // eyes
  ctx.fillStyle = '#2a3040'
  ctx.fillRect(-4, -15, 3, 3); ctx.fillRect(1, -15, 3, 3)
  ctx.fillStyle = `rgba(200,230,255,${0.5 + glow * 0.5})`
  ctx.fillRect(-3, -14, 2, 2); ctx.fillRect(2, -14, 2, 2)

  // white coif / head cloth
  ctx.fillStyle = '#f0f4f8'
  ctx.fillRect(-7, -27, 14, 12); ctx.fillRect(-5, -31, 10, 6)
  // silver circlet
  ctx.fillStyle = '#c0c8d8'
  ctx.fillRect(-8, -21, 16, 3)
  ctx.fillStyle = '#d8e0f0'
  ctx.fillRect(-6, -24, 12, 4)
  // cross jewel on circlet
  ctx.fillStyle = `rgba(200,230,255,${0.7 + glow * 0.3})`
  ctx.fillRect(-1, -26, 2, 7); ctx.fillRect(-4, -24, 8, 2)

  if (hero.poisoned) {
    ctx.fillStyle = 'rgba(50,220,80,0.18)'
    ctx.fillRect(-18, -31, 38, 54)
  }
  ctx.restore()
}


// Archmage: deep-purple elaborate robes, multi-star tall hat, orbiting secondary orbs
export function drawArchmage(ctx, cx, cy, t, hero = {}) {
  const bob     = swing(t, 0.006) * 1.8
  const staffSw = swing(t, 0.004) * 4
  const orbGlow = osc(t, 0.004)
  const lLeg    = swing(t, 0.007) * 4
  const rLeg    = -lLeg
  const arcane  = osc(t, 0.007)

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + bob))

  // arcane aura — pulsing violet
  ctx.fillStyle = `rgba(160,60,220,${0.05 + arcane * 0.09})`
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill()

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath(); ctx.ellipse(0, 18, 10, 4, 0, 0, Math.PI * 2); ctx.fill()

  // robe hem
  ctx.fillStyle = '#3a1870'
  ctx.fillRect(-9, 6, 18, 12); ctx.fillRect(-11, 11, 22, 8)
  // robe body
  ctx.fillStyle = '#4a20a0'
  ctx.fillRect(-9, -7, 18, 15)
  // arcane shimmer on robe
  ctx.fillStyle = `rgba(160,80,220,${0.10 + arcane * 0.16})`
  ctx.fillRect(-8, -6, 16, 12)
  // gold + silver trim
  ctx.fillStyle = '#c8a040'
  ctx.fillRect(-9, -7, 2, 17); ctx.fillRect(7, -7, 2, 17)
  ctx.fillRect(-11, 17, 22, 2)
  ctx.fillStyle = '#e0d0f0'
  ctx.fillRect(-9, -5, 2, 13); ctx.fillRect(7, -5, 2, 13)
  // rune symbols on robe
  ctx.fillStyle = `rgba(200,160,255,${0.4 + arcane * 0.4})`
  ctx.fillRect(-5, -4, 2, 2); ctx.fillRect(3, 1, 2, 2)
  ctx.fillRect(-3,  5, 2, 2); ctx.fillRect(-1, -1, 2, 2)

  // powerful staff
  const stx = 12 + staffSw * 0.5
  const sty = -staffSw * 0.4
  ctx.fillStyle = '#5a3810'
  ctx.fillRect(stx, sty - 30, 4, 46)
  // large orb and triple-halo
  ctx.fillStyle = `rgba(220,60,220,${0.10 + orbGlow * 0.35})`
  ctx.beginPath(); ctx.arc(stx + 2, sty - 34, 16, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `rgba(180,40,220,${0.18 + orbGlow * 0.38})`
  ctx.beginPath(); ctx.arc(stx + 2, sty - 34, 10, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `rgb(${160 + (orbGlow * 80)|0}, 40, ${200 + (orbGlow * 55)|0})`
  ctx.beginPath(); ctx.arc(stx + 2, sty - 34, 7, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(240,200,255,0.85)'
  ctx.beginPath(); ctx.arc(stx, sty - 36, 3, 0, Math.PI * 2); ctx.fill()
  // two orbiting secondary orbs
  const ang1 = t * 0.003
  const ang2 = ang1 + Math.PI
  ctx.fillStyle = `rgba(220,140,255,${0.5 + orbGlow * 0.5})`
  ctx.beginPath(); ctx.arc(stx + 2 + Math.cos(ang1) * 13, sty - 34 + Math.sin(ang1) * 7, 4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(stx + 2 + Math.cos(ang2) * 13, sty - 34 + Math.sin(ang2) * 7, 4, 0, Math.PI * 2); ctx.fill()

  // left sleeve + hand
  ctx.fillStyle = '#3a1870'
  ctx.fillRect(-17, -6, 8, 12)
  ctx.fillStyle = '#e8c890'
  ctx.fillRect(-18, 5, 7, 4)

  // head / face
  ctx.fillStyle = '#e8c890'
  ctx.fillRect(-6, -19, 12, 13)
  ctx.fillStyle = '#1a1020'
  ctx.fillRect(-4, -15, 3, 3); ctx.fillRect(1, -15, 3, 3)
  // glowing arcane eyes
  ctx.fillStyle = `rgba(200,80,255,${0.65 + orbGlow * 0.35})`
  ctx.fillRect(-3, -14, 2, 2); ctx.fillRect(2, -14, 2, 2)
  // long white beard
  ctx.fillStyle = '#e8e8d8'
  ctx.fillRect(-5, -9, 10, 5)

  // hat brim (wider than standard mage)
  ctx.fillStyle = '#1e0e5e'
  ctx.fillRect(-12, -21, 24, 4)
  ctx.fillStyle = `rgba(255,200,80,${0.5 + orbGlow * 0.4})`
  ctx.fillRect(-11, -22, 22, 2) // star band
  // hat cone — tall, multi-segment
  ctx.fillStyle = '#2a1880'
  ctx.fillRect(-9, -30, 18, 11); ctx.fillRect(-7, -40, 14, 12)
  ctx.fillRect(-5, -50, 10, 12); ctx.fillRect(-3, -58, 6, 10)
  ctx.fillRect(-1, -64, 2,  8)
  // stars on hat
  ctx.fillStyle = `rgba(255,200,80,${0.5 + orbGlow * 0.5})`
  ctx.fillRect(-5, -38, 10, 2); ctx.fillRect(-2, -42, 4, 12)
  ctx.fillRect(-4, -53, 8,  2); ctx.fillRect(-1, -57, 2, 10)
  // arcane sigil on hat
  ctx.fillStyle = `rgba(200,100,255,${0.4 + arcane * 0.4})`
  ctx.fillRect(-4, -33, 4, 2); ctx.fillRect(0, -33, 4, 2)
  ctx.fillRect(-2, -35, 4, 2); ctx.fillRect(-2, -31, 4, 2)

  if (hero.poisoned) {
    ctx.fillStyle = 'rgba(50,220,80,0.18)'
    ctx.fillRect(-18, -64, 38, 84)
  }
  ctx.restore()
}


// Champion: ornate gold-silver plate, crown-helm, massive greatsword, flowing red cape
export function drawChampion(ctx, cx, cy, t, hero = {}) {
  const bob   = swing(t, 0.004) * 1.2
  const lLeg  = swing(t, 0.004) * 4
  const rLeg  = -lLeg
  const lean  = swing(t, 0.004) * 0.04
  const rune  = osc(t, 0.003)
  const aura  = osc(t, 0.002)

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + bob))
  ctx.rotate(lean)

  // legendary golden aura
  ctx.fillStyle = `rgba(220,180,40,${0.04 + aura * 0.07})`
  ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill()

  // shadow (very large)
  ctx.fillStyle = 'rgba(0,0,0,0.38)'
  ctx.beginPath(); ctx.ellipse(0, 22, 16, 6, 0, 0, Math.PI * 2); ctx.fill()

  // sabatons
  ctx.fillStyle = '#b0a060'
  ctx.fillRect(-12, 19 + lLeg * 0.4, 11, 4)
  ctx.fillRect(  1, 19 + rLeg * 0.4, 11, 4)
  // greaves
  ctx.fillStyle = '#7a7040'
  ctx.fillRect(-11, 10 + lLeg * 0.4, 10, 11)
  ctx.fillRect(  1, 10 + rLeg * 0.4, 10, 11)
  ctx.fillStyle = '#a09050'
  ctx.fillRect(-10, 11 + lLeg * 0.4,  8,  8)
  ctx.fillRect(  2, 11 + rLeg * 0.4,  8,  8)

  // flowing red cape (drawn before body so body covers overlap)
  const capeSw = swing(t, 0.004) * 4
  ctx.fillStyle = '#5a0808'
  ctx.fillRect(-14, -11, 28, 24)
  ctx.fillStyle = '#8a1010'
  ctx.fillRect(-13, -10, 26, 20)
  // cape gold border
  ctx.fillStyle = '#c8a030'
  ctx.fillRect(-13, 9, 26, 2); ctx.fillRect(-13, -10, 2, 20); ctx.fillRect(11, -10, 2, 20)

  // body — heavy ornate plate
  ctx.fillStyle = '#7a7838'
  ctx.fillRect(-13, -9, 26, 20)
  ctx.fillStyle = '#9a9848'
  ctx.fillRect(-12, -8, 24, 18)
  // gold inlay lines
  ctx.fillStyle = '#c8a030'
  ctx.fillRect(-12, -8, 24, 2); ctx.fillRect(-12, 8, 24, 2)
  // rune etching on chest (glowing)
  ctx.fillStyle = `rgba(255,220,80,${0.30 + rune * 0.42})`
  ctx.fillRect( -1, -7, 2, 14)     // vertical
  ctx.fillRect( -6,  0, 12, 2)     // horizontal
  ctx.fillRect( -8, -4, 16, 2)     // top rune bar
  ctx.fillRect( -8,  6, 16, 2)     // bottom rune bar

  // massive pauldrons
  ctx.fillStyle = '#8a8840'
  ctx.fillRect(-22, -14, 10, 10); ctx.fillRect(12, -14, 10, 10)
  ctx.fillStyle = '#a0a050'
  ctx.fillRect(-21, -13,  8,  8); ctx.fillRect(13, -13,  8,  8)
  ctx.fillStyle = '#c8a030'
  ctx.fillRect(-18, -10, 3, 3); ctx.fillRect(15, -10, 3, 3) // rivets

  // greatsword (right side, massive)
  const swdSw = swing(t, 0.004) * 2
  // grip
  ctx.fillStyle = '#5a4820'
  ctx.fillRect(15 + swdSw * 0.3, -18 + swdSw, 4, 24)
  // blade
  ctx.fillStyle = '#b0b8c8'
  ctx.fillRect(13 + swdSw * 0.3, -44 + swdSw, 8, 28)
  ctx.fillStyle = '#d0d8e8'
  ctx.fillRect(14 + swdSw * 0.3, -43 + swdSw, 6, 26)
  // edge gleam
  ctx.fillStyle = 'rgba(240,240,255,0.90)'
  ctx.fillRect(14 + swdSw * 0.3, -43 + swdSw, 2, 26)
  // crossguard
  ctx.fillStyle = '#c8a030'
  ctx.fillRect( 9 + swdSw * 0.3, -19 + swdSw, 18, 4)
  // pommel
  ctx.fillStyle = '#d8b040'
  ctx.fillRect(14 + swdSw * 0.3, 4 + swdSw, 6, 5)
  // rune on blade
  ctx.fillStyle = `rgba(255,220,80,${0.35 + rune * 0.50})`
  ctx.fillRect(16 + swdSw * 0.3, -40 + swdSw, 2, 20)

  // left gauntlet
  ctx.fillStyle = '#9a9848'
  ctx.fillRect(-24, -7, 9, 13)
  ctx.fillStyle = '#b0b050'
  ctx.fillRect(-23, -6, 7, 11)
  ctx.fillStyle = '#c8a030'
  ctx.fillRect(-23, -6, 7, 2)

  // great helm + crown
  ctx.fillStyle = '#8a8840'
  ctx.fillRect(-11, -28, 22, 23)
  ctx.fillStyle = '#9a9848'
  ctx.fillRect( -9, -32,  18, 8)
  // crown points
  ctx.fillStyle = '#c8a030'
  ctx.fillRect( -9, -39, 5, 9)   // left point
  ctx.fillRect( -2, -42, 5, 12)  // center point (tallest)
  ctx.fillRect(  4, -39, 5, 9)   // right point
  // crown jewels
  ctx.fillStyle = `rgba(80,80,255,${0.70 + rune * 0.30})`
  ctx.fillRect(-8, -36, 4, 4)
  ctx.fillStyle = `rgba(255,60,60,${0.70 + rune * 0.30})`
  ctx.fillRect(-1, -39, 4, 4)
  ctx.fillStyle = `rgba(60,200,60,${0.70 + rune * 0.30})`
  ctx.fillRect( 5, -36, 4, 4)
  // visor slit
  ctx.fillStyle = '#1a1808'
  ctx.fillRect(-9, -22, 18, 6)
  // glowing eyes through visor
  ctx.fillStyle = `rgba(255,200,40,${0.55 + rune * 0.45})`
  ctx.fillRect(-8, -21, 6, 2); ctx.fillRect(2, -21, 6, 2)

  if (hero.poisoned) {
    ctx.fillStyle = 'rgba(50,220,80,0.18)'
    ctx.fillRect(-24, -42, 48, 68)
  }
  ctx.restore()
}


// Warlord: battle-scarred red-and-black armour, twin weapons, destroys all traps
export function drawWarlord(ctx, cx, cy, t, hero = {}) {
  const bob  = swing(t, 0.007) * 1.8
  const lean = swing(t, 0.007) * 0.07
  const lLeg = swing(t, 0.009) * 7
  const rLeg = -lLeg
  const fury = osc(t, 0.006)

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + bob))
  ctx.rotate(lean)

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)'
  ctx.beginPath(); ctx.ellipse(0, 18, 13, 5, 0, 0, Math.PI * 2); ctx.fill()

  // greaves
  ctx.fillStyle = '#3a1010'
  ctx.fillRect(-8, 8 + lLeg * 0.4, 7, 10); ctx.fillRect(1, 8 + rLeg * 0.4, 7, 10)
  ctx.fillStyle = '#2a0808'
  ctx.fillRect(-9, 16 + lLeg * 0.4, 8, 3); ctx.fillRect(1, 16 + rLeg * 0.4, 8, 3)

  // body — black plate with red trim
  ctx.fillStyle = '#1a1010'
  ctx.fillRect(-11, -8, 22, 18)
  ctx.fillStyle = '#2a1818'
  ctx.fillRect(-10, -7, 20, 16)
  // red trim lines
  ctx.fillStyle = '#8b1a1a'
  ctx.fillRect(-10, -7, 20, 2); ctx.fillRect(-10, 7, 20, 2)
  ctx.fillRect(-10, -7, 2, 16); ctx.fillRect(8, -7, 2, 16)
  // battle wear
  ctx.fillStyle = '#4a0808'
  ctx.fillRect(-7, -2, 3, 2); ctx.fillRect(4, 2, 3, 2)
  // fury glow on chest (active aggression)
  ctx.fillStyle = `rgba(180,30,30,${0.06 + fury * 0.10})`
  ctx.fillRect(-10, -7, 20, 16)

  // wide pauldrons
  ctx.fillStyle = '#2a1010'
  ctx.fillRect(-18, -10, 8, 7); ctx.fillRect(10, -10, 8, 7)
  ctx.fillStyle = '#8b1a1a'
  ctx.fillRect(-17, -9, 3, 5); ctx.fillRect(14, -9, 3, 5)

  // right weapon — heavy war axe
  const axeSw = swing(t, 0.007) * 3
  ctx.fillStyle = '#3a2010'
  ctx.fillRect(12 + axeSw * 0.3, -26 + axeSw, 4, 36)
  ctx.fillStyle = '#7a7888'
  ctx.fillRect(10 + axeSw * 0.3, -30 + axeSw, 12, 5)
  ctx.fillRect(10 + axeSw * 0.3, -25 + axeSw, 12, 5)
  ctx.fillStyle = '#a0a0b0'
  ctx.fillRect(11 + axeSw * 0.3, -29 + axeSw, 10, 4)
  ctx.fillStyle = 'rgba(200,80,20,0.7)'
  ctx.fillRect(21 + axeSw * 0.3, -29 + axeSw, 2, 8) // blood on edge

  // left arm + short sword
  ctx.fillStyle = '#2a1010'
  ctx.fillRect(-20, -8, 8, 12)
  ctx.fillStyle = '#c8c8d8'
  ctx.fillRect(-18, -18, 2, 22) // blade
  ctx.fillStyle = '#d8a030'
  ctx.fillRect(-20, -10, 6, 2) // crossguard

  // helmet — full-face war helm
  ctx.fillStyle = '#1a1010'
  ctx.fillRect(-9, -26, 18, 20)
  ctx.fillStyle = '#2a1818'
  ctx.fillRect(-7, -30, 14, 7)
  // red battle markings
  ctx.fillStyle = '#8b1a1a'
  ctx.fillRect(-6, -26, 12, 2)
  ctx.fillRect(-6, -26, 2, 10); ctx.fillRect(4, -26, 2, 10)
  // narrow visor slit
  ctx.fillStyle = '#0a0808'
  ctx.fillRect(-7, -22, 14, 4)
  ctx.fillStyle = `rgba(200,50,50,${0.55 + fury * 0.45})`
  ctx.fillRect(-6, -21, 5, 2); ctx.fillRect(1, -21, 5, 2)

  if (hero.poisoned) {
    ctx.fillStyle = 'rgba(50,220,80,0.18)'
    ctx.fillRect(-20, -30, 42, 52)
  }
  ctx.restore()
}


// Regenerator: nature-druid wrapped in pulsing green healing energy, minimal armour
export function drawRegenerator(ctx, cx, cy, t, hero = {}) {
  const bob  = swing(t, 0.006) * 1.5
  const lLeg = swing(t, 0.008) * 5
  const rLeg = -lLeg
  const heal = osc(t, 0.005)      // heal pulse
  const aura = osc(t, 0.003)

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + bob))

  // large healing aura — bright green
  ctx.fillStyle = `rgba(30,200,80,${0.05 + aura * 0.09})`
  ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill()
  // second pulsing ring
  ctx.fillStyle = `rgba(80,255,120,${0.02 + heal * 0.06})`
  ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill()

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath(); ctx.ellipse(0, 18, 10, 4, 0, 0, Math.PI * 2); ctx.fill()

  // legs — wrapped in green cloth
  ctx.fillStyle = '#1a4a20'
  ctx.fillRect(-5, 6 + lLeg * 0.3, 4, 10); ctx.fillRect(1, 6 + rLeg * 0.3, 4, 10)
  ctx.fillStyle = '#2a3818'
  ctx.fillRect(-6, 14 + lLeg * 0.3, 5, 3); ctx.fillRect(1, 14 + rLeg * 0.3, 5, 3)

  // robe — flowing deep green
  ctx.fillStyle = '#1a4a20'
  ctx.fillRect(-8, -7, 16, 14)
  ctx.fillRect(-10, 5, 20, 8) // hem
  ctx.fillStyle = '#224a28'
  ctx.fillRect(-7, -6, 14, 12)
  // leaf-vein pattern on robe
  ctx.fillStyle = `rgba(60,220,80,${0.18 + heal * 0.20})`
  ctx.fillRect(-1, -5, 2, 11)
  ctx.fillRect(-4, -1, 8, 2)
  ctx.fillRect(-3, 3, 6, 2)

  // glowing staff (healing light at tip)
  const stSw = swing(t, 0.004) * 2
  ctx.fillStyle = '#2a4818'
  ctx.fillRect(10 + stSw * 0.3, -30 + stSw * 0.5, 3, 46)
  // leaf cluster at top
  ctx.fillStyle = `rgba(50,200,70,${0.4 + heal * 0.5})`
  ctx.beginPath(); ctx.arc(11 + stSw * 0.3, -32 + stSw * 0.5, 10, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `rgba(100,255,120,${0.5 + heal * 0.5})`
  ctx.beginPath(); ctx.arc(11 + stSw * 0.3, -32 + stSw * 0.5, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(200,255,200,0.8)'
  ctx.beginPath(); ctx.arc(9 + stSw * 0.3, -34 + stSw * 0.5, 2.5, 0, Math.PI * 2); ctx.fill()
  // orbiting leaf particles
  const leafAngle = t * 0.003
  for (let i = 0; i < 3; i++) {
    const a = leafAngle + (i / 3) * Math.PI * 2
    const lx = (11 + stSw * 0.3) + Math.cos(a) * 13
    const ly = (-32 + stSw * 0.5) + Math.sin(a) * 8
    ctx.fillStyle = `rgba(60,220,80,${0.45 + heal * 0.4})`
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill()
  }

  // left arm
  ctx.fillStyle = '#1a4a20'
  ctx.fillRect(-17, -6, 7, 10)
  ctx.fillStyle = '#c8b890'
  ctx.fillRect(-18, 3, 6, 4)

  // head
  ctx.fillStyle = '#c8b890'
  ctx.fillRect(-6, -18, 12, 12)
  // eyes — glowing green
  ctx.fillStyle = '#1a2a10'
  ctx.fillRect(-4, -14, 3, 3); ctx.fillRect(1, -14, 3, 3)
  ctx.fillStyle = `rgba(50,220,80,${0.6 + heal * 0.4})`
  ctx.fillRect(-3, -13, 2, 2); ctx.fillRect(2, -13, 2, 2)
  // gentle smile
  ctx.fillStyle = '#8a6040'
  ctx.fillRect(-3, -9, 6, 1)

  // woven green hood
  ctx.fillStyle = '#1a4a20'
  ctx.fillRect(-7, -26, 14, 12); ctx.fillRect(-5, -30, 10, 6)
  // white trim
  ctx.fillStyle = 'rgba(200,255,200,0.5)'
  ctx.fillRect(-6, -26, 12, 2)

  if (hero.poisoned) {
    ctx.fillStyle = 'rgba(50,220,80,0.18)'
    ctx.fillRect(-18, -30, 38, 52)
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


// Wraith tower — roams within its tile when idle; rushes to target when attacking
// rushPos: { x, y } pixel coords when mid-rush; null = idle roaming
export function drawWraithTile(ctx, tx, ty, t, rushPos = null) {
  // Idle: drift in a small figure-eight around tile centre using position as seed
  const seed  = tx * 0.017 + ty * 0.013
  let cx, cy
  if (rushPos) {
    cx = rushPos.x
    cy = rushPos.y
  } else {
    cx = tx + TS / 2 + Math.sin(t * 0.0009 + seed) * 10
    cy = ty + TS * 0.52 + Math.cos(t * 0.0007 + seed * 1.3) * 8
  }

  const fl    = swing(t, 0.004) * 5
  const fadeV = osc(t, 0.003)
  const eyeG  = osc(t, 0.005)
  // Rush: eyes blaze brighter
  const rushGlow = rushPos ? 1.0 : 0

  ctx.save()
  ctx.translate(Math.round(cx), Math.round(cy + fl))
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
  ctx.fillStyle = '#5a3278'
  ctx.fillRect(-10, -16, 20, 26)
  ctx.fillStyle = 'rgba(160,100,255,0.12)'
  ctx.fillRect(-7, -14, 14, 20)

  // cloak
  ctx.fillStyle = 'rgba(80,40,120,0.7)'
  ctx.fillRect(-18, -12, 6, 20); ctx.fillRect(12, -12, 6, 20)
  ctx.fillRect(-22, -8, 4, 14); ctx.fillRect(18, -8, 4, 14)

  // hood
  ctx.fillStyle = '#2a1240'
  ctx.fillRect(-12, -30, 24, 14); ctx.fillRect(-10, -34, 20, 6)
  ctx.fillStyle = '#3e1e5e'
  ctx.fillRect(-9, -28, 18, 12)

  // glowing eyes — blaze during rush
  const ea = 0.65 + eyeG * 0.35 + rushGlow * 0.4
  ctx.fillStyle = `rgba(255,${80 - rushGlow * 40|0},255,${ea})`
  ctx.beginPath(); ctx.ellipse(-5, -24, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse( 5, -24, 4.5, 4.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `rgba(255,200,255,0.85)`
  ctx.beginPath(); ctx.ellipse(-5, -25, 2, 2, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse( 5, -25, 2, 2, 0, 0, Math.PI * 2); ctx.fill()

  // Rush impact flash around whole sprite
  if (rushPos) {
    ctx.fillStyle = 'rgba(180,80,255,0.12)'
    ctx.beginPath(); ctx.ellipse(0, -10, 20, 30, 0, 0, Math.PI * 2); ctx.fill()
  }

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


// ── Lava Floor — seething magma with bubble pops ─────────────────────────────

export function drawLava(ctx, tx, ty, t) {
  const cx  = tx + TS / 2
  const cy  = ty + TS / 2
  const sc  = t * 0.0005    // slow drift
  const b1  = osc(t, 0.007)
  const b2  = osc(t + 600,  0.009)
  const b3  = osc(t + 1300, 0.006)

  // Base — deep magma
  ctx.fillStyle = '#3a0800'
  ctx.fillRect(tx, ty, TS, TS)

  // Lava flow layers
  ctx.fillStyle = `rgba(160,30,0,0.85)`
  ctx.beginPath()
  ctx.ellipse(cx + Math.sin(sc) * 6,      cy + 4,  18, 12, sc * 0.5,  0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `rgba(220,80,0,0.75)`
  ctx.beginPath()
  ctx.ellipse(cx + Math.cos(sc * 1.3) * 8, cy - 2, 14, 10, sc * 0.8, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `rgba(255,140,0,0.55)`
  ctx.beginPath()
  ctx.ellipse(cx + Math.sin(sc * 0.7) * 4, cy,    10,  8, 0,         0, Math.PI * 2); ctx.fill()

  // Bright cracks
  ctx.strokeStyle = `rgba(255,180,0,${0.4 + b1 * 0.5})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(tx + 6, ty + 8); ctx.lineTo(tx + 18, ty + 22); ctx.lineTo(tx + 28, ty + 16)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(tx + 30, ty + 10); ctx.lineTo(tx + 42, ty + 28); ctx.lineTo(tx + 36, ty + 42)
  ctx.stroke()

  // Bubble pops
  const bubbles = [
    { bx: cx - 8, by: cy + 6, ph: 0       },
    { bx: cx + 10, by: cy - 4, ph: 2.1    },
    { bx: cx + 2,  by: cy + 12, ph: 4.2   },
  ]
  for (const { bx, by, ph } of bubbles) {
    const bp = (t * 0.003 + ph) % (Math.PI * 2)
    const br = 2.5 + Math.sin(bp) * 1.5
    if (Math.sin(bp) > 0.6) {
      ctx.fillStyle = `rgba(255,200,50,${0.3 + Math.sin(bp) * 0.5})`
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill()
    }
  }

  // Dark vignette edge
  ctx.strokeStyle = '#200400'
  ctx.lineWidth = 2
  ctx.strokeRect(tx + 1, ty + 1, TS - 2, TS - 2)
}


// ── Ice Shard Tower — crystalline formation with cold glow ────────────────────

export function drawIce(ctx, tx, ty, t) {
  const cx   = tx + TS / 2
  const cy   = ty + TS / 2
  const glow = osc(t, 0.004)
  const crk  = osc(t + 500, 0.006)

  // Cold glow background
  ctx.fillStyle = `rgba(30,80,140,${0.15 + glow * 0.15})`
  ctx.fillRect(tx, ty, TS, TS)

  // Stone base
  ctx.fillStyle = '#181828'
  ctx.fillRect(tx + 4, ty + 32, TS - 8, TS - 34)
  ctx.fillStyle = '#222238'
  ctx.fillRect(tx + 6, ty + 34, TS - 12, 6)

  // Ice crystal cluster — draw as stacked triangles (using rects + rotation)
  const drawCrystal = (ox, oy, w, h, tilt) => {
    ctx.save()
    ctx.translate(cx + ox, cy + oy)
    ctx.rotate(tilt)
    // Crystal body
    ctx.fillStyle = `rgba(140,200,255,${0.75 + crk * 0.2})`
    ctx.fillRect(-w / 2, -h, w, h)
    // Facet highlight
    ctx.fillStyle = `rgba(220,240,255,0.6)`
    ctx.fillRect(-w / 2 + 2, -h + 2, w / 2 - 2, h - 4)
    // Tip glint
    ctx.fillStyle = `rgba(255,255,255,${0.5 + glow * 0.5})`
    ctx.fillRect(-1, -h, 2, 4)
    ctx.restore()
  }

  drawCrystal(0,  -2, 10, 22, 0)          // centre tall crystal
  drawCrystal(-9, 4,  7,  14, -0.25)      // left short
  drawCrystal( 9, 4,  7,  14,  0.25)      // right short
  drawCrystal(-5, 1,  6,  10, -0.1)       // small left
  drawCrystal( 5, 1,  6,  10,  0.1)       // small right

  // Snowflake / cold pulse ring
  ctx.strokeStyle = `rgba(150,210,255,${0.2 + glow * 0.35})`
  ctx.lineWidth = 1
  ctx.setLineDash([3, 4])
  ctx.beginPath()
  ctx.arc(cx, cy, 16 + glow * 3, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
}


// ── Attack Animation System ──────────────────────────────────────────────────
//
// Each tower type has its own visual attack style:
//   dart     → needle projectile with trail
//   fire     → glowing fireball with flame trail
//   ice      → spinning crystal with sparkle trail
//   poison   → slow wobbly blob
//   slime    → bouncing green glob
//   skeleton → melee sword arc (stays at tile, no projectile)
//   wraith   → handled entirely by drawWraithTile(rushPos) — no extra effect

// How long (ms) each attack animation runs
export const ATTACK_DURATIONS = {
  dart:     230,
  fire:     360,
  ice:      310,
  poison:   600,
  slime:    370,
  skeleton: 430,
  wraith:   700,   // rush-to-target + return
  // New monsters
  troll:    500,   // ground-slam shockwave
  bat:      280,   // quick dark dash
  shadow:   380,   // shadowy tendril
  idol:     450,   // slow curse bolt
  gargoyle: 320,   // stone spike
}

// Easing helpers
const easeOut2 = t => 1 - (1 - t) * (1 - t)
const easeIn2  = t => t * t

// Wraith rush position: call each frame to get where the wraith should be drawn
// Returns { x, y } pixel position, or null if the flash has expired
export function wraithRushPos(flash, now) {
  const age      = now - flash.t
  const duration = ATTACK_DURATIONS.wraith
  if (age >= duration) return null

  const progress = age / duration
  const OUTWARD  = 0.40   // 0–40 % → rush out
  const eOut = easeOut2
  const eIn  = easeIn2

  if (progress < OUTWARD) {
    const p = eOut(progress / OUTWARD)
    return {
      x: flash.fromX + (flash.toX - flash.fromX) * p,
      y: flash.fromY + (flash.toY - flash.fromY) * p,
    }
  } else {
    const p = eIn((progress - OUTWARD) / (1 - OUTWARD))
    return {
      x: flash.toX + (flash.fromX - flash.toX) * p,
      y: flash.toY + (flash.fromY - flash.toY) * p,
    }
  }
}

// Main dispatch — call once per active flash each frame
export function drawAttackEffect(ctx, flash, now) {
  const { towerType, fromX, fromY, toX, toY } = flash
  const age      = now - flash.t
  const duration = ATTACK_DURATIONS[towerType] ?? 400
  if (age >= duration || age < 0) return

  const progress = age / duration                         // 0 → 1
  const angle    = Math.atan2(toY - fromY, toX - fromX)

  // Lerp helpers (eased)
  const px = (p) => fromX + (toX - fromX) * p
  const py = (p) => fromY + (toY - fromY) * p

  ctx.save()

  switch (towerType) {

    // ── Dart: thin needle with trailing feathers ────────────────────────────
    case 'dart': {
      const p   = easeOut2(progress)
      const cx  = px(p), cy = py(p)
      // Feather trail
      ctx.globalAlpha = 0.35 * (1 - progress)
      ctx.fillStyle = '#c8a040'
      for (let i = 1; i <= 3; i++) {
        const tp = Math.max(0, p - i * 0.09)
        ctx.beginPath(); ctx.arc(px(tp), py(tp), 2 - i * 0.4, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      // Shaft
      ctx.translate(cx, cy); ctx.rotate(angle)
      ctx.fillStyle = '#7a5020'
      ctx.fillRect(-10, -1.5, 18, 3)
      // Flights (back)
      ctx.fillStyle = '#c8a040'
      ctx.fillRect(-10, -3.5, 5, 3)
      ctx.fillRect(-10,  0.5, 5, 3)
      // Metal tip (front)
      ctx.fillStyle = '#c8c8d8'
      ctx.beginPath()
      ctx.moveTo(8, 0); ctx.lineTo(4, -3); ctx.lineTo(4, 3); ctx.closePath(); ctx.fill()
      break
    }

    // ── Fire: expanding fireball with flame trail ───────────────────────────
    case 'fire': {
      const p   = easeOut2(progress)
      const cx  = px(p), cy = py(p)
      const sz  = 6 + Math.sin(age * 0.025) * 1.5
      // Trailing glow blobs
      for (let i = 1; i <= 4; i++) {
        const tp = Math.max(0, p - i * 0.07)
        ctx.globalAlpha = (1 - progress) * 0.28 * (1 - i * 0.22)
        ctx.fillStyle = i < 3 ? '#ff8800' : '#ff4400'
        ctx.beginPath(); ctx.arc(px(tp), py(tp), sz - i, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      // Outer glow
      ctx.fillStyle = `rgba(255,160,0,${0.28 * (1 - progress)})`
      ctx.beginPath(); ctx.arc(cx, cy, sz + 6, 0, Math.PI * 2); ctx.fill()
      // Core
      ctx.fillStyle = '#ff6600'
      ctx.beginPath(); ctx.arc(cx, cy, sz, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ffcc00'
      ctx.beginPath(); ctx.arc(cx, cy, sz - 3, 0, Math.PI * 2); ctx.fill()
      break
    }

    // ── Ice: spinning diamond crystal with sparkle trail ───────────────────
    case 'ice': {
      const p   = easeOut2(progress)
      const cx  = px(p), cy = py(p)
      const spin = age * 0.012
      // Sparkle trail
      for (let i = 1; i <= 4; i++) {
        const tp = Math.max(0, p - i * 0.08)
        ctx.globalAlpha = (1 - progress) * 0.22
        ctx.fillStyle = '#a8d8ff'
        const sp = Math.sin(tp * 5 + i) * 3
        ctx.fillRect(px(tp) - 2 + sp, py(tp) - 2, 4, 4)
      }
      ctx.globalAlpha = 1
      ctx.translate(cx, cy); ctx.rotate(spin + angle)
      // Diamond body
      ctx.fillStyle = `rgba(140,210,255,${0.9 - progress * 0.25})`
      ctx.beginPath()
      ctx.moveTo(0, -9); ctx.lineTo(6, 0); ctx.lineTo(0, 9); ctx.lineTo(-6, 0); ctx.closePath()
      ctx.fill()
      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.fillRect(-1.5, -4, 3, 8)
      // Cold glow
      ctx.fillStyle = 'rgba(100,180,255,0.2)'
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill()
      break
    }

    // ── Poison: slow drifting blob with vapour wisps ───────────────────────
    case 'poison': {
      const p       = progress          // no easing — deliberately slow & linear
      const wobX    = Math.sin(age * 0.018) * 4
      const wobY    = Math.cos(age * 0.013) * 3
      const cx      = px(p) + wobX
      const cy      = py(p) + wobY
      // Vapour trail
      for (let i = 1; i <= 5; i++) {
        const tp = Math.max(0, p - i * 0.06)
        ctx.globalAlpha = 0.12 * (1 - i * 0.18)
        ctx.fillStyle = '#70c030'
        ctx.beginPath(); ctx.arc(px(tp), py(tp), 9, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 0.88 - progress * 0.2
      // Blob
      const blobSpin = age * 0.004
      ctx.fillStyle = '#3d8010'
      ctx.beginPath(); ctx.ellipse(cx, cy, 10, 8, blobSpin, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#70c020'
      ctx.beginPath(); ctx.ellipse(cx - 2, cy - 2, 6, 5, blobSpin, 0, Math.PI * 2); ctx.fill()
      // Tiny skull
      ctx.fillStyle = 'rgba(10,30,5,0.55)'
      ctx.fillRect(cx - 4, cy - 5, 8, 6)
      ctx.fillRect(cx - 3, cy - 7, 6, 3)
      break
    }

    // ── Slime: bouncy glob that squishes in flight ─────────────────────────
    case 'slime': {
      const p      = easeOut2(progress)
      const cx     = px(p), cy = py(p)
      const bounce = Math.sin(progress * Math.PI * 4) * 0.35  // wobble
      ctx.translate(cx, cy); ctx.rotate(angle)
      // Core
      ctx.fillStyle = `rgba(45,170,15,${0.9 - progress * 0.15})`
      ctx.beginPath(); ctx.ellipse(0, 0, 9 + bounce * 4, 9 - bounce * 4, 0, 0, Math.PI * 2); ctx.fill()
      // Highlight
      ctx.fillStyle = 'rgba(140,255,80,0.55)'
      ctx.beginPath(); ctx.ellipse(-2, -2, 5, 4, -0.3, 0, Math.PI * 2); ctx.fill()
      // Mini drip tail
      ctx.fillStyle = 'rgba(30,150,10,0.4)'
      ctx.beginPath(); ctx.ellipse(-9, 0, 5, 3, 0, 0, Math.PI * 2); ctx.fill()
      break
    }

    // ── Skeleton: melee sword arc — stays at tile, no travel ──────────────
    case 'skeleton': {
      const swingPeak = Math.sin(progress * Math.PI)   // 0 → 1 → 0
      ctx.translate(fromX, fromY - 10)

      // Sword arc sweep
      ctx.strokeStyle = `rgba(200,195,188,${swingPeak * 0.88})`
      ctx.lineWidth   = 3.5
      ctx.lineCap     = 'round'
      ctx.beginPath()
      ctx.arc(0, 0, 24, angle - 0.72, angle + 0.72)
      ctx.stroke()

      // Blade glint along arc
      const gx = Math.cos(angle) * 24, gy = Math.sin(angle) * 24
      ctx.fillStyle = `rgba(230,228,248,${swingPeak * 0.55})`
      ctx.fillRect(gx - 1, gy - 10, 2, 20)

      // Impact flash at tip
      if (swingPeak > 0.48) {
        const ia = (swingPeak - 0.48) / 0.52
        ctx.fillStyle = `rgba(255,248,200,${ia * 0.72})`
        ctx.beginPath(); ctx.arc(gx, gy, 7, 0, Math.PI * 2); ctx.fill()
        // Sparks
        for (let i = 0; i < 4; i++) {
          const sa = angle + (i - 1.5) * 0.45
          const sd = 10 + ia * 8
          ctx.fillStyle = `rgba(255,220,100,${ia * 0.6})`
          ctx.fillRect(
            gx + Math.cos(sa) * sd - 1,
            gy + Math.sin(sa) * sd - 1,
            2.5, 2.5
          )
        }
      }
      break
    }

    // ── Troll: ground-shockwave ring expanding from tower tile (AoE) ──────────
    case 'troll': {
      const ring = easeOut2(progress)
      const maxR = 30 + ring * 28
      ctx.translate(fromX, fromY)
      // Outer ring
      ctx.strokeStyle = `rgba(100,160,50,${0.7 * (1 - progress)})`
      ctx.lineWidth = 4 * (1 - progress * 0.6)
      ctx.beginPath(); ctx.arc(0, 0, maxR, 0, Math.PI * 2); ctx.stroke()
      // Inner ring
      ctx.strokeStyle = `rgba(160,220,80,${0.45 * (1 - progress)})`
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(0, 0, maxR * 0.55, 0, Math.PI * 2); ctx.stroke()
      // Ground crack lines
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const r = maxR * 0.6
        ctx.strokeStyle = `rgba(80,120,30,${0.4 * (1 - progress)})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8)
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        ctx.stroke()
      }
      break
    }

    // ── Bat: dark crimson dash from bat to target ─────────────────────────────
    case 'bat': {
      const p  = easeOut2(progress)
      const cx = px(p), cy = py(p)
      // Blood-red trail
      for (let i = 1; i <= 4; i++) {
        const tp = Math.max(0, p - i * 0.10)
        ctx.globalAlpha = (1 - progress) * 0.20
        ctx.fillStyle = '#8b0000'
        ctx.beginPath(); ctx.arc(px(tp), py(tp), 5 - i, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 0.85 - progress * 0.3
      // Bat silhouette (simplified wing shape)
      ctx.translate(cx, cy); ctx.rotate(angle)
      ctx.fillStyle = '#2a0818'
      ctx.beginPath()
      ctx.moveTo(0, 0); ctx.lineTo(-10, -5); ctx.lineTo(-6, 2); ctx.lineTo(0, 0)
      ctx.lineTo(10, -5); ctx.lineTo(6, 2); ctx.closePath(); ctx.fill()
      // Fangs impact
      if (progress > 0.7) {
        const ia = (progress - 0.7) / 0.3
        ctx.globalAlpha = ia * 0.65
        ctx.fillStyle = '#cc0020'
        ctx.beginPath(); ctx.arc(0, 0, 6 * ia, 0, Math.PI * 2); ctx.fill()
      }
      break
    }

    // ── Shadow Stalker: dark tendril stretching to target ─────────────────────
    case 'shadow': {
      const p   = progress          // linear — eerie
      const cx  = px(p), cy = py(p)
      const wob = Math.sin(age * 0.022) * 5
      // Wispy tendril segments
      for (let i = 0; i <= 8; i++) {
        const t2 = i / 8
        if (t2 > p) break
        const sx = fromX + (toX - fromX) * t2 + Math.sin(age * 0.015 + i) * wob
        const sy = fromY + (toY - fromY) * t2 + Math.cos(age * 0.012 + i) * wob * 0.6
        ctx.globalAlpha = (1 - t2) * 0.55 * (1 - progress * 0.4)
        ctx.fillStyle = '#5a0080'
        ctx.beginPath(); ctx.arc(sx, sy, 5 - t2 * 2, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 0.8 - progress * 0.5
      // Impact flash
      ctx.fillStyle = `rgba(140,0,200,${0.5 * (1 - progress)})`
      ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = `rgba(200,80,255,${0.7 * (1 - progress)})`
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill()
      break
    }

    // ── Cursed Idol: slow wobbling curse orb ─────────────────────────────────
    case 'idol': {
      const p   = progress * 0.85    // deliberately slow / ominous
      const wobX = Math.sin(age * 0.016) * 6
      const wobY = Math.cos(age * 0.011) * 4
      const cx   = px(p) + wobX
      const cy   = py(p) + wobY
      const sz   = 7 + Math.sin(age * 0.02) * 2
      // Outer haze
      ctx.globalAlpha = 0.18 * (1 - progress)
      ctx.fillStyle = '#6600aa'
      ctx.beginPath(); ctx.arc(cx, cy, sz + 12, 0, Math.PI * 2); ctx.fill()
      // Curse bolt body
      ctx.globalAlpha = 0.88 - progress * 0.25
      ctx.fillStyle = '#3d0066'
      ctx.beginPath(); ctx.arc(cx, cy, sz, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = `rgba(180,0,255,${0.9 - progress * 0.3})`
      ctx.beginPath(); ctx.arc(cx, cy, sz - 2, 0, Math.PI * 2); ctx.fill()
      // Spinning eye slit
      const spin = age * 0.008
      ctx.fillStyle = 'rgba(0,0,0,0.8)'
      ctx.save()
      ctx.translate(cx, cy); ctx.rotate(spin)
      ctx.beginPath(); ctx.ellipse(0, 0, sz - 2, 1.5, 0, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      // Highlight
      ctx.fillStyle = 'rgba(220,140,255,0.75)'
      ctx.beginPath(); ctx.arc(cx - sz * 0.3, cy - sz * 0.35, sz * 0.28, 0, Math.PI * 2); ctx.fill()
      break
    }

    // ── Gargoyle: stone spike hurled at the most advanced hero ───────────────
    case 'gargoyle': {
      const p    = easeOut2(progress)
      const cx   = px(p), cy = py(p)
      const spin = age * 0.02
      // Debris trail
      for (let i = 1; i <= 3; i++) {
        const tp = Math.max(0, p - i * 0.09)
        ctx.globalAlpha = (1 - progress) * 0.18
        ctx.fillStyle = '#6a6878'
        ctx.beginPath(); ctx.arc(px(tp), py(tp), 5 - i, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.translate(cx, cy); ctx.rotate(spin + angle)
      // Stone chunk — irregular rectangle
      ctx.fillStyle = '#5a5868'
      ctx.fillRect(-7, -5, 14, 10)
      ctx.fillStyle = '#6a6878'
      ctx.fillRect(-5, -6, 10, 12)
      // Stone edge shards
      ctx.fillStyle = '#4a4858'
      ctx.fillRect(-8, -2, 3, 4); ctx.fillRect(5, -3, 3, 6)
      // Crack highlight
      ctx.fillStyle = 'rgba(200,200,220,0.35)'
      ctx.fillRect(-3, -4, 1, 8); ctx.fillRect(1, -3, 1, 6)
      break
    }

    // Wraith: drawn by drawWraithTile(rushPos) — no extra canvas effect here
    case 'wraith':
    default:
      break
  }

  ctx.restore()
}


// Cave Troll: massive hunched green-grey brute, wide sweep arm, tiny red eyes
export function drawTrollTile(ctx, tx, ty, t) {
  const cx    = tx + TS / 2
  const cy    = ty + TS * 0.62
  const sway  = swing(t, 0.002) * 4
  const blink = step(t, 6, 400) < 1

  ctx.save()
  ctx.translate(sway, 0)

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.30)'
  ctx.beginPath(); ctx.ellipse(cx, cy + 10, 14, 4, 0, 0, Math.PI * 2); ctx.fill()

  // legs / feet
  ctx.fillStyle = '#3a5a28'
  ctx.fillRect(cx - 9, cy + 2, 7, 9); ctx.fillRect(cx + 2, cy + 2, 7, 9)
  ctx.fillStyle = '#2a4a18'
  ctx.fillRect(cx - 11, cy + 9, 9, 3); ctx.fillRect(cx + 2,  cy + 9, 9, 3)

  // body — massive hunched torso
  ctx.fillStyle = '#4a6a30'
  ctx.fillRect(cx - 13, cy - 14, 26, 18)
  ctx.fillStyle = '#5a7a38'
  ctx.fillRect(cx - 12, cy - 13, 24, 15)
  // belly rolls
  ctx.fillStyle = '#3a5820'
  ctx.fillRect(cx - 10, cy - 4, 20, 2); ctx.fillRect(cx - 9, cy - 8, 18, 2)
  // club arm (right) — raised for swing
  const swingY = sway * 0.8
  ctx.fillStyle = '#3a5228'
  ctx.fillRect(cx + 12, cy - 20 + swingY, 8, 18)  // arm
  ctx.fillStyle = '#5a4020'
  ctx.fillRect(cx + 10, cy - 28 + swingY, 12, 10) // club head
  ctx.fillStyle = '#6a5028'
  ctx.fillRect(cx + 11, cy - 27 + swingY, 10, 8)
  // left arm
  ctx.fillStyle = '#3a5228'
  ctx.fillRect(cx - 20, cy - 16, 8, 14)
  ctx.fillStyle = '#4a6230'
  ctx.fillRect(cx - 22, cy - 4, 9, 7) // fist
  // claws
  ctx.fillStyle = '#c8b880'
  ctx.fillRect(cx - 23, cy - 2, 3, 4); ctx.fillRect(cx - 20, cy - 2, 3, 4); ctx.fillRect(cx - 17, cy - 2, 3, 4)

  // head — big, low, beetled brow
  ctx.fillStyle = '#4a6a30'
  ctx.fillRect(cx - 11, cy - 30, 22, 18)
  ctx.fillStyle = '#5a7a38'
  ctx.fillRect(cx - 10, cy - 29, 20, 15)
  // brow ridge
  ctx.fillStyle = '#2a4a18'
  ctx.fillRect(cx - 11, cy - 23, 22, 5)
  // nose
  ctx.fillStyle = '#3a5a20'
  ctx.fillRect(cx - 3, cy - 20, 7, 6)
  // mouth (jagged teeth)
  ctx.fillStyle = '#1a1a0a'
  ctx.fillRect(cx - 8, cy - 15, 16, 4)
  ctx.fillStyle = '#e8e0c0'
  ctx.fillRect(cx - 7, cy - 15, 3, 3); ctx.fillRect(cx - 1, cy - 15, 3, 3); ctx.fillRect(cx + 5, cy - 15, 3, 3)
  // eyes
  ctx.fillStyle = blink ? '#3a5a20' : `rgba(220,40,20,0.9)`
  ctx.fillRect(cx - 8, cy - 25, 5, 4)
  ctx.fillRect(cx + 3, cy - 25, 5, 4)
  if (!blink) {
    ctx.fillStyle = 'rgba(255,80,20,0.5)'
    ctx.beginPath(); ctx.arc(cx - 6, cy - 23, 4, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(cx + 5,  cy - 23, 4, 0, Math.PI * 2); ctx.fill()
  }

  ctx.restore()
}


// Vampire Bat: small, fluttering wings, fangs, glowing red eyes
export function drawBatTile(ctx, tx, ty, t) {
  const cx       = tx + TS / 2
  const cy       = ty + TS * 0.45
  const wingFlap = swing(t, 0.018) // fast flap
  const hover    = osc(t, 0.006) * 4 - 2
  const eyeG     = osc(t, 0.007)

  ctx.save()

  // shadow (below, not directly under since it hovers)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath(); ctx.ellipse(cx, ty + TS * 0.85, 7, 2, 0, 0, Math.PI * 2); ctx.fill()

  // wings (left)
  ctx.fillStyle = '#2a0a3a'
  ctx.save()
  ctx.translate(cx - 6, cy + hover)
  ctx.rotate(-0.4 + wingFlap * 0.7)
  ctx.fillRect(-18, -4, 18, 10)
  ctx.fillRect(-14, -8, 10, 6)
  // membrane ridges
  ctx.fillStyle = '#3a1a4a'
  ctx.fillRect(-16, -3, 2, 8); ctx.fillRect(-11, -4, 2, 9); ctx.fillRect(-6, -3, 2, 8)
  ctx.restore()
  // wings (right)
  ctx.fillStyle = '#2a0a3a'
  ctx.save()
  ctx.translate(cx + 6, cy + hover)
  ctx.rotate(0.4 - wingFlap * 0.7)
  ctx.fillRect(0, -4, 18, 10)
  ctx.fillRect(4, -8, 10, 6)
  ctx.fillStyle = '#3a1a4a'
  ctx.fillRect(2, -3, 2, 8); ctx.fillRect(7, -4, 2, 9); ctx.fillRect(12, -3, 2, 8)
  ctx.restore()

  // body
  ctx.fillStyle = '#1a0828'
  ctx.beginPath(); ctx.ellipse(cx, cy + hover, 7, 9, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#2a1038'
  ctx.beginPath(); ctx.ellipse(cx, cy + hover, 5, 7, 0, 0, Math.PI * 2); ctx.fill()

  // head
  ctx.fillStyle = '#1a0828'
  ctx.beginPath(); ctx.ellipse(cx, cy - 8 + hover, 7, 6, 0, 0, Math.PI * 2); ctx.fill()
  // ears (pointed)
  ctx.fillStyle = '#2a0a3a'
  ctx.fillRect(cx - 10, cy - 16 + hover, 5, 10)
  ctx.fillRect(cx + 5,  cy - 16 + hover, 5, 10)
  ctx.fillStyle = '#8a0a18'
  ctx.fillRect(cx - 9, cy - 15 + hover, 3, 7)
  ctx.fillRect(cx + 6, cy - 15 + hover, 3, 7)
  // eyes — glowing crimson
  ctx.fillStyle = `rgba(255,20,20,${0.75 + eyeG * 0.25})`
  ctx.beginPath(); ctx.arc(cx - 3, cy - 9 + hover, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 3, cy - 9 + hover, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,150,100,0.7)'
  ctx.beginPath(); ctx.arc(cx - 2, cy - 10 + hover, 1, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 4, cy - 10 + hover, 1, 0, Math.PI * 2); ctx.fill()
  // fangs
  ctx.fillStyle = '#f0e8e0'
  ctx.fillRect(cx - 4, cy - 5 + hover, 2, 4)
  ctx.fillRect(cx + 2, cy - 5 + hover, 2, 4)
  // blood drop on fang
  ctx.fillStyle = 'rgba(200,20,20,0.8)'
  ctx.fillRect(cx - 4, cy - 2 + hover, 2, 2)
  ctx.fillRect(cx + 2, cy - 2 + hover, 2, 2)

  ctx.restore()
}


// Shadow Stalker: barely-visible dark silhouette, twin glowing violet eyes, wispy tendrils
export function drawShadowTile(ctx, tx, ty, t) {
  const cx      = tx + TS / 2
  const cy      = ty + TS * 0.55
  const drift   = swing(t, 0.003) * 3
  const eyeG    = osc(t, 0.005)
  const tendrils= osc(t, 0.004)

  ctx.save()
  ctx.translate(drift, 0)

  // outer shadow haze (large, very faint)
  ctx.fillStyle = `rgba(20,0,40,${0.10 + tendrils * 0.08})`
  ctx.beginPath(); ctx.ellipse(cx, cy, 20, 22, 0, 0, Math.PI * 2); ctx.fill()

  // tendrils / wisps
  ctx.fillStyle = `rgba(60,0,80,${0.25 + tendrils * 0.2})`
  ctx.fillRect(cx - 18, cy + 4, 6, 3)
  ctx.fillRect(cx + 12, cy + 6, 7, 3)
  ctx.fillRect(cx - 10, cy + 10, 5, 4)
  ctx.fillRect(cx + 6, cy + 11, 5, 3)
  ctx.fillRect(cx - 4, cy + 14, 8, 3)

  // core form — dark and shifting
  ctx.fillStyle = `rgba(15,0,30,0.85)`
  ctx.fillRect(cx - 9, cy - 16, 18, 26)
  ctx.fillStyle = `rgba(30,0,55,0.75)`
  ctx.fillRect(cx - 7, cy - 18, 14, 26)
  // inner glow
  ctx.fillStyle = `rgba(80,0,120,${0.12 + tendrils * 0.14})`
  ctx.fillRect(cx - 5, cy - 16, 10, 22)

  // clawed arms
  ctx.fillStyle = 'rgba(20,0,40,0.80)'
  ctx.fillRect(cx - 18, cy - 10, 10, 6)
  ctx.fillRect(cx + 8, cy - 10, 10, 6)
  // claw tips
  ctx.fillStyle = `rgba(100,0,140,${0.5 + eyeG * 0.4})`
  ctx.fillRect(cx - 20, cy - 8, 3, 5)
  ctx.fillRect(cx - 17, cy - 6, 3, 5)
  ctx.fillRect(cx + 17, cy - 8, 3, 5)
  ctx.fillRect(cx + 14, cy - 6, 3, 5)

  // head — shrouded, just a dark mass with eyes
  ctx.fillStyle = 'rgba(10,0,22,0.90)'
  ctx.beginPath(); ctx.ellipse(cx, cy - 20, 9, 8, 0, 0, Math.PI * 2); ctx.fill()
  // twin glowing violet eyes
  ctx.fillStyle = `rgba(180,40,255,${0.70 + eyeG * 0.30})`
  ctx.beginPath(); ctx.arc(cx - 4, cy - 21, 3, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 4, cy - 21, 3, 0, Math.PI * 2); ctx.fill()
  // eye glow halos
  ctx.fillStyle = `rgba(180,40,255,${0.15 + eyeG * 0.18})`
  ctx.beginPath(); ctx.arc(cx - 4, cy - 21, 7, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 4, cy - 21, 7, 0, Math.PI * 2); ctx.fill()
  // bright pupils
  ctx.fillStyle = `rgba(240,180,255,0.9)`
  ctx.beginPath(); ctx.arc(cx - 4, cy - 22, 1.2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 4, cy - 22, 1.2, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}


// Cursed Idol: stone pedestal, glowing eye, orbiting dark rune fragments
export function drawIdolTile(ctx, tx, ty, t) {
  const cx     = tx + TS / 2
  const cy     = ty + TS * 0.65
  const pulse  = osc(t, 0.005)
  const orbit  = t * 0.0025

  ctx.save()

  // pedestal base
  ctx.fillStyle = '#3a2a4a'
  ctx.fillRect(cx - 12, cy - 2, 24, 10)
  ctx.fillStyle = '#4a3a5a'
  ctx.fillRect(cx - 10, cy - 1, 20, 8)
  // stone cracks
  ctx.fillStyle = '#2a1a3a'
  ctx.fillRect(cx - 7, cy + 2, 2, 5)
  ctx.fillRect(cx + 3, cy + 1, 2, 6)

  // idol body — crude carved stone figure
  ctx.fillStyle = '#3a2a4a'
  ctx.fillRect(cx - 7, cy - 18, 14, 18)
  ctx.fillStyle = '#4a3a5a'
  ctx.fillRect(cx - 6, cy - 17, 12, 16)
  // carved rune lines on body
  ctx.fillStyle = `rgba(150,0,200,${0.30 + pulse * 0.35})`
  ctx.fillRect(cx - 4, cy - 15, 8, 2)
  ctx.fillRect(cx - 4, cy - 11, 8, 2)
  ctx.fillRect(cx - 4, cy - 7, 8, 2)

  // large eye socket
  ctx.fillStyle = '#1a0a2a'
  ctx.beginPath(); ctx.ellipse(cx, cy - 26, 9, 7, 0, 0, Math.PI * 2); ctx.fill()
  // iris
  ctx.fillStyle = `rgb(${120 + (pulse * 80)|0}, 0, ${180 + (pulse * 75)|0})`
  ctx.beginPath(); ctx.ellipse(cx, cy - 26, 6, 5, 0, 0, Math.PI * 2); ctx.fill()
  // pupil
  ctx.fillStyle = '#0a000f'
  ctx.beginPath(); ctx.ellipse(cx, cy - 26, 2.5, 3.5, 0, 0, Math.PI * 2); ctx.fill()
  // eye glow
  ctx.fillStyle = `rgba(160,0,220,${0.12 + pulse * 0.18})`
  ctx.beginPath(); ctx.arc(cx, cy - 26, 14, 0, Math.PI * 2); ctx.fill()
  // highlight
  ctx.fillStyle = `rgba(220,160,255,${0.6 + pulse * 0.4})`
  ctx.beginPath(); ctx.arc(cx - 2, cy - 28, 2, 0, Math.PI * 2); ctx.fill()

  // orbiting rune fragments
  const runes = [0, Math.PI * 0.66, Math.PI * 1.32]
  runes.forEach((offset, i) => {
    const a = orbit + offset
    const rx = cx + Math.cos(a) * 16
    const ry = (cy - 26) + Math.sin(a) * 10
    ctx.fillStyle = `rgba(180,60,255,${0.5 + pulse * 0.4})`
    ctx.fillRect(rx - 2, ry - 2, 4, 4)
    ctx.fillStyle = `rgba(220,160,255,0.7)`
    ctx.fillRect(rx - 1, ry - 1, 2, 2)
  })

  ctx.restore()
}


// Gargoyle: crouched stone creature with wings, perched and watching
export function drawGargoyleTile(ctx, tx, ty, t) {
  const cx    = tx + TS / 2
  const cy    = ty + TS * 0.60
  const alert = osc(t, 0.003)    // slow breathing / watch
  const eyeG  = osc(t, 0.006)

  ctx.save()

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath(); ctx.ellipse(cx, cy + 10, 14, 4, 0, 0, Math.PI * 2); ctx.fill()

  // folded wings (behind body)
  ctx.fillStyle = '#3a3848'
  ctx.fillRect(cx - 20, cy - 22, 10, 26)  // left wing
  ctx.fillRect(cx + 10, cy - 22, 10, 26)  // right wing
  ctx.fillStyle = '#2a2838'
  // wing ribs
  ctx.fillRect(cx - 19, cy - 20, 2, 22); ctx.fillRect(cx - 15, cy - 20, 2, 22)
  ctx.fillRect(cx + 17, cy - 20, 2, 22); ctx.fillRect(cx + 13, cy - 20, 2, 22)

  // body — crouched, compact stone
  ctx.fillStyle = '#5a5868'
  ctx.fillRect(cx - 10, cy - 18, 20, 22)
  ctx.fillStyle = '#6a6878'
  ctx.fillRect(cx - 9, cy - 17, 18, 20)
  // stone texture lines
  ctx.fillStyle = '#4a4858'
  ctx.fillRect(cx - 7, cy - 10, 14, 2)
  ctx.fillRect(cx - 7, cy - 5, 14, 2)
  ctx.fillRect(cx - 7, cy,  14, 2)

  // legs / talons
  ctx.fillStyle = '#5a5868'
  ctx.fillRect(cx - 9, cy + 3, 7, 8); ctx.fillRect(cx + 2, cy + 3, 7, 8)
  // talon claws
  ctx.fillStyle = '#3a3848'
  ctx.fillRect(cx - 11, cy + 8, 4, 3); ctx.fillRect(cx - 8, cy + 10, 4, 3); ctx.fillRect(cx - 5, cy + 8, 4, 3)
  ctx.fillRect(cx + 1,  cy + 8, 4, 3); ctx.fillRect(cx + 4, cy + 10, 4, 3); ctx.fillRect(cx + 7, cy + 8, 4, 3)

  // horns
  ctx.fillStyle = '#3a3848'
  ctx.fillRect(cx - 10, cy - 28, 4, 12); ctx.fillRect(cx + 6, cy - 28, 4, 12)
  ctx.fillStyle = '#4a4858'
  ctx.fillRect(cx - 9,  cy - 26, 2, 9); ctx.fillRect(cx + 7, cy - 26, 2, 9)

  // head — flat, broad, brutish
  ctx.fillStyle = '#5a5868'
  ctx.fillRect(cx - 10, cy - 28, 20, 14)
  ctx.fillStyle = '#6a6878'
  ctx.fillRect(cx - 9, cy - 27, 18, 12)
  // snout
  ctx.fillStyle = '#5a5868'
  ctx.fillRect(cx - 5, cy - 18, 10, 5)
  // nostrils
  ctx.fillStyle = '#3a3848'
  ctx.fillRect(cx - 4, cy - 16, 3, 2); ctx.fillRect(cx + 1, cy - 16, 3, 2)

  // eyes — watching, green glow
  ctx.fillStyle = '#1a1828'
  ctx.fillRect(cx - 8, cy - 26, 6, 5); ctx.fillRect(cx + 2, cy - 26, 6, 5)
  ctx.fillStyle = `rgba(60,200,80,${0.65 + eyeG * 0.35})`
  ctx.fillRect(cx - 7, cy - 25, 4, 3); ctx.fillRect(cx + 3, cy - 25, 4, 3)
  // eye glow
  ctx.fillStyle = `rgba(60,200,80,${0.08 + alert * 0.10})`
  ctx.beginPath(); ctx.arc(cx - 5, cy - 24, 6, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 5, cy - 24, 6, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}


// ── Sprite maps ──────────────────────────────────────────────────────────────

export const HERO_SPRITES = {
  knight:      drawKnight,
  mage:        drawMage,
  thief:       drawThief,
  paladin:     drawPaladin,
  berserker:   drawBerserker,
  ranger:      drawRanger,
  cleric:      drawCleric,
  archmage:    drawArchmage,
  champion:    drawChampion,
  warlord:     drawWarlord,
  regenerator: drawRegenerator,
}

export const TILE_SPRITES = {
  skeleton: drawSkeletonTile,
  slime:    drawSlimeTile,
  wraith:   drawWraithTile,
  troll:    drawTrollTile,
  bat:      drawBatTile,
  shadow:   drawShadowTile,
  idol:     drawIdolTile,
  gargoyle: drawGargoyleTile,
  spike:    drawSpike,
  boulder:  drawBoulder,
  door:     drawDoor,
  dart:     drawDartTower,
  fire:     drawFire,
  poison:   drawPoison,
  lava:     drawLava,
  ice:      drawIce,
}
