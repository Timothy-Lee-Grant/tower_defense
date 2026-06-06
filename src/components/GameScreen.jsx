import React, { useMemo, useState, useCallback } from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { WAVE_CONFIGS, HERO_TYPES, DUNGEON_TOOLS, UPGRADE_TIERS, getEffectiveTool } from '../game/constants.js'
import { selectSynergyComment } from '../game/gerald.js'
import { estimateSurvival, getImmunityWarnings, HERO_PATH_COLORS } from '../game/analysis.js'
import { encodeLayout } from '../game/persistence.js'
import DungeonGrid from './DungeonGrid.jsx'
import ToolPalette from './ToolPalette.jsx'
import BattleLog from './BattleLog.jsx'
import HUD from './HUD.jsx'
import GlobalEventOverlay from './GlobalEventOverlay.jsx'

export default function GameScreen() {
  const phase          = useGameStore(s => s.phase)
  const placeTile      = useGameStore(s => s.placeTile)
  const bankPlaceTile  = useGameStore(s => s.bankPlaceTile)
  const removeTile     = useGameStore(s => s.removeTile)
  const upgradeTile    = useGameStore(s => s.upgradeTile)
  const tileUpgrades   = useGameStore(s => s.tileUpgrades)
  const grid           = useGameStore(s => s.grid)

  // Upgrade panel state — { col, row } or null
  const [upgradeTarget, setUpgradeTarget] = useState(null)

  // During a wave, tile clicks spend from the war chest at 1.5× cost.
  const handleTileClick = phase === PHASE.WAVE ? bankPlaceTile : placeTile

  // Right-click: open upgrade panel for placed tools, else remove
  const handleRightClick = useCallback((col, row) => {
    const tileId = grid[row]?.[col]
    const isPlacedTool = tileId && DUNGEON_TOOLS.some(t => t.id === tileId)
    if (isPlacedTool) {
      setUpgradeTarget(prev =>
        prev?.col === col && prev?.row === row ? null : { col, row }
      )
    } else {
      removeTile(col, row)
    }
  }, [grid, removeTile])

  const handleUpgrade = useCallback(() => {
    if (!upgradeTarget) return
    upgradeTile(upgradeTarget.col, upgradeTarget.row)
  }, [upgradeTarget, upgradeTile])

  const handleSell = useCallback(() => {
    if (!upgradeTarget) return
    removeTile(upgradeTarget.col, upgradeTarget.row)
    setUpgradeTarget(null)
  }, [upgradeTarget, removeTile])

  return (
    <div style={styles.root}>
      {/* Top HUD bar */}
      <HUD />

      {/* Main content row */}
      <div style={styles.body}>
        {/* Left sidebar: tool palette always visible so player can build during waves */}
        <div style={styles.sidebar}>
          <ToolPalette />
        </div>

        {/* Center: dungeon grid */}
        <div style={styles.gridWrapper}>
          <DungeonGrid
            onTileClick={handleTileClick}
            onTileRightClick={handleRightClick}
          />
          {/* Global Event announcement overlay — shown at wave start */}
          <GlobalEventOverlay />

          {/* Upgrade panel overlaid on grid */}
          {upgradeTarget && (
            <UpgradePanel
              col={upgradeTarget.col}
              row={upgradeTarget.row}
              tileId={grid[upgradeTarget.row]?.[upgradeTarget.col]}
              currentTier={tileUpgrades[`${upgradeTarget.col},${upgradeTarget.row}`] ?? 0}
              onUpgrade={handleUpgrade}
              onSell={handleSell}
              onClose={() => setUpgradeTarget(null)}
            />
          )}
        </div>

        {/* Right sidebar: incoming threat (plan) or live battle log (wave) */}
        <div style={styles.rightPanel}>
          {phase === PHASE.PLAN && <PlanHints />}
          {phase === PHASE.WAVE && <BattleLog />}
        </div>
      </div>
    </div>
  )
}

// ── Upgrade Panel ────────────────────────────────────────────────────────────
const TIER_LABELS = ['Base', 'Tier 2', 'Tier 3']
const TIER_COLORS = ['#888', '#60aaff', '#ffaa20']

