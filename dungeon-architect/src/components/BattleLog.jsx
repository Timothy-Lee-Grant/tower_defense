import React, { useEffect, useRef } from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'

export default function BattleLog() {
  const phase      = useGameStore(s => s.phase)
  const battleLog  = useGameStore(s => s.battleLog)
  const heroes     = useGameStore(s => s.heroes)
  const scrollRef  = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [battleLog])

  const aliveHeroes  = heroes.filter(h => h.spawned && h.state === 'moving')
  const deadHeroes   = heroes.filter(h => h.state === 'dead')
  const escapedHeroes = heroes.filter(h => h.state === 'escaped')

  return (
    <div style={styles.root}>
      {/* Hero status counters */}
      <div style={styles.statusRow}>
        <div style={styles.statusPill}>
          <span style={{ color: 'var(--bone)' }}>⚔</span>
          <span style={styles.statusCount}>{aliveHeroes.length}</span>
          <span style={styles.statusLabel}>active</span>
        </div>
        <div style={styles.statusPill}>
          <span style={{ color: '#3d7a1a' }}>☠</span>
          <span style={styles.statusCount}>{deadHeroes.length}</span>
          <span style={styles.statusLabel}>slain</span>
        </div>
        <div style={styles.statusPill}>
          <span style={{ color: '#8b1a1a' }}>💨</span>
          <span style={styles.statusCount}>{escapedHeroes.length}</span>
          <span style={styles.statusLabel}>escaped</span>
        </div>
      </div>

      {/* Hero list */}
      {heroes.length > 0 && (
        <div style={styles.heroList}>
          {heroes.map(hero => {
            if (!hero.spawned && hero.spawnDelay > 0) {
              return (
                <div key={hero.id} style={styles.heroRow}>
                  <span style={{ opacity: 0.4 }}>{hero.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={styles.heroName}>{hero.label}</div>
                    <div style={styles.heroStatus}>Incoming...</div>
                  </div>
                </div>
              )
            }
            const hpRatio = Math.max(0, hero.hp / hero.maxHp)
            return (
              <div key={hero.id} style={{
                ...styles.heroRow,
                opacity: hero.state === 'dead' ? 0.4 : hero.state === 'escaped' ? 0.6 : 1,
              }}>
                <span style={{ fontSize: '1rem' }}>{hero.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={styles.heroName}>{hero.label}</span>
                    <span style={{
                      ...styles.heroStatus,
                      color: hero.state === 'dead' ? '#8b1a1a'
                        : hero.state === 'escaped' ? '#c9a02a'
                        : 'var(--text-muted)',
                    }}>
                      {hero.state === 'dead' ? '☠ Slain'
                        : hero.state === 'escaped' ? '💨 Escaped'
                        : `${Math.ceil(hero.hp)} HP`}
                    </span>
                  </div>
                  {hero.state === 'moving' && (
                    <div style={styles.hpTrack}>
                      <div style={{
                        ...styles.hpFill,
                        width: `${(hpRatio * 100).toFixed(1)}%`,
                        background: hpRatio > 0.6 ? '#3d7a1a' : hpRatio > 0.3 ? '#c9a02a' : '#8b1a1a',
                      }} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Event log */}
      <div style={styles.logHeader}>
        <span style={styles.logHeaderText}>⚡ Battle Log</span>
      </div>
      <div style={styles.log} ref={scrollRef}>
        {battleLog.length === 0 && (
          <p style={styles.emptyLog}>Awaiting combat reports...</p>
        )}
        {battleLog.map((entry, i) => (
          <div key={i} style={{
            ...styles.logEntry,
            opacity: 0.4 + 0.6 * (i / battleLog.length),
          }}>
            {entry}
          </div>
        ))}
      </div>

      {/* Gerald quip during wave */}
      {phase === PHASE.WAVE && (
        <div style={styles.geraldBox}>
          <span style={styles.geraldName}>💀 Gerald</span>
          <p style={styles.geraldText}>
            {aliveHeroes.length > 3
              ? '"This is... more than expected. I\'ve escalated to management."'
              : aliveHeroes.length === 0
              ? '"Excellent work. I\'ve updated the quarterly projections."'
              : '"Satisfactory progress. The spike traps performed above median."'}
          </p>
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
    overflow: 'hidden',
  },
  statusRow: {
    display: 'flex',
    gap: '0.25rem',
    padding: '0.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  statusPill: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.1rem',
    padding: '0.3rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
  },
  statusCount: {
    fontFamily: "'Cinzel', serif",
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--bone)',
  },
  statusLabel: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.55rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
  },
  heroList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    padding: '0.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    maxHeight: 200,
    overflowY: 'auto',
  },
  heroRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'opacity 0.3s',
  },
  heroName: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.65rem',
    color: 'var(--bone)',
    letterSpacing: '0.05em',
  },
  heroStatus: {
    fontSize: '0.7rem',
    fontFamily: "'Crimson Text', serif",
    color: 'var(--text-muted)',
  },
  hpTrack: {
    height: 3,
    background: '#1e1428',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  hpFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.2s ease',
  },
  logHeader: {
    padding: '0.4rem 0.75rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  logHeaderText: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.12em',
  },
  log: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  logEntry: {
    fontFamily: "'Crimson Text', serif",
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    borderLeft: '2px solid rgba(232,196,74,0.15)',
    paddingLeft: '0.5rem',
  },
  emptyLog: {
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    padding: '0.5rem',
  },
  geraldBox: {
    padding: '0.6rem 0.75rem',
    borderTop: '1px solid rgba(232,196,74,0.1)',
    background: 'rgba(232,196,74,0.04)',
  },
  geraldName: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.6rem',
    color: 'var(--gold-dim)',
    letterSpacing: '0.1em',
    display: 'block',
    marginBottom: '0.2rem',
  },
  geraldText: {
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
}
