import React, { useState, useRef, useCallback } from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { DUNGEON_TOOLS, TOOL_CATEGORY, BANK_COST_MULT, SYNERGY_PAIRS, HERO_TYPES } from '../game/constants.js'

// Build notes about hero immunities / special interactions for this tool
function getHeroNotes(tool) {
  const notes = []
  const id = tool.id
  if (tool.slowOnHit) {
    const immuneHeroes = Object.values(HERO_TYPES).filter(h => h.immuneToSlow).map(h => h.label)
    if (immuneHeroes.length) notes.push({ text: `Slow-immune: ${immuneHeroes.join(', ')}`, bad: true })
  }
  if (tool.poisonOnHit || id === 'poison' || id === 'spider') {
    const immuneHeroes = Object.values(HERO_TYPES).filter(h => h.immuneToPoison).map(h => h.label)
    if (immuneHeroes.length) notes.push({ text: `Poison-immune: ${immuneHeroes.join(', ')}`, bad: true })
  }
  if (id === 'fire') {
    const resistHeroes = Object.values(HERO_TYPES).filter(h => h.fireResist).map(h =>
      `${h.label} (${Math.round(h.fireResist * 100)}% resist)`)
    if (resistHeroes.length) notes.push({ text: `Fire resist: ${resistHeroes.join(', ')}`, bad: true })
  }
  if (tool.targetGoldCarriers) notes.push({ text: '2× damage vs gold carriers fleeing', bad: false })
  if (tool.aoeAttack)           notes.push({ text: 'AoE — hits ALL heroes in range', bad: false })
  if ((id === 'spike' || id === 'boulder') && Object.values(HERO_TYPES).some(h => h.canDisarm || h.boulderResist)) {
    notes.push({ text: 'Warlord destroys on-path traps; Thief disarms spikes', bad: true })
  }
  return notes
}

const CATEGORY_LABELS = {
  [TOOL_CATEGORY.TRAPS]:      '⚠ Traps',
  [TOOL_CATEGORY.MONSTERS]:   '💀 Monsters',
  [TOOL_CATEGORY.STRUCTURES]: '🧱 Structures',
}