function UpgradePanel({ col, row, tileId, currentTier, onUpgrade, onSell, onClose }) {
  const bank = useGameStore(s => s.bank)

  const baseDef   = DUNGEON_TOOLS.find(t => t.id === tileId)
  if (!baseDef) return null

  const tierDefs  = UPGRADE_TIERS[tileId] ?? []
  const currTier  = getEffectiveTool(tileId, currentTier) ?? baseDef
  const nextTier  = currentTier < 2 ? (tierDefs[currentTier] ?? null) : null
  const canAfford = nextTier && bank >= nextTier.cost

  const statRows = []
  if (currTier.damage)      statRows.push({ label: 'Damage',      val: currTier.damage,      next: nextTier?.stats?.damage })
  if (currTier.range)       statRows.push({ label: 'Range',       val: currTier.range,       next: nextTier?.stats?.range })
  if (currTier.attackSpeed) statRows.push({ label: 'Speed (ms)',  val: currTier.attackSpeed, next: nextTier?.stats?.attackSpeed })
  if (currTier.dotDamage)   statRows.push({ label: 'DoT HP/s',    val: currTier.dotDamage,   next: nextTier?.stats?.dotDamage })

  return (
    <div style={upgradeStyles.overlay} onMouseDown={e => e.stopPropagation()}>
      <div style={upgradeStyles.panel}>
        {/* Header */}
        <div style={upgradeStyles.header}>
          <span style={{ fontSize: 20 }}>{baseDef.emoji}</span>
          <span style={upgradeStyles.tileLabel}>{baseDef.label}</span>
          <span style={{ ...upgradeStyles.tierBadge, color: TIER_COLORS[currentTier] }}>
            {TIER_LABELS[currentTier]}
          </span>
          <button style={upgradeStyles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Current description */}
        <p style={upgradeStyles.desc}>{baseDef.description}</p>

        {/* Stat comparison */}
        {statRows.length > 0 && (
          <div style={upgradeStyles.stats}>
            {statRows.map(s => (
              <div key={s.label} style={upgradeStyles.statRow}>
                <span style={upgradeStyles.statLabel}>{s.label}</span>
                <span style={upgradeStyles.statVal}>{s.val}</span>
                {s.next !== undefined && s.next !== s.val && (
                  <span style={upgradeStyles.statNext}> → {s.next}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Next tier info */}
        {nextTier ? (
          <div style={upgradeStyles.nextTier}>
            <div style={upgradeStyles.nextTierHeader}>
              <span style={{ color: TIER_COLORS[currentTier + 1] }}>
                ▲ {TIER_LABELS[currentTier + 1]}: {nextTier.label}
              </span>
              <span style={{ color: canAfford ? '#c8a048' : '#884a2a' }}>
                {nextTier.cost}g bank
              </span>
            </div>
            <p style={upgradeStyles.nextTierDesc}>{nextTier.desc}</p>
            <button
              style={{ ...upgradeStyles.upgradeBtn, opacity: canAfford ? 1 : 0.45 }}
              disabled={!canAfford}
              onClick={onUpgrade}
            >
              {canAfford ? `Upgrade (${nextTier.cost}g)` : `Need ${nextTier.cost - bank}g more`}
            </button>
          </div>
        ) : (
          <div style={upgradeStyles.maxTier}>✦ Fully upgraded</div>
        )}

        {/* Sell */}
        <div style={upgradeStyles.sellRow}>
          <span style={upgradeStyles.sellNote}>Sell refunds base cost only</span>
          <button style={upgradeStyles.sellBtn} onClick={onSell}>
            Sell (+{Math.floor((baseDef.cost ?? 0) * 0.5)}g)
          </button>
        </div>
      </div>
    </div>
  )
}

const upgradeStyles = {
  overlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 50,
  },
  panel: {
    pointerEvents: 'all',
    background: 'rgba(14,10,20,0.97)',
    border: '1px solid rgba(200,160,72,0.4)',
    borderRadius: 8,
    padding: '14px 16px',
    minWidth: 240, maxWidth: 280,
    color: '#d8d0c8',
    fontSize: 13,
    boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 6,
  },
  tileLabel: { fontWeight: 700, fontSize: 15, flex: 1 },
  tierBadge: { fontSize: 12, fontWeight: 600 },
  closeBtn: {
    background: 'none', border: 'none', color: '#888',
    cursor: 'pointer', fontSize: 14, padding: '0 2px',
    marginLeft: 'auto',
  },
  desc: { margin: '0 0 10px', color: '#a09080', fontSize: 12, lineHeight: 1.4 },
  stats: { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 },
  statRow: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },
  statLabel: { color: '#887870', minWidth: 70 },
  statVal:   { color: '#d8d0c8' },
  statNext:  { color: '#60aaff', fontWeight: 600 },
  nextTier: {
    background: 'rgba(32,24,12,0.8)',
    border: '1px solid rgba(200,160,72,0.2)',
    borderRadius: 5, padding: '8px 10px', marginBottom: 10,
  },
  nextTierHeader: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 13, fontWeight: 600, marginBottom: 4,
  },
  nextTierDesc: { margin: '0 0 8px', color: '#a09080', fontSize: 12, lineHeight: 1.4 },
  upgradeBtn: {
    width: '100%', padding: '6px 0',
    background: 'rgba(200,160,72,0.15)',
    border: '1px solid rgba(200,160,72,0.4)',
    borderRadius: 4, color: '#c8a048',
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  maxTier: { color: '#60aaff', textAlign: 'center', padding: '6px 0', marginBottom: 8, fontSize: 13 },
  sellRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sellNote: { color: '#666', fontSize: 11 },
  sellBtn: {
    padding: '4px 10px',
    background: 'rgba(139,26,26,0.2)',
    border: '1px solid rgba(139,26,26,0.4)',
    borderRadius: 4, color: '#c04040',
    cursor: 'pointer', fontSize: 12,
  },
}

function PlanHints() {
  const waveIndex        = useGameStore(s => s.waveIndex)
  const layoutData       = useGameStore(s => s.layoutData)
  const grid             = useGameStore(s => s.grid)
  const showPathPreview  = useGameStore(s => s.showPathPreview)
  const [copyMsg, setCopyMsg] = useState('')
  const handleCopyLayout = useCallback(() => {
    const code = encodeLayout(grid)
    navigator.clipboard?.writeText(code).then(() => {
      setCopyMsg('✓ Copied!')
    }).catch(() => {
      setCopyMsg(code.slice(0, 12) + '…')
    })
    setTimeout(() => setCopyMsg(''), 2200)
  }, [grid])
  const showCoverageMap  = useGameStore(s => s.showCoverageMap)
  const togglePathPreview = useGameStore(s => s.togglePathPreview)
  const toggleCoverageMap = useGameStore(s => s.toggleCoverageMap)

  const nextWave   = WAVE_CONFIGS[waveIndex]
  const nextHeroes = nextWave?.heroes ?? []
  const uniqueHeroIds = [...new Set(nextHeroes)]

  // Synergy comment
  const synergy = useMemo(
    () => selectSynergyComment(grid, nextHeroes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grid, waveIndex]
  )

  // Threat assessment — survivability per hero type, memoised on grid change
  const threatData = useMemo(() => uniqueHeroIds.map(heroId => ({
    heroId,
    survival:  estimateSurvival(heroId, grid, layoutData.pathTiles),
    warnings:  getImmunityWarnings(heroId, grid),
    count:     nextHeroes.filter(h => h === heroId).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [grid, waveIndex])

  return (
    <div style={styles.hints}>
      {/* Incoming threat list */}
      <div style={styles.hintsHeader}>⚠ INCOMING THREAT</div>
      {nextWave && (
        <>
          <p style={styles.hintsWaveName}>{nextWave.label}</p>
          <div style={styles.heroListIncoming}>
            {uniqueHeroIds.map(heroId => {
              const hero  = HERO_TYPES[heroId]
              const count = nextHeroes.filter(h => h === heroId).length
              return (
                <div key={heroId} style={styles.incomingHero}>
                  <span style={{ fontSize: '1.2rem' }}>{hero.emoji}</span>
                  <div>
                    <div style={styles.incomingName}>{count}× {hero.label}</div>
                    <div style={styles.incomingDesc}>{hero.description}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Threat assessment bars */}
      {threatData.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={styles.hintsHeader}>🎯 THREAT LEVEL</div>
          <div style={styles.threatList}>
            {threatData.map(({ heroId, survival, warnings, count }) => {
              const hero    = HERO_TYPES[heroId]
              const color   = HERO_PATH_COLORS[heroId] ?? '#aaa'
              const pct     = Math.round(survival * 100)
              const danger  = survival > 0.65
              return (
                <div key={heroId} style={styles.threatRow}>
                  <div style={styles.threatHeader}>
                    <span style={{ fontSize: '0.9rem' }}>{hero.emoji}</span>
                    <span style={{ ...styles.threatName, color }}>
                      {hero.label}{count > 1 ? ` ×${count}` : ''}
                    </span>
                    <span style={{
                      ...styles.threatPct,
                      color: danger ? '#e06040' : '#60c060',
                    }}>{pct}%</span>
                  </div>
                  <div style={styles.threatTrack}>
                    <div style={{
                      ...styles.threatFill,
                      width: `${pct}%`,
                      background: danger
                        ? `linear-gradient(90deg, #8b1a1a, ${color}88)`
                        : `linear-gradient(90deg, #1a5a1a, ${color}88)`,
                    }} />
                  </div>
                  {warnings.length > 0 && (
                    <div style={styles.threatWarnings}>
                      {warnings.map(w => (
                        <span key={w} style={styles.warnBadge}>⚠ {w}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Analysis tool toggles */}
      <div style={{ marginTop: '1rem' }}>
        <div style={styles.hintsHeader}>🔍 ANALYSIS TOOLS</div>
        <div style={styles.toggleRow}>
          <button
            style={{ ...styles.toggleBtn, ...(showPathPreview ? styles.toggleBtnOn : {}) }}
            onClick={togglePathPreview}
            title="Show colour-coded hero route on the grid"
          >
            👁 Paths
          </button>
          <button
            style={{ ...styles.toggleBtn, ...(showCoverageMap ? styles.toggleBtnOn : {}) }}
            onClick={toggleCoverageMap}
            title="Highlight covered (green) and uncovered (red) path tiles"
          >
            🗺 Coverage
          </button>
        </div>
        {showCoverageMap && (
          <p style={styles.toggleHint}>
            Green = tower coverage · Red = undefended path
          </p>
        )}
        {showPathPreview && (
          <p style={styles.toggleHint}>
            Coloured lines show each hero type's route
          </p>
        )}
      </div>

      {/* Layout export */}
      <div style={{ marginTop: '0.5rem' }}>
        <button
          style={{ ...styles.toggleBtn, width: '100%', marginTop: '0.3rem' }}
          onClick={handleCopyLayout}
          title="Copy a compact layout code to your clipboard to share this dungeon"
        >
          {copyMsg || '📋 Copy Layout Code'}
        </button>
      </div>

      {/* Controls */}
      <div style={{ marginTop: '1rem', ...styles.hintsHeader }}>📖 CONTROLS</div>
      <div style={styles.controlsList}>
        {[
          ['Left click', 'Place selected tool'],
          ['Right click', 'Sell tile (50% refund)'],
          ['During wave', '⚔ costs from War Chest'],
          ['⚔ Send Them In', 'Begin the wave'],
        ].map(([key, val]) => (
          <div key={key} style={styles.controlRow}>
            <span style={styles.controlKey}>{key}</span>
            <span style={styles.controlVal}>{val}</span>
          </div>
        ))}
      </div>

      {/* Gerald's synergy assessment */}
      {synergy && (
        <div style={styles.geraldAssessment}>
          <div style={styles.hintsHeader}>💀 GERALD'S ASSESSMENT</div>
          <p style={styles.geraldNote}>{synergy}</p>
        </div>
      )}
    </div>
  )
}

// WavePanel removed — BattleLog is now shown on the right during waves.

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--stone-darkest)',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: 220,
    flexShrink: 0,
    overflow: 'hidden',
  },
  gridWrapper: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'stretch',
    background: '#111018',
    position: 'relative',
  },
  rightPanel: {
    width: 220,
    flexShrink: 0,
    background: '#0d0b0e',
    borderLeft: '1px solid rgba(232,196,74,0.12)',
    overflow: 'hidden',
  },
  hints: {
    padding: '0.75rem',
    height: '100%',
    overflowY: 'auto',
  },
  hintsHeader: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.6rem',
    letterSpacing: '0.15em',
    color: 'var(--text-muted)',
    marginBottom: '0.6rem',
    textTransform: 'uppercase',
  },
  hintsWaveName: {
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    color: 'var(--gold-bright)',
    fontSize: '1rem',
    marginBottom: '0.75rem',
  },
  heroListIncoming: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  incomingHero: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-start',
  },
  incomingName: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.65rem',
    color: 'var(--bone)',
    letterSpacing: '0.05em',
  },
  incomingDesc: {
    fontFamily: "'Crimson Text', serif",
    fontSize: '0.75rem',
    fontStyle: 'italic',
    color: 'var(--text-muted)',
    lineHeight: 1.3,
    marginTop: '0.1rem',
  },
  controlsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  controlRow: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.3rem 0.4rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    borderLeft: '2px solid rgba(232,196,74,0.2)',
  },
  controlKey: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.6rem',
    color: 'var(--gold-dim)',
    letterSpacing: '0.05em',
  },
  controlVal: {
    fontFamily: "'Crimson Text', serif",
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
  },
  geraldNote: {
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: 0,
  },
  geraldAssessment: {
    marginTop: '1.2rem',
    padding: '0.55rem 0.6rem',
    background: 'rgba(232,196,74,0.04)',
    border: '1px solid rgba(232,196,74,0.1)',
    borderRadius: 5,
  },
  // Threat assessment
  threatList: {
    display: 'flex', flexDirection: 'column', gap: '0.45rem',
  },
  threatRow: {
    display: 'flex', flexDirection: 'column', gap: '0.15rem',
  },
  threatHeader: {
    display: 'flex', alignItems: 'center', gap: '0.3rem',
  },
  threatName: {
    flex: 1,
    fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.03em',
  },
  threatPct: {
    fontFamily: "'Cinzel', serif", fontSize: '0.65rem', fontWeight: 700,
    minWidth: 32, textAlign: 'right',
  },
  threatTrack: {
    height: 4, background: '#1a1428', borderRadius: 2, overflow: 'hidden',
  },
  threatFill: {
    height: '100%', borderRadius: 2, transition: 'width 0.4s ease',
  },
  threatWarnings: {
    display: 'flex', flexWrap: 'wrap', gap: '0.2rem',
  },
  warnBadge: {
    fontFamily: "'Cinzel', serif", fontSize: '0.48rem', letterSpacing: '0.05em',
    color: '#e08030', background: 'rgba(200,100,20,0.12)',
    border: '1px solid rgba(200,100,20,0.25)',
    borderRadius: 3, padding: '1px 4px',
  },
  // Toggle buttons
  toggleRow: {
    display: 'flex', gap: '0.4rem', marginTop: '0.4rem',
  },
  toggleBtn: {
    flex: 1,
    fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.05em',
    padding: '0.4rem 0.3rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5, cursor: 'pointer',
    color: 'var(--text-muted)', transition: 'all 0.15s',
  },
  toggleBtnOn: {
    background: 'rgba(232,196,74,0.12)',
    border: '1px solid rgba(232,196,74,0.4)',
    color: 'var(--gold-bright)',
  },
  toggleHint: {
    fontFamily: "'Crimson Text', serif", fontStyle: 'italic',
    fontSize: '0.7rem', color: 'var(--text-muted)',
    marginTop: '0.3rem', lineHeight: 1.4,
  },
}
