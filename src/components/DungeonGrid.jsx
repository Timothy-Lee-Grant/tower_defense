import React, { useRef, useEffect, useCallback } from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { TILE, TILE_SIZE, GRID_COLS, GRID_ROWS, DUNGEON_TOOLS } from '../game/constants.js'
import { HERO_SPRITES, TILE_SPRITES, ATTACK_DURATIONS, drawAttackEffect, wraithRushPos } from '../game/sprites.js'

// ── Tile base colors (bg fill + border drawn under every tile) ──
// Sprite tiles get subtle floor-colored bases; the sprite draws its own art on top.
const TILE_COLORS = {
  [TILE.EMPTY]:    { bg: '#16121a', border: '#1e1828' },
  [TILE.PATH]:     { bg: '#2a2218', border: '#3d3020' },
  [TILE.ENTRANCE]: { bg: '#0c0a10', border: '#4a3a60', label: '🚪', glow: '#2d1f40' },
  [TILE.TREASURE]: { bg: '#1a1000', border: '#c9a02a', label: '💰', glow: '#c9a02a' },
  // On-path trap bases (path-coloured floor under the sprite)
  [TILE.SPIKE]:    { bg: '#221c12', border: '#38301e' },
  [TILE.BOULDER]:  { bg: '#1e1a12', border: '#32281a' },
  [TILE.DOOR]:     { bg: '#1a1208', border: '#2e2010' },
  // Off-path tower bases (empty-floor under the sprite)
  [TILE.DART]:     { bg: '#18121e', border: '#241a2e' },
  [TILE.FIRE]:     { bg: '#1a0e06', border: '#281606' },
  [TILE.POISON]:   { bg: '#0e1608', border: '#181e0a' },
  [TILE.SKELETON]: { bg: '#16121a', border: '#221820' },
  [TILE.SLIME]:    { bg: '#0c1408', border: '#161e0c' },
  [TILE.WRAITH]:   { bg: '#100c18', border: '#1c1428' },
  [TILE.LAVA]:     { bg: '#200400', border: '#3a0800' },
  [TILE.ICE]:      { bg: '#08101e', border: '#10182e' },
}

