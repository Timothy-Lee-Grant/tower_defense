import React, { useRef, useEffect, useCallback } from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { TILE, TILE_SIZE, GRID_COLS, GRID_ROWS, DUNGEON_TOOLS, WAVE_CONFIGS } from '../game/constants.js'
import { HERO_SPRITES, TILE_SPRITES, ATTACK_DURATIONS, drawAttackEffect, wraithRushPos } from '../game/sprites.js'
import { ParticleSystem, PARTICLE_EFFECTS } from '../rendering/particles.js'
import { computeCoverageMap, HERO_PATH_COLORS } from '../game/analysis.js'

// ── Tile base colors ────────────────────────────────────────────────────────
const TILE_COLORS = {
  [TILE.EMPTY]:    { bg: '#16121a', border: '#1e1828' },
  [TILE.PATH]:     { bg: '#2a2218', border: '#3d3020' },
  [TILE.ENTRANCE]: { bg: '#0c0a10', border: '#4a3a60', label: '🚪', glow: '#2d1f40' },
  [TILE.TREASURE]: { bg: '#1a1000', border: '#c9a02a', label: '💰', glow: '#c9a02a' },
  [TILE.SPIKE]:    { bg: '#221c12', border: '#38301e' },
  [TILE.BOULDER]:  { bg: '#1e1a12', border: '#32281a' },
  [TILE.DOOR]:     { bg: '#1a1208', border: '#2e2010' },
  [TILE.DART]:     { bg: '#18121e', border: '#241a2e' },
  [TILE.FIRE]:     { bg: '#1a0e06', border: '#281606' },
  [TILE.POISON]:   { bg: '#0e1608', border: '#181e0a' },
  [TILE.SKELETON]: { bg: '#16121a', border: '#221820' },
  [TILE.SLIME]:    { bg: '#0c1408', border: '#161e0c' },
  [TILE.WRAITH]:   { bg: '#100c18', border: '#1c1428' },
  [TILE.LAVA]:     { bg: '#200400', border: '#3a0800' },
  [TILE.ICE]:      { bg: '#08101e', border: '#10182e' },
  // New off-path towers (7.2)
  [TILE.CATAPULT]: { bg: '#1e1408', border: '#302010' },
  [TILE.SPIDER]:   { bg: '#0e0a08', border: '#1a1008' },
  [TILE.MIMIC]:    { bg: '#1c1008', border: '#2e1c08' },
  // New traps (7.1)
  [TILE.PIT]:      { bg: '#1a1008', border: '#2e2010' },
  [TILE.PENDULUM]: { bg: '#14101e', border: '#222038' },
  [TILE.TAR]:      { bg: '#180e04', border: '#281604' },
  [TILE.ELECTRIC]: { bg: '#0a0818', border: '#141228' },
  [TILE.STASIS]:   { bg: '#060e18', border: '#0c1828' },
}

// Tower type → particle preset mapping
const TOWER_PARTICLES = {
  fire:     'ember',
  poison:   'bubble',
  ice:      'crystal',
  dart:     'dart_impact',
  skeleton: 'bone',
  slime:    'slime',
  wraith:   'wraith',
  bat:      'drain',
  troll:    'troll',
  idol:     'curse_wisp',
  shadow:   'shadow',
  gargoyle: 'gargoyle',
}

// Floating number colors by source
const DMG_COLOR = {
  normal:  '#f0f0f0',
  cursed:  '#ffaa20',
  poison:  '#60dd30',
  ice:     '#80ccff',
  fire:    '#ff8030',
  drain:   '#cc40ff',
  treasure: '#ff4444',
}

