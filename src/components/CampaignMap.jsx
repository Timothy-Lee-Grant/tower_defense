import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import {
  CAMPAIGN_NODES, CAMPAIGN_MODIFIERS,
  DUNGEON_LAYOUTS, buildLayoutData,
  TILE, GRID_COLS, GRID_ROWS,
} from '../game/constants.js'
import { readCampaignProgress, readEndlessHigh } from '../game/persistence.js'
import { audio } from '../audio/audioEngine.js'

// ── Mini-grid preview ──────────────────────────────────────────────────────
// Renders a tiny canvas image of the dungeon layout path.
function MiniGrid({ layoutId }) {
  const layout     = DUNGEON_LAYOUTS.find(l => l.id === layoutId) ?? DUNGEON_LAYOUTS[0]
  const layoutData = buildLayoutData(layout)

  const W = 120, H = 78
  const tW = W / GRID_COLS
  const tH = H / GRID_ROWS

  const pathSet    = layoutData.pathCenterSet
  const extraSet   = new Set(layoutData.pathExtra.map(p => `${p.col},${p.row}`))
  const { entrance, treasure } = layoutData

  const cells = []
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const key = `${c},${r}`
      const isEntrance = c === entrance.col && r === entrance.row
      const isTreasure = c === treasure.col && r === treasure.row
      const isPath     = pathSet.has(key)
      const isExtra    = extraSet.has(key)

      let bg = '#0d0b10'
      if (isExtra) bg = '#1c1710'
      if (isPath)  bg = '#2e2416'
      if (isEntrance) bg = '#1a103a'
      if (isTreasure) bg = '#3a2800'

      cells.push(
        <div
          key={key}
          style={{
            position: 'absolute',
            left: c * tW, top: r * tH,
            width: tW, height: tH,
            background: bg,
            boxSizing: 'border-box',
          }}
        />
      )
    }
  }

  // Overlay entrance / treasure emoji
  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', borderRadius: 4 }}>
      {cells}
      <div style={{
        position: 'absolute',
        left: entrance.col * tW, top: entrance.row * tH,
        width: tW * 2, height: tH,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, lineHeight: 1, pointerEvents: 'none',
      }}>🚪</div>
      <div style={{
        position: 'absolute',
        left: treasure.col * tW - tW * 0.5, top: treasure.row * tH,
        width: tW * 2, height: tH,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, lineHeight: 1, pointerEvents: 'none',
      }}>💰</div>
    </div>
  )
}

// ── Star display ───────────────────────────────────────────────────────────
function Stars({ earned, total = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 2, fontSize: 13 }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ color: i < earned ? '#ffcc00' : '#3a3428', textShadow: i < earned ? '0 0 6px rgba(255,200,0,0.5)' : 'none' }}>★</span>
      ))}
    </div>
  )
}

// ── Single campaign node card ──────────────────────────────────────────────
function NodeCard({ node, stars, unlocked, selected, onSelect, onPlay }) {
  const mod      = CAMPAIGN_MODIFIERS[node.modifier] ?? CAMPAIGN_MODIFIERS.none
  const hasStars = stars > 0

  return (
    <div
      onClick={() => unlocked && onSelect(node.id)}
      style={{
        ...cardStyles.card,
        opacity:          unlocked ? 1 : 0.4,
        cursor:           unlocked ? 'pointer' : 'not-allowed',
        border:           selected
          ? '1px solid rgba(200,160,72,0.8)'
          : hasStars
            ? '1px solid rgba(200,160,72,0.25)'
            : '1px solid rgba(255,255,255,0.08)',
        background:       selected ? 'rgba(32,24,12,0.95)' : 'rgba(14,10,20,0.85)',
        boxShadow:        selected ? '0 0 16px rgba(200,160,72,0.15)' : 'none',
        transform:        selected ? 'scale(1.02)' : 'scale(1)',
        transition:       'all 0.15s ease',
      }}
    >
      {/* Status badge */}
      <div style={cardStyles.statusRow}>
        <span style={{ fontSize: 20 }}>{node.emoji ?? '🏰'}</span>
        {hasStars && <Stars earned={stars} />}
        {!unlocked && <span style={{ fontSize: 11, color: '#664', marginLeft: 'auto' }}>🔒 Locked</span>}
        {unlocked && !hasStars && <span style={{ fontSize: 11, color: '#666', marginLeft: 'auto' }}>Not played</span>}
      </div>

      {/* Layout preview */}
      <MiniGrid layoutId={node.layoutId} />

      {/* Node info */}
      <div style={cardStyles.name}>{node.name}</div>
      <div style={cardStyles.subtitle}>{node.subtitle}</div>

      {/* Modifier chip */}
      {node.modifier !== 'none' && (
        <div style={cardStyles.modChip}>
          <span>{mod.emoji}</span>
          <span style={{ color: 'var(--color-medium)', fontWeight: 600 }}>{mod.label}</span>
          <span style={{ color: '#888' }}> — {mod.desc}</span>
        </div>
      )}

      {/* Play button — only on selected card */}
      {selected && unlocked && (
        <button style={cardStyles.playBtn} onClick={e => { e.stopPropagation(); onPlay(node.id) }}>
          ▶ Play This Dungeon
        </button>
      )}
    </div>
  )
}

