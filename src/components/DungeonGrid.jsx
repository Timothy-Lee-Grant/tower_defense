import React, { useRef, useEffect, useCallback } from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { TILE, TILE_SIZE, GRID_COLS, GRID_ROWS, DUNGEON_TOOLS } from '../game/constants.js'

// ── Tile color map ──
const TILE_COLORS = {
  [TILE.EMPTY]:    { bg: '#16121a', border: '#1e1828' },
  [TILE.PATH]:     { bg: '#2a2218', border: '#3d3020' },   // worn stone path
  [TILE.ENTRANCE]: { bg: '#0c0a10', border: '#4a3a60', label: '🚪', glow: '#2d1f40' },
  [TILE.TREASURE]: { bg: '#1a1000', border: '#c9a02a', label: '💰', glow: '#c9a02a' },
  // On-path traps
  [TILE.SPIKE]:    { bg: '#1e1e28', border: '#6a6a8a', label: '⋀' },
  [TILE.BOULDER]:  { bg: '#1a1a14', border: '#5a5a48', label: '●' },
  [TILE.DOOR]:     { bg: '#1e1408', border: '#6a4a2a', label: '▬' },
  // Off-path towers
  [TILE.DART]:     { bg: '#2a1a0a', border: '#8a5a2a', label: '🎯' },
  [TILE.FIRE]:     { bg: '#2a1000', border: '#8b3000', label: '🔥', glow: '#c4430a' },
  [TILE.POISON]:   { bg: '#0a1a08', border: '#2a6a18', label: '☠', glow: '#3d7a1a' },
  [TILE.SKELETON]: { bg: '#1e1c1a', border: '#8a7a60', label: '💀' },
  [TILE.SLIME]:    { bg: '#0a180a', border: '#2a5a1a', label: '🟢', glow: '#3d7a1a' },
  [TILE.WRAITH]:   { bg: '#14101e', border: '#5a4a8a', label: '👻', glow: '#6a4a8a' },
}