export default function DungeonGrid({ onTileClick, onTileRightClick }) {
  const canvasRef = useRef(null)

  // Store subscriptions
  const phase         = useGameStore(s => s.phase)
  const grid          = useGameStore(s => s.grid)
  const heroes        = useGameStore(s => s.heroes)
  const selectedTool  = useGameStore(s => s.selectedTool)
  const attackFlashes = useGameStore(s => s.attackFlashes)
  const screenShake      = useGameStore(s => s.screenShake)
  const treasureHp       = useGameStore(s => s.treasureHp)
  const trapTimers       = useGameStore(s => s.trapTimers)
  const tileUpgrades     = useGameStore(s => s.tileUpgrades)
  const layoutData       = useGameStore(s => s.layoutData)
  const showPathPreview  = useGameStore(s => s.showPathPreview)
  const showCoverageMap  = useGameStore(s => s.showCoverageMap)
  const waveIndex              = useGameStore(s => s.waveIndex)
  const bossEntranceFanfareEnd   = useGameStore(s => s.bossEntranceFanfareEnd)
  const bossEntranceFanfareColor = useGameStore(s => s.bossEntranceFanfareColor)

  // Global events visual state
  const caveInTiles    = useGameStore(s => s.caveInTiles)
  const holyGroundZone = useGameStore(s => s.holyGroundZone)
  const caveInTilesRef   = useRef(caveInTiles)
  const holyGroundRef    = useRef(holyGroundZone)
  caveInTilesRef.current = caveInTiles
  holyGroundRef.current  = holyGroundZone

  // Boss fanfare refs
  const bossFanfareEndRef   = useRef(bossEntranceFanfareEnd)
  const bossFanfareColorRef = useRef(bossEntranceFanfareColor)
  bossFanfareEndRef.current   = bossEntranceFanfareEnd
  bossFanfareColorRef.current = bossEntranceFanfareColor

  const hoveredTile      = useRef(null)
  const animFrame        = useRef(null)

  // Refs for rapidly-changing wave state — avoids restarting the draw loop
  const heroesRef        = useRef(heroes)
  const gridRef          = useRef(grid)
  const attackFlashesRef  = useRef(attackFlashes)
  const trapTimersRef     = useRef(trapTimers)
  const tileUpgradesRef   = useRef(tileUpgrades)
  const layoutDataRef     = useRef(layoutData)
  heroesRef.current        = heroes
  gridRef.current          = grid
  attackFlashesRef.current = attackFlashes
  trapTimersRef.current    = trapTimers
  tileUpgradesRef.current  = tileUpgrades
  layoutDataRef.current    = layoutData

  // ── Juice state refs (mutated directly by effects, read in draw loop) ─────
  const psRef              = useRef(new ParticleSystem())   // particle system
  const shakeRef           = useRef({ x: 0, y: 0, intensity: 0, decay: 0.84 })
  const tileAnimsRef       = useRef([])   // [{ col, row, startTime }]
  const treasureFlashRef   = useRef({ active: false, startTime: 0 })
  const heroEntryRef       = useRef(0)    // performance.now() of last spawn
  const prevHeroesRef      = useRef([])
  const prevGridRef        = useRef(null)
  const prevTreasureHpRef  = useRef(treasureHp)
  const lastFlashTimeRef   = useRef(0)

  // ── Overlay state refs ────────────────────────────────────────────────────
  const coverageMapRef     = useRef(null)   // 2D array of coverage counts, or null
  const pathHeroTypesRef   = useRef([])     // hero type IDs for next wave

  // Recompute coverage map when grid changes or overlay toggled
  useEffect(() => {
    coverageMapRef.current = showCoverageMap ? computeCoverageMap(grid, layoutDataRef.current.pathTiles) : null
  }, [grid, showCoverageMap])

  // Recompute hero types for path preview when wave index or overlay changes
  useEffect(() => {
    if (!showPathPreview) { pathHeroTypesRef.current = []; return }
    const wave = WAVE_CONFIGS[waveIndex]
    pathHeroTypesRef.current = wave ? [...new Set(wave.heroes)] : []
  }, [waveIndex, showPathPreview])

  const selectedToolDef = selectedTool
    ? DUNGEON_TOOLS.find(t => t.id === selectedTool)
    : null

  // ── Screen shake ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (screenShake > 0) {
      shakeRef.current.intensity = Math.max(shakeRef.current.intensity, screenShake)
    }
  }, [screenShake])

  // ── Particles from attack flashes ─────────────────────────────────────────
  useEffect(() => {
    const ps = psRef.current
    const newFlashes = attackFlashes.filter(f => f.t > lastFlashTimeRef.current)
    newFlashes.forEach(flash => {
      const preset = PARTICLE_EFFECTS[TOWER_PARTICLES[flash.towerType] ?? 'dart_impact']
      if (preset) ps.emit(flash.toX, flash.toY, preset)

      // Floating damage number
      if (flash.damage != null && flash.damage > 0) {
        let color = flash.cursed ? DMG_COLOR.cursed : DMG_COLOR.normal
        if (flash.towerType === 'poison') color = DMG_COLOR.poison
        if (flash.towerType === 'fire')   color = DMG_COLOR.fire
        if (flash.towerType === 'ice')    color = DMG_COLOR.ice
        if (flash.towerType === 'bat')    color = DMG_COLOR.drain
        ps.emitText(flash.toX, flash.toY - 16, flash.damage, color)
      }
    })
    if (newFlashes.length > 0) {
      lastFlashTimeRef.current = Math.max(...newFlashes.map(f => f.t))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackFlashes])

  // ── Particles + death detection from hero state changes ───────────────────
  useEffect(() => {
    const ps       = psRef.current
    const prev     = prevHeroesRef.current

    // Newly dead → blood burst
    heroes.forEach(h => {
      const prevH = prev.find(p => p.id === h.id)
      if (h.state === 'dead' && prevH && prevH.state !== 'dead') {
        ps.emit(h.x, h.y, PARTICLE_EFFECTS.blood)
      }
    })

    // Newly spawned → entry flash at their position
    const newlySpawned = heroes.filter(h => {
      const p = prev.find(p => p.id === h.id)
      return h.spawned && (!p || !p.spawned)
    })
    if (newlySpawned.length > 0) {
      heroEntryRef.current = performance.now()
      ps.emit(
        layoutDataRef.current.entrance.col * TILE_SIZE + TILE_SIZE / 2,
        layoutDataRef.current.entrance.row * TILE_SIZE + TILE_SIZE / 2,
        PARTICLE_EFFECTS.spawn_flash,
      )
    }

    prevHeroesRef.current = heroes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroes])

  // ── Particles from trap_triggered events (via grid + battle log) ──────────
  // We wire trap particles via attackFlashes already captured above.
  // For on-path trap triggers we'd need a separate event stream; handled below
  // via a separate trapEventsRef mechanism fed from the store's battleLog length
  // proxy. Instead, we detect boulder removal (grid cell reverts to PATH) here.
  useEffect(() => {
    const ps      = psRef.current
    const prevG   = prevGridRef.current
    if (!prevG) { prevGridRef.current = grid; return }

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const was = prevG[r][c]
        const now = grid[r][c]

        if (was === now) continue

        // New tile placed (stamp animation + sparkle)
        if (now !== TILE.EMPTY && now !== TILE.PATH &&
            now !== TILE.ENTRANCE && now !== TILE.TREASURE) {
          tileAnimsRef.current.push({ col: c, row: r, startTime: performance.now() })
          ps.emit(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, PARTICLE_EFFECTS.placement)
        }

        // Boulder removed mid-wave (it was triggered)
        if (was === TILE.BOULDER && now === TILE.PATH) {
          ps.emit(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, PARTICLE_EFFECTS.rock)
        }
      }
    }
    prevGridRef.current = grid
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid])

  // ── Treasure damage flash + particles ────────────────────────────────────
  useEffect(() => {
    if (treasureHp < prevTreasureHpRef.current) {
      const tx = layoutDataRef.current.treasure.col * TILE_SIZE + TILE_SIZE / 2
      const ty = layoutDataRef.current.treasure.row * TILE_SIZE + TILE_SIZE / 2
      const damage = Math.round(prevTreasureHpRef.current - treasureHp)
      psRef.current.emit(tx, ty, PARTICLE_EFFECTS.gold_sparkle)
      psRef.current.emitText(tx, ty - 20, `-${damage}`, DMG_COLOR.treasure, 13)
      treasureFlashRef.current = { active: true, startTime: performance.now() }
    }
    prevTreasureHpRef.current = treasureHp
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treasureHp])

  // ── Main draw loop ────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const t   = performance.now()
    const now = t

    const currentGrid    = gridRef.current
    const currentHeroes  = heroesRef.current
    const currentFlashes = attackFlashesRef.current
    const currentTimers  = trapTimersRef.current
    const ps             = psRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ── Screen shake ────────────────────────────────────────────────────────
    const shake = shakeRef.current
    let   shook = false
    if (shake.intensity > 0.15) {
      shake.x = (Math.random() - 0.5) * shake.intensity
      shake.y = (Math.random() - 0.5) * shake.intensity
      shake.intensity *= shake.decay
      ctx.save()
      ctx.translate(Math.round(shake.x), Math.round(shake.y))
      shook = true
    }

    // ── 1. Tile bases (bg + border) ──────────────────────────────────────────
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileId = currentGrid[row][col]
        const colors = TILE_COLORS[tileId] ?? TILE_COLORS[TILE.EMPTY]
        const x = col * TILE_SIZE
        const y = row * TILE_SIZE

        // Tile placement scale animation
        const anim = tileAnimsRef.current.find(a => a.col === col && a.row === row)
        if (anim) {
          const elapsed = t - anim.startTime
          if (elapsed > 220) {
            // Done — remove it
            tileAnimsRef.current = tileAnimsRef.current.filter(a => a !== anim)
          } else {
            // Stamp: 0 → 1.15 → 1.0 over 220ms
            const p = elapsed / 220
            const scale = p < 0.55
              ? 0.3 + p / 0.55 * 0.85     // 0.3 → 1.15
              : 1.15 - (p - 0.55) / 0.45 * 0.15  // 1.15 → 1.0
            const cx = x + TILE_SIZE / 2
            const cy = y + TILE_SIZE / 2
            ctx.save()
            ctx.translate(cx, cy)
            ctx.scale(scale, scale)
            ctx.translate(-cx, -cy)
            _drawTileBase(ctx, x, y, tileId, colors, t)
            ctx.restore()
            continue
          }
        }

        _drawTileBase(ctx, x, y, tileId, colors, t)
      }
    }

    // ── 2. Tile sprites ──────────────────────────────────────────────────────
    const wraithFlashes = currentFlashes.filter(f => f.towerType === 'wraith' && now - f.t < ATTACK_DURATIONS.wraith)
    const wraithRushMap = new Map()
    for (const flash of wraithFlashes) {
      const pos = wraithRushPos(flash, now)
      if (pos) wraithRushMap.set(`${flash.tileCol},${flash.tileRow}`, pos)
    }

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileId = currentGrid[row][col]
        const drawFn = TILE_SPRITES[tileId]
        if (!drawFn) continue
        if (tileId === 'wraith') continue

        const x = col * TILE_SIZE
        const y = row * TILE_SIZE
        ctx.save()
        ctx.beginPath(); ctx.rect(x, y, TILE_SIZE, TILE_SIZE); ctx.clip()

        // State-dependent sprites: pit (armed?) and pendulum (swinging?)
        if (tileId === TILE.PIT) {
          const pitKey  = `pit_${col},${row}`
          const isArmed = !(currentTimers[pitKey] > 0)
          drawFn(ctx, x, y, t, { armed: isArmed })
        } else if (tileId === TILE.PENDULUM) {
          const pendKey  = `pendulum_${col},${row}`
          const phase    = currentTimers[pendKey] ?? 0
          drawFn(ctx, x, y, t, { swinging: (phase % 4000) < 2000 })
        } else {
          drawFn(ctx, x, y, t)
        }
        ctx.restore()
      }
    }

    // ── 2b. Wraith sprites ───────────────────────────────────────────────────
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (currentGrid[row][col] !== 'wraith') continue
        const x     = col * TILE_SIZE
        const y     = row * TILE_SIZE
        const rushP = wraithRushMap.get(`${col},${row}`) ?? null
        ctx.save()
        TILE_SPRITES.wraith(ctx, x, y, t, rushP)
        ctx.restore()
      }
    }

    // ── 2b.5 Upgrade tier badges ─────────────────────────────────────────────
    const currentUpgrades = tileUpgradesRef.current
    for (const [key, tier] of Object.entries(currentUpgrades)) {
      if (tier <= 0) continue
      const [col, row] = key.split(',').map(Number)
      const x = col * TILE_SIZE
      const y = row * TILE_SIZE
      // Badge in top-right corner
      const bx = x + TILE_SIZE - 11
      const by = y + 3
      ctx.save()
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      if (tier === 2) {
        // Tier 3 — gold crown
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.beginPath(); ctx.arc(bx, by + 5, 7, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ffaa20'
        ctx.fillText('♛', bx, by)
      } else {
        // Tier 2 — blue gem
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.beginPath(); ctx.arc(bx, by + 5, 7, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#60aaff'
        ctx.fillText('◆', bx, by)
      }
      ctx.restore()
    }

    // ── 2c. Coverage heatmap overlay ─────────────────────────────────────────
    const cmap = coverageMapRef.current
    if (cmap) {
      // Green tint on covered tiles
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const count = cmap[row][col]
          if (count === 0) continue
          const intensity = Math.min(1, count / 3)   // 3+ towers = full green
          ctx.fillStyle = `rgba(40,200,80,${intensity * 0.26})`
          ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }
      // Red warning on path tiles with zero coverage — these are gaps!
      for (const pt of layoutDataRef.current.pathTiles) {
        if ((cmap[pt.row]?.[pt.col] ?? 0) === 0) {
          ctx.fillStyle = 'rgba(220,40,40,0.22)'
          ctx.fillRect(pt.col * TILE_SIZE, pt.row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }
      // Coverage count label on covered path tiles (shows number of towers)
      ctx.font = `bold 9px monospace`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      for (const pt of layoutDataRef.current.pathTiles) {
        const count = cmap[pt.row]?.[pt.col] ?? 0
        if (count === 0) continue
        ctx.fillStyle = count >= 3 ? 'rgba(80,255,100,0.9)' : 'rgba(180,255,180,0.8)'
        ctx.fillText(count, pt.col * TILE_SIZE + TILE_SIZE / 2, pt.row * TILE_SIZE + TILE_SIZE / 2)
      }
    }

    // ── 2c-ii. Cave-in warning: pulsing red/orange hazard tint on doomed tiles ──
    const caveInList = caveInTilesRef.current
    if (caveInList && caveInList.length > 0) {
      const pulse = 0.45 + 0.35 * Math.sin(t * 0.012)   // 0.1 → 0.8 oscillation
      ctx.save()
      caveInList.forEach(({ col, row }) => {
        const x = col * TILE_SIZE
        const y = row * TILE_SIZE
        // Hazard fill
        ctx.fillStyle = `rgba(200,60,10,${pulse * 0.55})`
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
        // Hazard border
        ctx.strokeStyle = `rgba(255,120,30,${pulse * 0.9})`
        ctx.lineWidth   = 2
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2)
        // Warning icon
        ctx.font          = `bold ${Math.round(TILE_SIZE * 0.45)}px sans-serif`
        ctx.textAlign     = 'center'
        ctx.textBaseline  = 'middle'
        ctx.globalAlpha   = pulse * 0.85
        ctx.fillStyle     = '#ffcc44'
        ctx.fillText('💥', x + TILE_SIZE / 2, y + TILE_SIZE / 2)
        ctx.globalAlpha   = 1
      })
      ctx.restore()
    }

    // ── 2c-iii. Holy ground zone: soft blue/gold shimmer, no-placement ────────
    const hgz = holyGroundRef.current
    if (hgz) {
      const shimmer = 0.12 + 0.08 * Math.sin(t * 0.005)
      ctx.save()
      for (let r = hgz.minRow; r <= hgz.maxRow; r++) {
        for (let c = hgz.minCol; c <= hgz.maxCol; c++) {
          ctx.fillStyle = `rgba(160,200,255,${shimmer})`
          ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }
      // Outer border
      ctx.strokeStyle = `rgba(160,200,255,${shimmer * 4})`
      ctx.lineWidth   = 2
      ctx.setLineDash([4, 3])
      ctx.strokeRect(
        hgz.minCol * TILE_SIZE, hgz.minRow * TILE_SIZE,
        (hgz.maxCol - hgz.minCol + 1) * TILE_SIZE,
        (hgz.maxRow - hgz.minRow + 1) * TILE_SIZE
      )
      ctx.setLineDash([])
      // Label
      ctx.font          = `bold 9px monospace`
      ctx.textAlign     = 'center'
      ctx.textBaseline  = 'top'
      ctx.fillStyle     = `rgba(200,230,255,0.85)`
      ctx.fillText(
        '✨ HOLY',
        (hgz.minCol + (hgz.maxCol - hgz.minCol) / 2) * TILE_SIZE + TILE_SIZE / 2,
        hgz.minRow * TILE_SIZE + 3
      )
      ctx.restore()
    }

    // ── 2d. Path preview overlay ──────────────────────────────────────────────
    const previewTypes = pathHeroTypesRef.current
    if (previewTypes.length > 0) {
      const heroCount = previewTypes.length
      previewTypes.forEach((heroTypeId, idx) => {
        const color  = HERO_PATH_COLORS[heroTypeId] ?? '#ffffff'
        // Spread lines ±offset perpendicular to the path direction
        const offset = (idx - (heroCount - 1) / 2) * 2.8

        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth   = 2.2
        // Animate the dashes flowing forward along the path
        ctx.setLineDash([6, 5])
        ctx.lineDashOffset = -(t * 0.02) % 11
        ctx.lineJoin  = 'round'
        ctx.globalAlpha = 0.75
        ctx.beginPath()

        let started = false
        for (let i = 0; i < layoutDataRef.current.pathTiles.length; i++) {
          const tile     = layoutDataRef.current.pathTiles[i]
          // Compute perpendicular offset from averaged direction between neighbors
          const prev     = layoutDataRef.current.pathTiles[Math.max(0, i - 1)]
          const next     = layoutDataRef.current.pathTiles[Math.min(layoutDataRef.current.pathTiles.length - 1, i + 1)]
          const dx       = next.col - prev.col
          const dy       = next.row - prev.row
          const len      = Math.sqrt(dx * dx + dy * dy) || 1
          const px       = (-dy / len) * offset
          const py       = (dx  / len) * offset

          const x = tile.col * TILE_SIZE + TILE_SIZE / 2 + px
          const y = tile.row * TILE_SIZE + TILE_SIZE / 2 + py

          if (!started) { ctx.moveTo(x, y); started = true }
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.restore()
      })
      ctx.setLineDash([])

      // Small legend dots at the entrance for each hero type
      previewTypes.forEach((heroTypeId, idx) => {
        const color  = HERO_PATH_COLORS[heroTypeId] ?? '#ffffff'
        const ex     = layoutDataRef.current.entrance.col * TILE_SIZE + TILE_SIZE / 2
        const ey     = layoutDataRef.current.entrance.row * TILE_SIZE - 6 - idx * 7
        ctx.fillStyle = color
        ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill()
      })
    }

    // ── 2e. Tower ready-to-fire glow ring ────────────────────────────────────
    // Towers that have fully recharged their cooldown (timer ≥ attackSpeed)
    // show a faint pulsing amber ring — "loaded and waiting."
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileId  = currentGrid[row][col]
        const toolDef = DUNGEON_TOOLS.find(td => td.id === tileId && td.range)
        if (!toolDef) continue
        const key   = `tower_${col},${row}`
        const timer = currentTimers[key] ?? toolDef.attackSpeed
        if (timer >= toolDef.attackSpeed) {
          const pulse = 0.25 + 0.15 * Math.sin(t * 0.008 + col + row)
          const cx = col * TILE_SIZE + TILE_SIZE / 2
          const cy = row * TILE_SIZE + TILE_SIZE / 2
          ctx.strokeStyle = `rgba(255,210,60,${pulse})`
          ctx.lineWidth   = 1.5
          ctx.beginPath()
          ctx.arc(cx, cy, TILE_SIZE * 0.44, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    // ── 2d. Hero entry effect — entrance gate pulse ───────────────────────────
    const entranceElapsed = t - heroEntryRef.current
    if (entranceElapsed < 500 && heroEntryRef.current > 0) {
      const alpha = Math.max(0, 1 - entranceElapsed / 500)
      const ex = layoutDataRef.current.entrance.col * TILE_SIZE
      const ey = layoutDataRef.current.entrance.row * TILE_SIZE
      ctx.save()
      ctx.globalAlpha = alpha * 0.7
      ctx.fillStyle   = '#c8a0ff'
      ctx.fillRect(ex, ey, TILE_SIZE, TILE_SIZE)
      ctx.restore()
    }

    // ── 3. Range preview ────────────────────────────────────────────────────
    if (
      (phase === PHASE.PLAN || phase === PHASE.WAVE) &&
      selectedToolDef?.placesOn === 'open' &&
      selectedToolDef?.range &&
      hoveredTile.current
    ) {
      const { col: hc, row: hr } = hoveredTile.current
      const range = selectedToolDef.range
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const dist = Math.sqrt((c - hc) ** 2 + (r - hr) ** 2)
          if (dist > 0 && dist <= range) {
            ctx.fillStyle = 'rgba(232,196,74,0.13)'
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          }
        }
      }
      ctx.strokeStyle = 'rgba(232,196,74,0.5)'
      ctx.lineWidth   = 1
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.arc(
        hc * TILE_SIZE + TILE_SIZE / 2,
        hr * TILE_SIZE + TILE_SIZE / 2,
        range * TILE_SIZE,
        0, Math.PI * 2
      )
      ctx.stroke()
      ctx.setLineDash([])
    }

    // ── 4. Hover highlight ───────────────────────────────────────────────────
    if (hoveredTile.current && (phase === PHASE.PLAN || phase === PHASE.WAVE)) {
      const { col, row } = hoveredTile.current
      const x = col * TILE_SIZE
      const y = row * TILE_SIZE
      ctx.fillStyle   = selectedTool ? 'rgba(232,196,74,0.18)' : 'rgba(200,200,200,0.07)'
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      ctx.strokeStyle = selectedTool ? 'rgba(232,196,74,0.75)' : 'rgba(200,200,200,0.3)'
      ctx.lineWidth   = 1.5
      ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2)
    }

    // ── 5. Attack animations ─────────────────────────────────────────────────
    for (const flash of currentFlashes) {
      drawAttackEffect(ctx, flash, now)
    }

    // ── 6. Hero sprites ──────────────────────────────────────────────────────
    for (const hero of currentHeroes) {
      if (!hero.spawned) continue

      // ── Death animation ──────────────────────────────────────────────────
      if (hero.state === 'dead') {
        if (!hero.deathStartTime) continue
        const elapsed = t - hero.deathStartTime
        if (elapsed > 850) continue

        const progress = Math.min(1, elapsed / 850)
        // Fade starts at 15% of animation, fully gone by 100%
        const alpha    = Math.max(0, 1 - Math.max(0, progress - 0.15) / 0.85)
        const rotation = progress * Math.PI * 0.65
        const fallY    = progress * progress * 28

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(Math.round(hero.x), Math.round(hero.y + fallY))
        ctx.rotate(rotation)

        // White impact flash on first 80ms
        if (elapsed < 80) {
          const flashAlpha = (80 - elapsed) / 80 * 0.75
          ctx.save()
          ctx.globalAlpha = flashAlpha
          ctx.fillStyle   = '#ffffff'
          ctx.fillRect(-22, -34, 44, 52)
          ctx.restore()
        }

        const drawHero = HERO_SPRITES[hero.type]
        if (drawHero) drawHero(ctx, 0, 0, t, hero)
        ctx.restore()
        continue
      }

      // ── Living heroes ────────────────────────────────────────────────────
      const { x, y, hp, maxHp, baseMaxHp } = hero
      // Bosses fall back to their base hero sprite; regular heroes use their own type
      const spriteKey = hero.isBoss ? (hero.bossBaseType ?? hero.type) : hero.type
      const drawHero  = HERO_SPRITES[spriteKey]

      // ── Boss: pulsing aura ring (drawn BEHIND the sprite) ────────────────
      if (hero.isBoss) {
        const auraColor = hero.bossAuraColor ?? hero.color
        const auraAlpha = 0.25 + 0.18 * Math.sin(t * 0.004)
        const auraR     = 26 + 4 * Math.sin(t * 0.003)
        ctx.save()
        // Outer glow ring
        ctx.strokeStyle = auraColor
        ctx.lineWidth   = 3.5
        ctx.globalAlpha = auraAlpha
        ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI * 2); ctx.stroke()
        // Second thin ring slightly larger
        ctx.lineWidth   = 1.5
        ctx.globalAlpha = auraAlpha * 0.5
        ctx.beginPath(); ctx.arc(x, y, auraR + 6, 0, Math.PI * 2); ctx.stroke()
        // Enrage: fiery red inner fill when enraged
        if (hero.enraged) {
          ctx.fillStyle   = `rgba(255,50,10,${0.12 + 0.08 * Math.sin(t * 0.012)})`
          ctx.globalAlpha = 1
          ctx.beginPath(); ctx.arc(x, y, auraR, 0, Math.PI * 2); ctx.fill()
        }
        ctx.restore()
      }

      ctx.save()
      if (hero.state === 'escaped') ctx.globalAlpha = 0.3

      // Bat drain desaturation — gray overlay proportional to maxHp drained
      if (baseMaxHp && hero.maxHp < baseMaxHp * 0.88) {
        // draw hero first, then overlay desaturation
        if (drawHero) drawHero(ctx, x, y, t, hero)
        const drainRatio = 1 - hero.maxHp / baseMaxHp
        ctx.fillStyle = `rgba(80,80,90,${drainRatio * 0.45})`
        ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill()
      } else {
        if (drawHero) {
          drawHero(ctx, x, y, t, hero)
        } else {
          ctx.fillStyle = hero.color
          ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill()
        }
      }

      ctx.restore()

      // ── Status rings (drawn outside save/restore so they layer correctly) ──

      // Ice slow — crystalline dashed ring
      if (hero.slowed) {
        const iceAlpha = 0.35 + 0.18 * Math.sin(t * 0.015)
        ctx.strokeStyle = `rgba(100,200,255,${iceAlpha})`
        ctx.lineWidth   = 2
        ctx.setLineDash([3, 2])
        ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.stroke()
        ctx.setLineDash([])
      }

      // Curse stacks — rotating hexagonal rune above head
      if (hero.curseStacks > 0) {
        const runeAngle = t * 0.0025 * (0.8 + hero.curseStacks * 0.4)
        const runeR     = 5 + hero.curseStacks * 1.5
        const runeAlpha = 0.65 + 0.2 * Math.sin(t * 0.006)
        ctx.save()
        ctx.translate(Math.round(x), Math.round(y - 30))
        ctx.rotate(runeAngle)
        ctx.strokeStyle = `rgba(160,20,240,${runeAlpha})`
        ctx.lineWidth   = 1.5
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          i === 0
            ? ctx.moveTo(runeR * Math.cos(a), runeR * Math.sin(a))
            : ctx.lineTo(runeR * Math.cos(a), runeR * Math.sin(a))
        }
        ctx.closePath()
        ctx.stroke()
        // Inner dot
        ctx.fillStyle = `rgba(200,80,255,${runeAlpha * 0.6})`
        ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }

      // Mimic distraction — spinning golden ring (hero is stopped, investigating)
      if ((hero.distractedTimer ?? 0) > 0) {
        const dPct  = hero.distractedTimer / 1500
        const angle = t * 0.012
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angle)
        ctx.strokeStyle = `rgba(240,190,40,${0.5 + dPct * 0.5})`
        ctx.lineWidth   = 2.5
        ctx.setLineDash([5, 4])
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke()
        ctx.setLineDash([])
        // Small "?" label
        ctx.rotate(-angle)
        ctx.font         = 'bold 11px serif'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle    = `rgba(240,200,60,${dPct * 0.9})`
        ctx.fillText('?', 0, -28)
        ctx.restore()
      }

      // Stasis — blue crystalline overlay when frozen
      if ((hero.stasisTimer ?? 0) > 0) {
        const stasisAlpha = Math.min(0.7, hero.stasisTimer / 500)
        ctx.fillStyle = `rgba(80,160,240,${stasisAlpha * 0.55})`
        ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = `rgba(180,230,255,${stasisAlpha * 0.9})`
        ctx.lineWidth   = 2
        ctx.setLineDash([4, 2])
        ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.stroke()
        ctx.setLineDash([])
      }

      // HP bar — bosses get a wider, taller bar with gold border
      const barW  = hero.isBoss ? 46 : 30
      const barH  = hero.isBoss ? 6  : 4
      const barX  = x - barW / 2
      const barY  = y - (hero.isBoss ? 34 : 28)
      const ratio = Math.max(0, hp / maxHp)
      ctx.fillStyle = '#0e0c12'
      ctx.fillRect(barX, barY, barW, barH)
      ctx.fillStyle = ratio > 0.6 ? '#3d7a1a' : ratio > 0.3 ? '#c9a02a' : '#8b1a1a'
      ctx.fillRect(barX, barY, barW * ratio, barH)
      if (hero.isBoss) {
        ctx.strokeStyle = hero.bossAuraColor ?? 'rgba(232,196,74,0.6)'
        ctx.lineWidth   = 1
        ctx.strokeRect(barX, barY, barW, barH)
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth   = 0.5
        ctx.strokeRect(barX, barY, barW, barH)
      }

      // Boss: crown emoji above HP bar + enrage flame indicator
      if (hero.isBoss) {
        const crownAlpha = 0.8 + 0.2 * Math.sin(t * 0.005)
        ctx.save()
        ctx.globalAlpha = crownAlpha
        ctx.font         = '14px serif'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(hero.enraged ? '🔥' : '👑', x, barY - 2)
        ctx.restore()
      }

      // Gold-carrying indicator
      if (hero.hasGold) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 0.008 + hero.pathIndex)
        ctx.save()
        ctx.globalAlpha = pulse
        ctx.font        = '11px serif'
        ctx.textAlign   = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('💰', x, barY - 8)
        ctx.restore()
      }
    }

    // ── 7. Treasure damage flash ──────────────────────────────────────────────
    const flash = treasureFlashRef.current
    if (flash.active) {
      const elapsed = t - flash.startTime
      if (elapsed > 500) {
        flash.active = false
      } else {
        const alpha = Math.max(0, 1 - elapsed / 500) * 0.55
        const tx    = layoutDataRef.current.treasure.col * TILE_SIZE
        const ty    = layoutDataRef.current.treasure.row * TILE_SIZE
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle   = '#ff2020'
        ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE)
        ctx.restore()
      }
    }

    // ── 8. Particles (and floating numbers) ──────────────────────────────────
    // Update uses the frame delta; approximate it from a fixed 16ms since we
    // don't track lastTime here (draw loop is display-locked, good enough).
    const frameDelta = 16
    ps.update(frameDelta)
    ps.draw(ctx)

    // ── 9. Boss entrance fanfare — full-canvas color flash ────────────────────
    const fanfareEnd   = bossFanfareEndRef.current
    const fanfareColor = bossFanfareColorRef.current
    if (fanfareEnd && t < fanfareEnd && fanfareColor) {
      const fanfareProgress = 1 - (fanfareEnd - t) / 1200
      // Pulse: rises quickly then fades — peak alpha at ~30% of duration
      const fanfareAlpha = fanfareProgress < 0.3
        ? fanfareProgress / 0.3 * 0.45
        : (1 - (fanfareProgress - 0.3) / 0.7) * 0.45
      ctx.save()
      ctx.globalAlpha = Math.max(0, fanfareAlpha)
      ctx.fillStyle   = fanfareColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.restore()
    }

    // ── End screen shake ──────────────────────────────────────────────────────
    if (shook) ctx.restore()

    animFrame.current = requestAnimationFrame(draw)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedTool, selectedToolDef, showPathPreview, showCoverageMap])

  useEffect(() => {
    animFrame.current = requestAnimationFrame(draw)
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current) }
  }, [draw])

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const getTile = (e) => {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    return {
      col: Math.floor((e.clientX - rect.left) * (canvas.width  / rect.width)  / TILE_SIZE),
      row: Math.floor((e.clientY - rect.top)  * (canvas.height / rect.height) / TILE_SIZE),
    }
  }

  const inBounds = ({ col, row }) =>
    col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS

  const handleMouseMove   = (e) => { const p = getTile(e); hoveredTile.current = inBounds(p) ? p : null }
  const handleMouseLeave  = ()  => { hoveredTile.current = null }
  const canEdit = phase === PHASE.PLAN || phase === PHASE.WAVE
  const handleClick       = (e) => { if (!canEdit) return; const p = getTile(e); if (inBounds(p)) onTileClick(p.col, p.row) }
  const handleContextMenu = (e) => {
    e.preventDefault()
    if (!canEdit) return
    const p = getTile(e)
    if (inBounds(p)) onTileRightClick(p.col, p.row)
  }

  return (
    <canvas
      ref={canvasRef}
      width={GRID_COLS * TILE_SIZE}
      height={GRID_ROWS * TILE_SIZE}
      style={{
        display: 'block',
        width:  '100%',
        height: '100%',
        cursor: canEdit ? (selectedTool ? 'crosshair' : 'default') : 'default',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    />
  )
}

// ── Internal helper — draw a single tile's background ────────────────────────
function _drawTileBase(ctx, x, y, tileId, colors, t) {
  ctx.fillStyle = colors.bg
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  // Pulsing glow for entrance and treasure
  if (colors.glow) {
    const pulse = 0.7 + 0.3 * Math.sin(t / 600 + x * 0.007 + y * 0.003)
    ctx.save()
    ctx.globalAlpha = pulse * 0.4
    ctx.fillStyle   = colors.glow
    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
    ctx.restore()
  }

  // Subtle centre-strip shading on path tiles
  if (tileId === TILE.PATH || tileId === TILE.SPIKE ||
      tileId === TILE.BOULDER || tileId === TILE.DOOR) {
    ctx.fillStyle = 'rgba(255,220,160,0.05)'
    ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8)
  }

  // Border
  ctx.strokeStyle = colors.border
  ctx.lineWidth   = 0.5
  ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)

  // Entrance / treasure emoji labels
  if (colors.label) {
    ctx.font         = `bold ${TILE_SIZE * 0.5}px serif`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle    = tileId === TILE.TREASURE ? '#e8c44a' : '#c8b8e8'
    ctx.fillText(colors.label, x + TILE_SIZE / 2, y + TILE_SIZE / 2)
  }
}