// ── Campaign Map screen ────────────────────────────────────────────────────
export default function CampaignMap() {
  const startCampaignNode = useGameStore(s => s.startCampaignNode)
  const setDifficulty     = useGameStore(s => s.setDifficulty)
  const goToMenu          = useGameStore(s => s.goToMenu)
  const difficulty        = useGameStore(s => s.difficulty)

  const [selected, setSelected] = useState(null)

  const progress   = readCampaignProgress()
  const endlessHi  = readEndlessHigh()

  // Which nodes are unlocked? A node is unlocked if all required nodes have been completed.
  const completed  = new Set(Object.keys(progress).filter(id => (progress[id] ?? 0) >= 1))
  const isUnlocked = (node) => node.requires.every(req => completed.has(req))

  const handlePlay = (nodeId) => {
    audio.init()
    audio.play('btn_click')
    startCampaignNode(nodeId)
  }

  const handleSelect = (nodeId) => {
    audio.play('btn_click')
    setSelected(prev => prev === nodeId ? null : nodeId)
  }

  // Node layout — two rows with connection lines
  // Row 0: catacombs (centre)
  // Row 1: gauntlet (left), labyrinth (right)
  // Row 2: throneroom (left), bottleneck (right)
  // Row 3: finale (centre)
  const nodeLayout = [
    [null, 'node_catacombs', null],
    ['node_gauntlet', null, 'node_labyrinth'],
    ['node_throneroom', null, 'node_bottleneck'],
    [null, 'node_finale', null],
  ]

  const nodeById = Object.fromEntries(CAMPAIGN_NODES.map(n => [n.id, n]))

  return (
    <div style={s.root}>
      <div style={s.panel}>

        {/* Header */}
        <div style={s.header}>
          <button style={s.backBtn} onClick={goToMenu}>← Back</button>
          <div style={s.titleBlock}>
            <h1 style={s.title}>⚔ Campaign Map</h1>
            <p style={s.sub}>Complete dungeons to unlock new challenges. Stars persist between runs.</p>
          </div>
          {/* Difficulty selector */}
          <div style={s.diffRow}>
            {['easy', 'medium', 'hard'].map(d => (
              <button
                key={d}
                style={{ ...s.diffBtn, ...(difficulty === d ? s.diffBtnActive : {}) }}
                onClick={() => setDifficulty(d)}
              >
                {d === 'easy' ? '🌿' : d === 'medium' ? '⚔️' : '💀'} {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Campaign tree grid */}
        <div style={s.tree}>
          {nodeLayout.map((row, ri) => (
            <div key={ri} style={s.treeRow}>
              {row.map((nodeId, ci) => {
                if (!nodeId) return <div key={ci} style={s.treeSlot} />
                const node     = nodeById[nodeId]
                if (!node) return <div key={ci} style={s.treeSlot} />
                const stars    = progress[nodeId] ?? 0
                const unlocked = isUnlocked(node)
                return (
                  <div key={ci} style={s.treeSlot}>
                    <NodeCard
                      node={node}
                      stars={stars}
                      unlocked={unlocked}
                      selected={selected === nodeId}
                      onSelect={handleSelect}
                      onPlay={handlePlay}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Endless mode banner */}
        <div style={s.endlessBanner}>
          <div style={s.endlessLeft}>
            <span style={{ fontSize: 22 }}>∞</span>
            <div>
              <div style={s.endlessTitle}>Endless Mode</div>
              <div style={s.endlessSub}>Complete the final wave to unlock. Waves scale forever.</div>
            </div>
          </div>
          <div style={s.endlessRight}>
            {endlessHi > 0 && (
              <div style={s.endlessHi}>Best: Wave {endlessHi}</div>
            )}
            <div style={s.endlessNote}>
              {completed.has('node_finale')
                ? 'Start any dungeon and survive all waves to enter Endless Mode.'
                : 'Unlock by completing The Grand Finale.'}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
const cardStyles = {
  card: {
    width: 164,
    padding: '10px 10px 8px',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    userSelect: 'none',
  },
  statusRow: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  name: {
    fontFamily: 'var(--font-serif)',
    fontSize: 12, fontWeight: 700,
    color: '#d8c898', lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 11, color: '#7a6a58', lineHeight: 1.3,
  },
  modChip: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'rgba(200,160,72,0.08)',
    border: '1px solid rgba(200,160,72,0.15)',
    borderRadius: 4, padding: '3px 6px',
    fontSize: 11, lineHeight: 1.3,
    flexWrap: 'wrap',
  },
  playBtn: {
    marginTop: 4,
    padding: '6px 0',
    background: 'rgba(200,160,72,0.18)',
    border: '1px solid rgba(200,160,72,0.5)',
    borderRadius: 5,
    color: 'var(--color-medium)', fontFamily: 'var(--font-serif)',
    fontSize: 12, fontWeight: 700,
    cursor: 'pointer', width: '100%',
  },
}

const s = {
  root: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 20%, #16101e 0%, #0a080d 70%)',
    overflowY: 'auto', padding: '1.5rem 1rem',
    boxSizing: 'border-box',
  },
  panel: {
    width: '100%', maxWidth: 700,
    display: 'flex', flexDirection: 'column', gap: '1.2rem',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', gap: '0.8rem',
  },
  backBtn: {
    background: 'none', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 5, color: '#888', padding: '6px 12px',
    cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
    fontFamily: 'var(--font-serif)',
    flexShrink: 0,
  },
  titleBlock: { flex: 1 },
  title: {
    fontFamily: 'var(--font-serif)',
    fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
    fontWeight: 700, color: 'var(--color-medium)', margin: '0 0 0.2rem',
  },
  sub: {
    fontSize: 12, color: '#665a48', margin: 0,
  },
  diffRow: {
    display: 'flex', gap: 4, flexShrink: 0,
  },
  diffBtn: {
    padding: '4px 10px', fontSize: 11,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5, color: '#888', cursor: 'pointer',
    fontFamily: 'var(--font-serif)',
  },
  diffBtnActive: {
    background: 'rgba(200,160,72,0.12)',
    border: '1px solid rgba(200,160,72,0.4)',
    color: 'var(--color-medium)',
  },
  tree: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  treeRow: {
    display: 'flex', gap: 12, justifyContent: 'center',
  },
  treeSlot: {
    width: 164, flexShrink: 0,
  },
  endlessBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '12px 16px',
  },
  endlessLeft: {
    display: 'flex', alignItems: 'center', gap: 10,
    color: '#6688aa',
  },
  endlessTitle: {
    fontFamily: 'var(--font-serif)', fontSize: 13,
    fontWeight: 700, color: '#8ab0cc',
  },
  endlessSub: {
    fontSize: 11, color: '#446688', marginTop: 2,
  },
  endlessRight: {
    textAlign: 'right',
  },
  endlessHi: {
    fontFamily: 'var(--font-serif)',
    fontSize: 15, fontWeight: 700, color: '#8ab0cc',
  },
  endlessNote: {
    fontSize: 11, color: '#446688', marginTop: 2,
  },
}