export default function DungeonGrid({ onTileClick, onTileRightClick }) {
  const canvasRef = useRef(null)

  const phase         = useGameStore(s => s.phase)
  const grid          = useGameStore(s => s.grid)
  const heroes        = useGameStore(s => s.heroes)
  const selectedTool  = useGameStore(s => s.selectedTool)
  const attackFlashes = useGameStore(s => s.attackFlashes)

  const hoveredTile = useRef(null)
  const animFrame   = useRef(null)
  const timeRef     = useRef(0)

  // Refs for rapidly-changing state so the draw loop never restarts mid-wave
  const heroesRef        = useRef(heroes)
  const gridRef          = useRef(grid)
  const attackFlashesRef = useRef(attackFlashes)
  heroesRef.current        = heroes
  gridRef.current          = grid
  attackFlashesRef.current = attackFlashes

  // Resolve range of currently selected tool (for hover preview)
  const selectedToolDef = selectedTool
    ? DUNGEON_TOOLS.find(t => t.id === selectedTool)
    : null

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const t = performance.now()
    timeRef.current = t

    const currentGrid    = gridRef.current
    const currentHeroes  = heroesRef.current
    const currentFlashes = attackFlashesRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ── Draw tiles ──
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileId = currentGrid[row][col]
        const colors = TILE_COLORS[tileId] ?? TILE_COLORS[TILE.EMPTY]
        const x = col * TILE_SIZE
        const y = row * TILE_SIZE

        ctx.fillStyle = colors.bg
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)

        // Glow for special tiles
        if (colors.glow) {
          const pulse = 0.7 + 0.3 * Math.sin(t / 600 + col * 0.7 + row * 0.3)
          ctx.save()
          ctx.globalAlpha = pulse * 0.4
          ctx.fillStyle = colors.glow
          ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
          ctx.restore()
        }

        // Path tile directional shading — slightly lighter center strip
        if (tileId === TILE.PATH || tileId === TILE.SPIKE || tileId === TILE.BOULDER || tileId === TILE.DOOR) {
          ctx.fillStyle = 'rgba(255,220,160,0.06)'
          ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12)
        }

        // Tile border
        ctx.strokeStyle = colors.border
        ctx.lineWidth = 0.5
        ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)

        // Tile label
        if (colors.label && tileId !== TILE.EMPTY && tileId !== TILE.PATH) {
          ctx.font = (tileId === TILE.TREASURE || tileId === TILE.ENTRANCE)
            ? `bold ${TILE_SIZE * 0.5}px serif`
            : `${TILE_SIZE * 0.45}px serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = tileId === TILE.TREASURE ? '#e8c44a'
            : tileId === TILE.ENTRANCE ? '#c8b8e8' : colors.border
          ctx.fillText(colors.label, x + TILE_SIZE / 2, y + TILE_SIZE / 2)
        }
      }
    }

    // ── Range preview ring when hovering with an off-path tower selected ──
    if (
      phase === PHASE.PLAN &&
      selectedToolDef?.placesOn === 'open' &&
      selectedToolDef?.range &&
      hoveredTile.current
    ) {
      const { col: hc, row: hr } = hoveredTile.current
      const range = selectedToolDef.range
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const dx = col - hc
          const dy = row - hr
          const tileDist = Math.sqrt(dx * dx + dy * dy)
          if (tileDist <= range && !(dx === 0 && dy === 0)) {
            ctx.fillStyle = 'rgba(232,196,74,0.12)'
            ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          }
        }
      }
    }

    // ── Hover highlight ──
    if (hoveredTile.current && phase === PHASE.PLAN) {
      const { col, row } = hoveredTile.current
      const x = col * TILE_SIZE
      const y = row * TILE_SIZE
      ctx.fillStyle = selectedTool ? 'rgba(232,196,74,0.18)' : 'rgba(200,200,200,0.08)'
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      ctx.strokeStyle = selectedTool ? 'rgba(232,196,74,0.7)' : 'rgba(200,200,200,0.3)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2)
    }

    // ── Attack lines ──
    if (currentFlashes.length > 0) {
      const now = performance.now()
      for (const flash of currentFlashes) {
        const age = now - flash.t
        const alpha = Math.max(0, 1 - age / 250)
        ctx.save()
        ctx.globalAlpha = alpha * 0.7
        ctx.strokeStyle = '#e8c44a'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(flash.fromX, flash.fromY)
        ctx.lineTo(flash.toX, flash.toY)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }
    }

    // ── Draw heroes ──
    for (const hero of currentHeroes) {
      if (!hero.spawned || hero.state === 'dead') continue
      const { x, y, hp, maxHp, color, emoji } = hero

      // Shadow
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.ellipse(x, y + 14, 10, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Circle
      ctx.save()
      if (hero.state === 'escaped') ctx.globalAlpha = 0.4
      ctx.fillStyle = color
      ctx.strokeStyle = hero.poisoned ? '#3d7a1a' : '#fff'
      ctx.lineWidth = hero.poisoned ? 2 : 1.5
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.font = '14px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, x, y)
      ctx.restore()

      // HP bar
      const barW = 28, barH = 4
      const barX = x - barW / 2
      const barY = y - 22
      const hpRatio = Math.max(0, hp / maxHp)
      ctx.fillStyle = '#1a1218'
      ctx.fillRect(barX, barY, barW, barH)
      ctx.fillStyle = hpRatio > 0.6 ? '#3d7a1a' : hpRatio > 0.3 ? '#c9a02a' : '#8b1a1a'
      ctx.fillRect(barX, barY, barW * hpRatio, barH)
    }

    animFrame.current = requestAnimationFrame(draw)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedTool, selectedToolDef])

  useEffect(() => {
    animFrame.current = requestAnimationFrame(draw)
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current) }
  }, [draw])

  // ── Mouse handlers ──
  const getTile = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      col: Math.floor((e.clientX - rect.left) * scaleX / TILE_SIZE),
      row: Math.floor((e.clientY - rect.top)  * scaleY / TILE_SIZE),
    }
  }

  const handleMouseMove = (e) => {
    const { col, row } = getTile(e)
    hoveredTile.current = (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS)
      ? { col, row }
      : null
  }

  const handleMouseLeave = () => { hoveredTile.current = null }

  const handleClick = (e) => {
    if (phase !== PHASE.PLAN) return
    const { col, row } = getTile(e)
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) onTileClick(col, row)
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    if (phase !== PHASE.PLAN) return
    const { col, row } = getTile(e)
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) onTileRightClick(col, row)
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
        imageRendering: 'pixelated',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    />
  )
}