function ToolPalette() {
  const phase          = useGameStore(s => s.phase)
  const selectedTool   = useGameStore(s => s.selectedTool)
  const selectedCat    = useGameStore(s => s.selectedCategory)
  const gold           = useGameStore(s => s.gold)
  const bank           = useGameStore(s => s.bank)
  const unlockedTools  = useGameStore(s => s.unlockedTools)
  const selectTool     = useGameStore(s => s.selectTool)
  const selectCategory = useGameStore(s => s.selectCategory)

  // Tooltip state — which tool is hovered, and the tooltip position
  const [tooltip, setTooltip]       = useState(null)   // { tool, rect }
  const tooltipTimerRef             = useRef(null)

  const handleToolMouseEnter = useCallback((e, tool) => {
    clearTimeout(tooltipTimerRef.current)
    const rect = e.currentTarget.getBoundingClientRect()
    tooltipTimerRef.current = setTimeout(() => {
      setTooltip({ tool, rect })
    }, 400)
  }, [])

  const handleToolMouseLeave = useCallback(() => {
    clearTimeout(tooltipTimerRef.current)
    setTooltip(null)
  }, [])

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
              onMouseEnter={(e) => isUnlocked && handleToolMouseEnter(e, tool)}
              onMouseLeave={handleToolMouseLeave}
              style={{
                ...styles.toolBtn,
                ...(isSelected ? styles.toolBtnSelected : {}),
                ...(!isUnlocked ? styles.toolBtnLocked : {}),
                ...(!canAfford && isUnlocked ? styles.toolBtnCantAfford : {}),
                cursor: isActive ? 'pointer' : 'not-allowed',
              }}
            >
              <div style={styles.toolHeader}>
                <span style={styles.toolEmoji}>{tool.emoji}</span>
                <span style={styles.toolName}>{tool.label}</span>
                {/* Cost badge — gold during plan, war-chest amber during wave */}
                <span style={{
                  ...styles.toolCost,
                  color: !canAfford
                    ? 'var(--color-hard)'
                    : isWave
                      ? '#e8a030'
                      : 'var(--gold-bright)',
                }}>
                  {displayCost}{isWave ? '⚔' : 'g'}
                </span>
              </div>

              {isSelected && (
                <div style={styles.toolDescBlock}>
                  <p style={styles.toolDesc}>
                    {isWave
                      ? `Emergency cost: ${displayCost}g from war chest. ${tool.description}`
                      : tool.description}
                  </p>
                  {/* DPS / gold efficiency — only shown for ranged damage towers */}
                  {tool.damage && tool.attackSpeed && tool.range && (
                    <DpsLine tool={tool} />
                  )}
                </div>
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

      {/* Hover tooltip — rendered as a fixed overlay */}
      {tooltip && <ToolTooltip tool={tooltip.tool} anchorRect={tooltip.rect} />}
    </div>
  )
}

// ── Hover tooltip ─────────────────────────────────────────────────────────────
function ToolTooltip({ tool, anchorRect }) {
  const synergies = []
  // Collect synergy partners from both directions
  if (SYNERGY_PAIRS[tool.id]) {
    Object.keys(SYNERGY_PAIRS[tool.id]).forEach(partnerId => {
      const partner = DUNGEON_TOOLS.find(t => t.id === partnerId)
      if (partner) synergies.push(partner.label)
    })
  }
  Object.entries(SYNERGY_PAIRS).forEach(([otherId, pairs]) => {
    if (pairs[tool.id]) {
      const partner = DUNGEON_TOOLS.find(t => t.id === otherId)
      if (partner && !synergies.includes(partner.label)) synergies.push(partner.label)
    }
  })

  const heroNotes = getHeroNotes(tool)

  // Position: to the right of the palette (or left if no room)
  const TIP_W = 230
  const TIP_X = anchorRect.right + 8
  const TIP_Y = Math.min(anchorRect.top, window.innerHeight - 320)

  return (
    <div style={{
      ...tt.root,
      left: TIP_X,
      top:  TIP_Y,
    }}>
      {/* Header */}
      <div style={tt.header}>
        <span style={tt.emoji}>{tool.emoji}</span>
        <span style={tt.name}>{tool.label}</span>
        <span style={tt.cost}>{tool.cost}g</span>
      </div>

      {/* Description */}
      <p style={tt.desc}>{tool.description}</p>

      {/* Stats */}
      {(tool.damage || tool.range || tool.attackSpeed || tool.dotDamage) && (
        <div style={tt.statsBlock}>
          {tool.damage      && <StatRow label="Damage"     val={tool.damage} />}
          {tool.range       && <StatRow label="Range"      val={tool.range} />}
          {tool.attackSpeed && <StatRow label="Speed"      val={`${(tool.attackSpeed/1000).toFixed(2)}s`} />}
          {tool.dotDamage   && <StatRow label="DoT HP/s"   val={tool.dotDamage} />}
          {tool.damage && tool.attackSpeed && (
            <StatRow label="DPS" val={(tool.damage / (tool.attackSpeed / 1000)).toFixed(1)} highlight />
          )}
        </div>
      )}

      {/* Synergies */}
      {synergies.length > 0 && (
        <div style={tt.section}>
          <div style={tt.sectionLabel}>✦ Pairs well with</div>
          <div style={tt.chips}>
            {synergies.map(name => (
              <span key={name} style={tt.chip}>{name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Hero notes */}
      {heroNotes.length > 0 && (
        <div style={tt.section}>
          <div style={tt.sectionLabel}>⚔ vs Heroes</div>
          {heroNotes.map((n, i) => (
            <div key={i} style={{ ...tt.noteRow, color: n.bad ? '#e07050' : '#60c080' }}>
              {n.bad ? '⚠ ' : '✓ '}{n.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatRow({ label, val, highlight }) {
  return (
    <div style={tt.statRow}>
      <span style={tt.statLabel}>{label}</span>
      <span style={{ ...tt.statVal, color: highlight ? 'var(--gold-bright)' : 'var(--bone)' }}>{val}</span>
    </div>
  )
}

const tt = {
  root: {
    position: 'fixed',
    zIndex: 9999,
    width: 230,
    background: 'rgba(10,8,16,0.97)',
    border: '1px solid rgba(232,196,74,0.3)',
    borderRadius: 7,
    padding: '0.7rem 0.85rem',
    boxShadow: '0 6px 28px rgba(0,0,0,0.7)',
    pointerEvents: 'none',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem',
  },
  emoji: { fontSize: '1.2rem', flexShrink: 0 },
  name: {
    flex: 1,
    fontFamily: 'var(--font-serif)', fontSize: '0.78rem',
    color: 'var(--gold-bright)', fontWeight: 700,
  },
  cost: {
    fontFamily: 'var(--font-serif)', fontSize: '0.7rem',
    color: 'var(--gold-dim)', fontWeight: 700,
  },
  desc: {
    fontFamily: 'var(--font-italic)', fontStyle: 'italic',
    fontSize: '0.78rem', color: 'var(--text-secondary)',
    lineHeight: 1.45, margin: '0 0 0.5rem',
  },
  statsBlock: {
    display: 'flex', flexDirection: 'column', gap: '0.12rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 4, padding: '0.4rem 0.55rem',
    marginBottom: '0.5rem',
  },
  statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontFamily: 'var(--font-serif)', fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.06em' },
  statVal:   { fontFamily: 'var(--font-serif)', fontSize: '0.65rem', color: 'var(--bone)', fontWeight: 600 },
  section: { marginBottom: '0.4rem' },
  sectionLabel: {
    fontFamily: 'var(--font-serif)', fontSize: '0.5rem',
    color: 'var(--text-muted)', letterSpacing: '0.1em',
    textTransform: 'uppercase', marginBottom: '0.25rem',
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '0.25rem' },
  chip: {
    fontFamily: 'var(--font-serif)', fontSize: '0.52rem',
    color: 'rgba(60,255,180,0.85)',
    background: 'rgba(40,220,160,0.08)',
    border: '1px solid rgba(40,220,160,0.2)',
    borderRadius: 3, padding: '1px 6px',
  },
  noteRow: {
    fontFamily: 'var(--font-italic)', fontSize: '0.72rem', lineHeight: 1.4, marginTop: '0.15rem',
  },
}

function DpsLine({ tool }) {
  const dps      = tool.damage / (tool.attackSpeed / 1000)
  const dpsPerG  = dps / tool.cost
  const isAoe    = tool.aoeAttack
  const aoeNote  = isAoe ? ' (hits all in range)' : ''
  return (
    <div style={dpsStyle}>
      <span style={dpsChip}>{dps.toFixed(1)} DPS</span>
      <span style={dpsChip}>{dpsPerG.toFixed(2)} DPS/g{aoeNote}</span>
      <span style={dpsChip}>range {tool.range}</span>
    </div>
  )
}

const dpsStyle = {
  display: 'flex', flexWrap: 'wrap', gap: '0.25rem',
  marginTop: '0.3rem', paddingLeft: '1.6rem',
}
const dpsChip = {
  fontFamily: 'var(--font-serif)', fontSize: '0.52rem',
  color: 'var(--gold-dim)', background: 'rgba(232,196,74,0.08)',
  border: '1px solid rgba(232,196,74,0.15)',
  borderRadius: 3, padding: '1px 5px', letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
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
    fontFamily: 'var(--font-serif)',
    fontSize: '0.52rem',
    letterSpacing: '0.12em',
    color: '#e8a030',
    textTransform: 'uppercase',
  },
  warChestBalance: {
    fontFamily: 'var(--font-serif)',
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
    fontFamily: 'var(--font-serif)',
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
    fontFamily: 'var(--font-serif)',
    fontSize: '0.7rem',
    color: 'var(--bone)',
    letterSpacing: '0.03em',
  },
  toolCost: {
    fontFamily: 'var(--font-serif)',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  toolDescBlock: {
    marginTop: '0.3rem',
  },
  toolDesc: {
    marginTop: '0.1rem',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-italic)',
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
    fontFamily: 'var(--font-serif)',
  },
  hint: {
    padding: '0.6rem 0.75rem',
    fontSize: '0.7rem',
    fontFamily: 'var(--font-italic)',
    fontStyle: 'italic',
    color: 'var(--text-muted)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
    minHeight: 36,
  },
}

export default React.memo(ToolPalette)
