import React, { useEffect, useRef } from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'

export default function BattleLog() {
  const phase     = useGameStore(s => s.phase)
  const battleLog = useGameStore(s => s.battleLog)
  const heroes    = useGameStore(s => s.heroes)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [battleLog])

  const alive       = heroes.filter(h => h.spawned && h.state === 'moving')
  const dead        = heroes.filter(h => h.state === 'dead')
  const escaped     = heroes.filter(h => h.state === 'escaped')
  const carryingGold = alive.filter(h => h.hasGold)
  const inbound     = alive.filter(h => !h.hasGold)

  const gerald = (() => {
    if (carryingGold.length > 0 && carryingGold.length === alive.length)
      return '"Everyone is on the return trip. All traps to maximum alert. NOW."'
    if (carryingGold.length > 0)
      return `"${carryingGold.length} of them have the gold. I repeat: they have the gold."`
    if (alive.length > 3)
      return '"This is... more than expected. I\'ve escalated to the skeleton union rep."'
    if (alive.length === 0 && escaped.length === 0)
      return '"All targets neutralised. Outstanding. I\'ve booked a team celebration."'
    if (alive.length === 0)
      return '"Wave complete. Compiling incident reports on the ones who got away."'
    return '"Satisfactory progress. Spike traps performing at median efficiency."'
  })()

  return (
    <div style={s.root}>
      {/* Status counters */}
      <div style={s.statusRow}>
        <Pill icon="⚔" count={inbound.length}      label="inbound" />
        <Pill icon="💰" count={carryingGold.length} label="fleeing" color="#c9a02a" />
        <Pill icon="☠"  count={dead.length}         label="slain"   color="#3d7a1a" />
        <Pill icon="🏃" count={escaped.length}      label="escaped" color="#8b1a1a" />
      </div>

      {/* Hero list */}
      {heroes.length > 0 && (
        <div style={s.heroList}>
          {heroes.map(hero => {
            if (!hero.spawned && hero.spawnDelay > 0) return (
              <div key={hero.id} style={s.heroRow}>
                <span style={{ opacity: 0.4, fontSize: '1rem' }}>{hero.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={s.heroName}>{hero.label}</div>
                  <div style={s.heroSubtext}>Incoming...</div>
                </div>
              </div>
            )

            const ratio = Math.max(0, hero.hp / hero.maxHp)
            const isDead    = hero.state === 'dead'
            const isEscaped = hero.state === 'escaped'

            return (
              <div key={hero.id} style={{ ...s.heroRow, opacity: isDead ? 0.38 : isEscaped ? 0.55 : 1 }}>
                <span style={{ fontSize: '1rem' }}>{hero.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={s.heroName}>{hero.label}</span>
                    <span style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      {hero.slowed   && <span style={s.badgeBlue}>❄</span>}
                      {hero.poisoned && <span style={s.badgeGreen}>☠</span>}
                      {hero.hasGold  && !isDead && <span style={s.badgeGold}>💰</span>}
                      <span style={{
                        ...s.heroSubtext,
                        color: isDead ? '#8b1a1a' : isEscaped ? '#c9a02a' : 'var(--text-muted)',
                      }}>
                        {isDead    ? '☠ Slain'
                          : isEscaped ? (hero.hasGold ? '🏃 Escaped!' : '💨 Fled')
                          : hero.hasGold ? `${Math.ceil(hero.hp)} HP ← FLEEING`
                          : `${Math.ceil(hero.hp)} HP`}
                      </span>
                    </span>
                  </div>
                  {hero.state === 'moving' && (
                    <div style={s.hpTrack}>
                      <div style={{
                        ...s.hpFill,
                        width: `${(ratio * 100).toFixed(1)}%`,
                        background: hero.hasGold
                          ? (ratio > 0.5 ? '#c9a02a' : '#8b1a1a')
                          : (ratio > 0.6 ? '#3d7a1a' : ratio > 0.3 ? '#c9a02a' : '#8b1a1a'),
                      }} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Log */}
      <div style={s.logHeader}><span style={s.logHeaderText}>⚡ Battle Log</span></div>
      <div style={s.log} ref={scrollRef}>
        {battleLog.length === 0 && (
          <p style={s.emptyLog}>Awaiting combat reports...</p>
        )}
        {battleLog.map((entry, i) => (
          <div key={i} style={{ ...s.logEntry, opacity: 0.35 + 0.65 * (i / battleLog.length) }}>
            {entry}
          </div>
        ))}
      </div>

      {/* Gerald */}
      {phase === PHASE.WAVE && (
        <div style={s.geraldBox}>
          <span style={s.geraldName}>💀 Gerald</span>
          <p style={s.geraldText}>{gerald}</p>
        </div>
      )}
    </div>
  )
}

function Pill({ icon, count, label, color }) {
  return (
    <div style={s.statusPill}>
      <span style={{ color: color ?? 'var(--bone)' }}>{icon}</span>
      <span style={s.statusCount}>{count}</span>
      <span style={s.statusLabel}>{label}</span>
    </div>
  )
}

const s = {
  root: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: '#0d0b0e',
    borderLeft: '1px solid rgba(232,196,74,0.12)',
    overflow: 'hidden',
  },
  statusRow: {
    display: 'flex', gap: '0.2rem', padding: '0.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  statusPill: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '0.08rem', padding: '0.3rem',
    background: 'rgba(255,255,255,0.03)', borderRadius: 4,
  },
  statusCount: {
    fontFamily: "'Cinzel', serif", fontSize: '0.95rem',
    fontWeight: 700, color: 'var(--bone)',
  },
  statusLabel: {
    fontFamily: "'Cinzel', serif", fontSize: '0.5rem',
    color: 'var(--text-muted)', letterSpacing: '0.1em',
  },
  heroList: {
    display: 'flex', flexDirection: 'column', gap: '0.3rem',
    padding: '0.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    maxHeight: 190, overflowY: 'auto',
  },
  heroRow: {
    display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'opacity 0.3s',
  },
  heroName: {
    fontFamily: "'Cinzel', serif", fontSize: '0.62rem',
    color: 'var(--bone)', letterSpacing: '0.04em',
  },
  heroSubtext: {
    fontSize: '0.68rem', fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)',
  },
  badgeGold:  { fontSize: '0.65rem', color: '#c9a02a' },
  badgeBlue:  { fontSize: '0.65rem', color: '#5a9abf' },
  badgeGreen: { fontSize: '0.65rem', color: '#3d7a1a' },
  hpTrack: {
    height: 3, background: '#1e1428', borderRadius: 2,
    overflow: 'hidden', marginTop: 2,
  },
  hpFill: {
    height: '100%', borderRadius: 2, transition: 'width 0.2s ease',
  },
  logHeader: { padding: '0.4rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  logHeaderText: {
    fontFamily: "'Cinzel', serif", fontSize: '0.58rem',
    color: 'var(--text-muted)', letterSpacing: '0.12em',
  },
  log: {
    flex: 1, overflowY: 'auto', padding: '0.5rem',
    display: 'flex', flexDirection: 'column', gap: '0.25rem',
  },
  logEntry: {
    fontFamily: "'Crimson Text', serif", fontSize: '0.78rem',
    color: 'var(--text-secondary)', lineHeight: 1.4,
    borderLeft: '2px solid rgba(232,196,74,0.15)', paddingLeft: '0.45rem',
  },
  emptyLog: {
    fontFamily: "'Crimson Text', serif", fontStyle: 'italic',
    fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.5rem',
  },
  geraldBox: {
    padding: '0.55rem 0.75rem',
    borderTop: '1px solid rgba(232,196,74,0.1)',
    background: 'rgba(232,196,74,0.04)',
  },
  geraldName: {
    fontFamily: "'Cinzel', serif", fontSize: '0.58rem',
    color: 'var(--gold-dim)', letterSpacing: '0.1em',
    display: 'block', marginBottom: '0.18rem',
  },
  geraldText: {
    fontFamily: "'Crimson Text', serif", fontStyle: 'italic',
    fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4,
  },
}