export default function DungeonGrid({ onTileClick, onTileRightClick }) {
  const canvasRef = useRef(null)

  const phase         = useGameStore(s => s.phase)
  const grid          = useGameStore(s => s.grid)
  const heroes        = useGameStore(s => s.heroes)
  const selectedTool  = useGameStore(s => s.selectedTool)
  const attackFlashes = useGameStore(s => s.attackFlashes)

  const hoveredTile      = useRef(null)
  const animFrame        = useRef(null)

  // Refs for rapidly-changing wave state — avoids restarting the draw loop
  const heroesRef        = useRef(heroes)
  const gridRef          = useRef(grid)
  const attackFlashesRef = useRef(attackFlashes)
  heroesRef.current        = heroes
  gridRef.current          = grid
  attackFlashesRef.current = attackFlashes

  const selectedToolDef = selectedTool
    ? DUNGEON_TOOLS.find(t => t.id === selectedTool)
    : null

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const t   = performance.now()
    const now = t   // alias used by attack animation helpers

    const currentGrid    = gridRef.current
    const currentHeroes  = heroesRef.current
    const currentFlashes = attackFlashesRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ── 1. Tile bases (bg + border) ──────────────────────────────────────────
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileId = currentGrid[row][col]
        const colors = TILE_COLORS[tileId] ?? TILE_COLORS[TILE.EMPTY]
        const x = col * TILE_SIZE
        const y = row * TILE_SIZE

        ctx.fillStyle = colors.bg
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)

        // Pulsing glow for entrance and treasure
        if (colors.glow) {
          const pulse = 0.7 + 0.3 * Math.sin(t / 600 + col * 0.7 + row * 0.3)
          ctx.save()
          ctx.globalAlpha = pulse * 0.4
          ctx.fillStyle = colors.glow
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
        ctx.lineWidth = 0.5
        ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)

        // Entrance / treasure emoji labels (no sprite for these two)
        if (colors.label) {
          ctx.font = `bold ${TILE_SIZE * 0.5}px serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = tileId === TILE.TREASURE ? '#e8c44a' : '#c8b8e8'
          ctx.fillText(colors.label, x + TILE_SIZE / 2, y + TILE_SIZE / 2)
        }
      }
    }

    // ── 2. Tile sprites (traps / towers / monsters) ───────────────────────────
    // Wraith tiles are skipped here and drawn separately (they roam outside
    // their tile bounds and rush across the map during attacks).
    // Wraith rush positions are computed from active attack flashes.

    const wraithFlashes = currentFlashes.filter(f => f.towerType === 'wraith' && now - f.t < ATTACK_DURATIONS.wraith)
    const wraithRushMap = new Map()   // "tileCol,tileRow" → { x, y }
    for (const flash of wraithFlashes) {
      const pos = wraithRushPos(flash, now)
      if (pos) wraithRushMap.set(`${flash.tileCol},${flash.tileRow}`, pos)
    }

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileId = currentGrid[row][col]
        const drawFn = TILE_SPRITES[tileId]
        if (!drawFn) continue
        if (tileId === 'wraith') continue  // drawn in step 2b

        const x = col * TILE_SIZE
        const y = row * TILE_SIZE
        ctx.save()
        ctx.beginPath(); ctx.rect(x, y, TILE_SIZE, TILE_SIZE); ctx.clip()
        drawFn(ctx, x, y, t)
        ctx.restore()
      }
    }

    // ── 2b. Wraith sprites — drawn unclipped so they can roam + rush freely ──
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (currentGrid[row][col] !== 'wraith') continue
        const x      = col * TILE_SIZE
        const y      = row * TILE_SIZE
        const rushP  = wraithRushMap.get(`${col},${row}`) ?? null
        ctx.save()
        TILE_SPRITES.wraith(ctx, x, y, t, rushP)
        ctx.restore()
      }
    }

    // ── 3. Range preview (hover with a tower selected) ────────────────────────
    if (
      phase === PHASE.PLAN &&
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
      // Range ring outline around hovered tile
      ctx.strokeStyle = 'rgba(232,196,74,0.5)'
      ctx.lineWidth = 1
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

    // ── 4. Hover highlight ────────────────────────────────────────────────────
    if (hoveredTile.current && phase === PHASE.PLAN) {
      const { col, row } = hoveredTile.current
      const x = col * TILE_SIZE
      const y = row * TILE_SIZE
      ctx.fillStyle = selectedTool ? 'rgba(232,196,74,0.18)' : 'rgba(200,200,200,0.07)'
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      ctx.strokeStyle = selectedTool ? 'rgba(232,196,74,0.75)' : 'rgba(200,200,200,0.3)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2)
    }

    // ── 5. Attack animations (projectiles, sword arcs, etc.) ──────────────────
    for (const flash of currentFlashes) {
      drawAttackEffect(ctx, flash, now)
    }

    // ── 6. Hero sprites ───────────────────────────────────────────────────────
    for (const hero of currentHeroes) {
      if (!hero.spawned || hero.state === 'dead') continue

      const { x, y, hp, maxHp } = hero
      const drawHero = HERO_SPRITES[hero.type]

      ctx.save()
      if (hero.state === 'escaped') ctx.globalAlpha = 0.35

      // Ice slow — faint blue aura ring
      if (hero.slowed) {
        const iceAlpha = 0.3 + 0.2 * Math.sin(t * 0.015)
        ctx.strokeStyle = `rgba(100,180,255,${iceAlpha})`
        ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke()
      }

      if (drawHero) {
        drawHero(ctx, x, y, t, hero)
      } else {
        // Fallback circle if sprite missing
        ctx.fillStyle = hero.color
        ctx.beginPath()
        ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()

      // HP bar
      const barW  = 30, barH = 4
      const barX  = x - barW / 2
      const barY  = y - 28
      const ratio = Math.max(0, hp / maxHp)
      ctx.fillStyle = '#0e0c12'
      ctx.fillRect(barX, barY, barW, barH)
      ctx.fillStyle = ratio > 0.6 ? '#3d7a1a' : ratio > 0.3 ? '#c9a02a' : '#8b1a1a'
      ctx.fillRect(barX, barY, barW * ratio, barH)
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(barX, barY, barW, barH)

      // Gold-carrying indicator — pulsing coin above the HP bar
      if (hero.hasGold) {
        const pulse = 0.7 + 0.3 * Math.sin(t * 0.008 + hero.pathIndex)
        ctx.save()
        ctx.globalAlpha = pulse
        ctx.font = '11px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('💰', x, barY - 8)
        ctx.restore()
      }
    }

    animFrame.current = requestAnimationFrame(draw)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedTool, selectedToolDef])

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

  const handleMouseMove  = (e) => { const p = getTile(e); hoveredTile.current = inBounds(p) ? p : null }
  const handleMouseLeave = ()  => { hoveredTile.current = null }
  const handleClick      = (e) => { if (phase !== PHASE.PLAN) return; const p = getTile(e); if (inBounds(p)) onTileClick(p.col, p.row) }
  const handleContextMenu = (e) => {
    e.preventDefault()
    if (phase !== PHASE.PLAN) return
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
        width: '100%',
        height: '100%',
        cursor: phase === PHASE.PLAN ? (selectedTool ? 'crosshair' : 'default') : 'default',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    />
  )
}
