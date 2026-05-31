import React from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { WAVE_CONFIGS, HERO_TYPES } from '../game/constants.js'
import DungeonGrid from './DungeonGrid.jsx'
import ToolPalette from './ToolPalette.jsx'
import BattleLog from './BattleLog.jsx'
import HUD from './HUD.jsx'

export default function GameScreen() {
  const phase      = useGameStore(s => s.phase)
  const placeTile  = useGameStore(s => s.placeTile)
  const removeTile = useGameStore(s => s.removeTile)

  return (
    <div style={styles.root}>
      {/* Top HUD bar */}
      <HUD />

      {/* Main content row */}
      <div style={styles.body}>
        {/* Left sidebar: tool palette (plan phase) or battle log (wave phase) */}
        <div style={styles.sidebar}>
          {phase === PHASE.PLAN && <ToolPalette />}
          {phase === PHASE.WAVE && <BattleLog />}
        </div>

        {/* Center: dungeon grid */}
        <div style={styles.gridWrapper}>
          <DungeonGrid
            onTileClick={placeTile}
            onTileRightClick={removeTile}
          />
        </div>

        {/* Right sidebar: always shows battle log when available */}
        {phase === PHASE.PLAN && (
          <div style={styles.rightPanel}>
            <PlanHints />
          </div>
        )}
        {phase === PHASE.WAVE && (
          <div style={styles.rightPanel}>
            <WavePanel />
          </div>
        )}
      </div>
    </div>
  )
}

function PlanHints() {
  const waveIndex  = useGameStore(s => s.waveIndex)
  const nextWave = WAVE_CONFIGS[waveIndex]

  return (
    <div style={styles.hints}>
      <div style={styles.hintsHeader}>⚠ INCOMING THREAT</div>
      {nextWave && (
        <>
          <p style={styles.hintsWaveName}>{nextWave.label}</p>
          <div style={styles.heroListIncoming}>
            {[...new Set(nextWave.heroes)].map(heroId => {
              const hero = HERO_TYPES[heroId]
              const count = nextWave.heroes.filter(h => h === heroId).length
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

      <div style={{ marginTop: '1.5rem', ...styles.hintsHeader }}>📖 CONTROLS</div>
      <div style={styles.controlsList}>
        {[
          ['Left click', 'Place selected tool'],
          ['Right click', 'Sell tile (50% refund)'],
          ['👁 Paths', 'Preview hero routes'],
          ['Select tool', 'Click tool then click grid'],
          ['⚔ Send Them In', 'Begin the wave'],
        ].map(([key, val]) => (
          <div key={key} style={styles.controlRow}>
            <span style={styles.controlKey}>{key}</span>
            <span style={styles.controlVal}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WavePanel() {
  return (
    <div style={styles.hints}>
      <div style={styles.hintsHeader}>💀 GERALD'S NOTES</div>
      <p style={styles.geraldNote}>
        "During active invasion events, I recommend against panic-placing
        traps. The budget committee has reviewed this. You cannot place
        during a wave. This is final."
      </p>
      <p style={{ ...styles.geraldNote, marginTop: '0.75rem', opacity: 0.7 }}>
        "Watch the heroes' paths carefully. Note their weaknesses.
        Adjust your layout before the next wave accordingly."
      </p>
      <p style={{ ...styles.geraldNote, marginTop: '0.75rem', opacity: 0.5 }}>
        "— Gerald, Skeleton MBA, Dungeon Operations Division"
      </p>
    </div>
  )
}

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
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
}
