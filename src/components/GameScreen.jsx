import React, { useMemo } from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { WAVE_CONFIGS, HERO_TYPES } from '../game/constants.js'
import { selectSynergyComment } from '../game/gerald.js'
import { estimateSurvival, getImmunityWarnings, HERO_PATH_COLORS } from '../game/analysis.js'
import DungeonGrid from './DungeonGrid.jsx'
import ToolPalette from './ToolPalette.jsx'
import BattleLog from './BattleLog.jsx'
import HUD from './HUD.jsx'

export default function GameScreen() {
  const phase          = useGameStore(s => s.phase)
  const placeTile      = useGameStore(s => s.placeTile)
  const bankPlaceTile  = useGameStore(s => s.bankPlaceTile)
  const removeTile     = useGameStore(s => s.removeTile)

  // During a wave, tile clicks spend from the war chest at 1.5× cost.
  const handleTileClick = phase === PHASE.WAVE ? bankPlaceTile : placeTile

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
            onTileRightClick={removeTile}
          />
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

function PlanHints() {
  const waveIndex        = useGameStore(s => s.waveIndex)
  const grid             = useGameStore(s => s.grid)
  const showPathPreview  = useGameStore(s => s.showPathPreview)
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
    survival:  estimateSurvival(heroId, grid),
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
