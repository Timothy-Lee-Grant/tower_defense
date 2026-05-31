import React, { useRef, useEffect, useCallback } from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { TILE, TILE_SIZE, GRID_COLS, GRID_ROWS, DUNGEON_TOOLS } from '../game/constants.js'

// ── Color map for each tile type ──
const TILE_COLORS = {
  [TILE.EMPTY]:    { bg: '#16121a', border: '#1e1828' },
  [TILE.WALL]:     { bg: '#2a2035', border: '#3a2f47', label: '▪' },
  [TILE.ENTRANCE]: { bg: '#0a2a0a', border: '#1a5a1a', label: '⚑', glow: '#1a8a1a' },
  [TILE.TREASURE]: { bg: '#2a1a00', border: '#8b6a00', label: '★', glow: '#c9a02a' },
  [TILE.SPIKE]:    { bg: '#1e1e28', border: '#6a6a8a', label: '⋀' },
  [TILE.DART]:     { bg: '#2a1a0a', border: '#8a5a2a', label: '→' },
  [TILE.BOULDER]:  { bg: '#1a1a14', border: '#5a5a48', label: '●' },
  [TILE.FIRE]:     { bg: '#2a1000', border: '#8b3000', label: '🔥', glow: '#c4430a' },
  [TILE.POISON]:   { bg: '#0a1a08', border: '#2a6a18', label: '☠', glow: '#3d7a1a' },
  [TILE.SKELETON]: { bg: '#1e1c1a', border: '#8a7a60', label: '💀' },
  [TILE.SLIME]:    { bg: '#0a180a', border: '#2a5a1a', label: '●', glow: '#3d7a1a' },
  [TILE.WRAITH]:   { bg: '#14101e', border: '#5a4a8a', label: '👻', glow: '#6a4a8a' },
  [TILE.DOOR]:     { bg: '#1e1408', border: '#6a4a2a', label: '▬' },
  [TILE.LEVER]:    { bg: '#1e1c0a', border: '#7a6a2a', label: '⚙' },
}

// ── Path preview colors ──
const PATH_COLORS = {
  knight: 'rgba(200, 160, 72, 0.6)',
  mage:   'rgba(122, 90, 191, 0.6)',
  thief:  'rgba(74, 122, 58, 0.6)',
}

export default function DungeonGrid({ onTileClick, onTileRightClick }) {
  const canvasRef = useRef(null)
  const phase      = useGameStore(s => s.phase)
  const grid       = useGameStore(s => s.grid)
  const heroes     = useGameStore(s => s.heroes)
  const selectedTool = useGameStore(s => s.selectedTool)
  const showPathPreview = useGameStore(s => s.showPathPreview)
  const previewedPaths  = useGameStore(s => s.previewedPaths)

  const hoveredTile = useRef(null)
  const animFrame   = useRef(null)
  const timeRef     = useRef(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const t = performance.now()
    timeRef.current = t

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ── Draw tiles ──
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileId = grid[row][col]
        const colors = TILE_COLORS[tileId] ?? TILE_COLORS[TILE.EMPTY]
        const x = col * TILE_SIZE
        const y = row * TILE_SIZE

        // Background fill
        ctx.fillStyle = colors.bg
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)

        // Glow effect for special tiles
        if (colors.glow) {
          const pulse = 0.7 + 0.3 * Math.sin(t / 600 + col * 0.7 + row * 0.3)
          ctx.save()
          ctx.globalAlpha = pulse * 0.4
          ctx.fillStyle = colors.glow
          ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4)
          ctx.restore()
        }

        // Tile border
        ctx.strokeStyle = colors.border
        ctx.lineWidth = 0.5
        ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)

        // Tile label / icon
        if (colors.label && tileId !== TILE.EMPTY) {
          ctx.font = tileId === TILE.TREASURE || tileId === TILE.ENTRANCE
            ? `bold ${TILE_SIZE * 0.5}px serif`
            : `${TILE_SIZE * 0.45}px serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = tileId === TILE.TREASURE ? '#e8c44a'
            : tileId === TILE.ENTRANCE ? '#1a8a1a' : colors.border
          ctx.fillText(colors.label, x + TILE_SIZE / 2, y + TILE_SIZE / 2)
        }

        // Hover highlight
        if (
          hoveredTile.current &&
          hoveredTile.current.col === col &&
          hoveredTile.current.row === row &&
          phase === PHASE.PLAN
        ) {
          ctx.fillStyle = selectedTool ? 'rgba(232,196,74,0.15)' : 'rgba(200,200,200,0.08)'
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
          ctx.strokeStyle = selectedTool ? 'rgba(232,196,74,0.6)' : 'rgba(200,200,200,0.3)'
          ctx.lineWidth = 1.5
          ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2)
        }
      }
    }

    // ── Draw path previews ──
    if (showPathPreview && previewedPaths) {
      Object.entries(previewedPaths).forEach(([heroId, path]) => {
        if (!path || path.length < 2) return
        ctx.save()
        ctx.strokeStyle = PATH_COLORS[heroId] ?? 'rgba(200,200,200,0.4)'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        path.forEach((pt, i) => {
          const px = pt.col * TILE_SIZE + TILE_SIZE / 2
          const py = pt.row * TILE_SIZE + TILE_SIZE / 2
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.stroke()
        ctx.restore()
      })
    }

    // ── Draw heroes ──
    for (const hero of heroes) {
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

      // Hero circle
      ctx.save()
      if (hero.state === 'escaped') {
        ctx.globalAlpha = 0.4
      }
      ctx.fillStyle = color
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Emoji label
      ctx.font = '14px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(emoji, x, y)
      ctx.restore()

      // HP bar
      const barW = 28
      const barH = 4
      const barX = x - barW / 2
      const barY = y - 22
      const hpRatio = Math.max(0, hp / maxHp)

      ctx.fillStyle = '#1a1218'
      ctx.fillRect(barX, barY, barW, barH)
      ctx.fillStyle = hpRatio > 0.6 ? '#3d7a1a' : hpRatio > 0.3 ? '#c9a02a' : '#8b1a1a'
      ctx.fillRect(barX, barY, barW * hpRatio, barH)
    }

    animFrame.current = requestAnimationFrame(draw)
  }, [grid, heroes, phase, selectedTool, showPathPreview, previewedPaths])

  useEffect(() => {
    animFrame.current = requestAnimationFrame(draw)
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current)
    }
  }, [draw])

  // ── Mouse handlers ──
  const getTileFromEvent = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const px = (e.clientX - rect.left) * scaleX
    const py = (e.clientY - rect.top) * scaleY
    return {
      col: Math.floor(px / TILE_SIZE),
      row: Math.floor(py / TILE_SIZE),
    }
  }

  const handleMouseMove = (e) => {
    const { col, row } = getTileFromEvent(e)
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      hoveredTile.current = { col, row }
    } else {
      hoveredTile.current = null
    }
  }

  const handleMouseLeave = () => {
    hoveredTile.current = null
  }

  const handleClick = (e) => {
    if (phase !== PHASE.PLAN) return
    const { col, row } = getTileFromEvent(e)
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      onTileClick(col, row)
    }
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    if (phase !== PHASE.PLAN) return
    const { col, row } = getTileFromEvent(e)
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      onTileRightClick(col, row)
    }
  }

  const canvasW = GRID_COLS * TILE_SIZE
  const canvasH = GRID_ROWS * TILE_SIZE

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
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
