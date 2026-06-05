import React from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { DUNGEON_TOOLS, TOOL_CATEGORY, BANK_COST_MULT } from '../game/constants.js'

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
  const bank           = useGameStore(s => s.bank)
  const unlockedTools  = useGameStore(s => s.unlockedTools)
  const selectTool     = useGameStore(s => s.selectTool)
  const selectCategory = useGameStore(s => s.selectCategory)

  const isWave     = phase === PHASE.WAVE
  const isDisabled = phase !== PHASE.PLAN && phase !== PHASE.WAVE

  const tools = DUNGEON_TOOLS.filter(t => t.category === selectedCat)

  return (
    <div style={styles.root}>
      {/* War chest emergency banner — shown during wave */}
      {isWave && (
        <div style={styles.warChestBanner}>
          <span style={styles.warChestIcon}>⚔</span>
          <div style={styles.warChestText}>
            <span style={styles.warChestLabel}>EMERGENCY DEPLOYMENT</span>
            <span style={styles.warChestBalance}>{bank}g war chest</span>
          </div>
        </div>
      )}

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
          const isActive   = isUnlocked && !isDisabled

          // Affordability depends on which currency is active
          const displayCost = isWave ? Math.ceil(tool.cost * BANK_COST_MULT) : tool.cost
          const canAfford   = isWave ? bank >= displayCost : gold >= displayCost

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
              title={
                !isUnlocked
                  ? 'Locked — earn from upgrade cards'
                  : isWave
                    ? `War chest cost: ${displayCost}g (1.5× emergency premium)`
                    : tool.description
              }
            >
              <div style={styles.toolHeader}>
                <span style={styles.toolEmoji}>{tool.emoji}</span>
                <span style={styles.toolName}>{tool.label}</span>
                {/* Cost badge — gold during plan, war-chest amber during wave */}
                <span style={{
                  ...styles.toolCost,
                  color: !canAfford
                    ? '#8b1a1a'
                    : isWave
                      ? '#e8a030'
                      : 'var(--gold-bright)',
                }}>
                  {displayCost}{isWave ? '⚔' : 'g'}
                </span>
              </div>

              {isSelected && (
                <p style={styles.toolDesc}>
                  {isWave
                    ? `Emergency cost: ${displayCost}g from war chest. ${tool.description}`
                    : tool.description}
                </p>
              )}

              {!isUnlocked && (
                <div style={styles.lockedBadge}>🔒 Locked</div>
              )}
            </button>
          )
        })}
      </div>

      {/* Bottom hint */}
      <div style={styles.hint}>
        {isWave
          ? '⚔ Spending from war chest · 1.5× base price'
          : phase === PHASE.PLAN
            ? 'Right-click a tile to sell it (50% refund)'
            : ''}
      </div>
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
  warChestBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(180,100,20,0.12)',
    borderBottom: '1px solid rgba(232,160,48,0.25)',
  },
  warChestIcon: {
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  warChestText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.05rem',
    minWidth: 0,
  },
  warChestLabel: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.52rem',
    letterSpacing: '0.12em',
    color: '#e8a030',
    textTransform: 'uppercase',
  },
  warChestBalance: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#f0c060',
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
    opacity: 0.55,
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
    minHeight: 36,
  },
}
