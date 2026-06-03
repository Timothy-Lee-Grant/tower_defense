import React from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { DUNGEON_TOOLS, TOOL_CATEGORY } from '../game/constants.js'

const CATEGORY_LABELS = {
  [TOOL_CATEGORY.TRAPS]:      '⚠ Traps',
  [TOOL_CATEGORY.MONSTERS]:   '💀 Monsters',
  [TOOL_CATEGORY.STRUCTURES]: '🧱 Structures',
}

export default function ToolPalette() {
  const phase          = useGameStore(s => s.phase)
  const selectedTool   = useGameStore(s => s.selectedTool)
  const selectedCat    = useGameStore(s => s.selectedCategory)
  const gold           = useGameStore(s => s.gold)
  const unlockedTools  = useGameStore(s => s.unlockedTools)
  const selectTool     = useGameStore(s => s.selectTool)
  const selectCategory = useGameStore(s => s.selectCategory)

  const isDisabled = phase !== PHASE.PLAN && phase !== PHASE.WAVE

  const tools = DUNGEON_TOOLS.filter(t => t.category === selectedCat)

  return (
    <div style={styles.root}>
      {/* Category tabs */}
      <div style={styles.tabs}>
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
          <button
            key={cat}
            onClick={() => !isDisabled && selectCategory(cat)}
            style={{
              ...styles.tab,
              ...(selectedCat === cat ? styles.tabActive : {}),
              opacity: isDisabled ? 0.5 : 1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tool list */}
      <div style={styles.toolList}>
        {tools.map(tool => {
          const isUnlocked = unlockedTools.includes(tool.id)
          const isSelected = selectedTool === tool.id
          const canAfford  = gold >= tool.cost
          const isActive   = isUnlocked && !isDisabled

          return (
            <button
              key={tool.id}
              onClick={() => isActive && selectTool(isSelected ? null : tool.id)}
              style={{
                ...styles.toolBtn,
                ...(isSelected ? styles.toolBtnSelected : {}),
                ...(!isUnlocked ? styles.toolBtnLocked : {}),
                ...(!canAfford && isUnlocked ? styles.toolBtnCantAfford : {}),
                cursor: isActive ? 'pointer' : 'not-allowed',
              }}
              title={!isUnlocked ? 'Locked — earn from upgrade cards' : tool.description}
            >
              <div style={styles.toolHeader}>
                <span style={styles.toolEmoji}>{tool.emoji}</span>
                <span style={styles.toolName}>{tool.label}</span>
                <span style={{
                  ...styles.toolCost,
                  color: !canAfford ? '#8b1a1a' : 'var(--gold-bright)',
                }}>
                  {tool.cost}g
                </span>
              </div>
              {isSelected && (
                <p style={styles.toolDesc}>{tool.description}</p>
              )}
              {!isUnlocked && (
                <div style={styles.lockedBadge}>🔒 Locked</div>
              )}
            </button>
          )
        })}
      </div>

      {/* Sell hint */}
      {phase === PHASE.PLAN && (
        <div style={styles.hint}>
          Right-click a tile to sell it (50% refund)
        </div>
      )}
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0d0b0e',
    borderLeft: '1px solid rgba(232,196,74,0.12)',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(232,196,74,0.12)',
  },
  tab: {
    flex: 1,
    padding: '0.6rem 0.25rem',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontFamily: "'Cinzel', serif",
    fontSize: '0.6rem',
    letterSpacing: '0.05em',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    color: 'var(--gold-bright)',
    borderBottomColor: 'var(--gold-mid)',
    background: 'rgba(232,196,74,0.06)',
  },
  toolList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  toolBtn: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '0.6rem 0.75rem',
    textAlign: 'left',
    color: 'var(--text-primary)',
    transition: 'all 0.15s',
    position: 'relative',
  },
  toolBtnSelected: {
    background: 'rgba(232,196,74,0.1)',
    border: '1px solid rgba(232,196,74,0.4)',
  },
  toolBtnLocked: {
    opacity: 0.45,
  },
  toolBtnCantAfford: {
    opacity: 0.6,
  },
  toolHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  toolEmoji: {
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  toolName: {
    flex: 1,
    fontFamily: "'Cinzel', serif",
    fontSize: '0.7rem',
    color: 'var(--bone)',
    letterSpacing: '0.03em',
  },
  toolCost: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  toolDesc: {
    marginTop: '0.4rem',
    fontSize: '0.75rem',
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    paddingLeft: '1.6rem',
  },
  lockedBadge: {
    position: 'absolute',
    top: '50%',
    right: '0.75rem',
    transform: 'translateY(-50%)',
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    fontFamily: "'Cinzel', serif",
  },
  hint: {
    padding: '0.6rem 0.75rem',
    fontSize: '0.7rem',
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    color: 'var(--text-muted)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
  },
}
