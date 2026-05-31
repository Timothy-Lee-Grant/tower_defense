import React from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { WAVE_CONFIGS, TREASURE_MAX_HP } from '../game/constants.js'

export default function HUD() {
  const phase          = useGameStore(s => s.phase)
  const waveIndex      = useGameStore(s => s.waveIndex)
  const gold           = useGameStore(s => s.gold)
  const bank           = useGameStore(s => s.bank)
  const treasureHp     = useGameStore(s => s.treasureHp)
  const heroesKilled   = useGameStore(s => s.heroesKilled)
  const showPreview    = useGameStore(s => s.showPathPreview)
  const startWave      = useGameStore(s => s.startWave)
  const togglePreview  = useGameStore(s => s.togglePathPreview)
  const goToMenu       = useGameStore(s => s.goToMenu)

  const waveConfig = WAVE_CONFIGS[waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1]
  const hpRatio = treasureHp / TREASURE_MAX_HP

  return (
    <div style={styles.hud}>
      {/* Left: wave info */}
      <div style={styles.section}>
        <span style={styles.label}>WAVE</span>
        <span style={styles.bigValue}>{waveIndex + 1}</span>
        {waveConfig && (
          <span style={styles.waveLabel}>{waveConfig.label}</span>
        )}
      </div>

      {/* Center: treasure HP */}
      <div style={{ ...styles.section, flexDirection: 'column', gap: '0.2rem', flex: 2 }}>
        <div style={styles.treasureHeader}>
          <span style={styles.label}>★ TREASURE</span>
          <span style={{ ...styles.label, color: hpRatio < 0.3 ? '#8b1a1a' : 'var(--gold-dim)' }}>
            {Math.ceil(treasureHp)} / {TREASURE_MAX_HP}
          </span>
        </div>
        <div style={styles.hpTrack}>
          <div style={{
            ...styles.hpFill,
            width: `${(hpRatio * 100).toFixed(1)}%`,
            background: hpRatio > 0.6 ? '#c9a02a' : hpRatio > 0.3 ? '#c4430a' : '#8b1a1a',
            boxShadow: `0 0 8px ${hpRatio > 0.3 ? '#c9a02a44' : '#8b1a1a88'}`,
          }} />
        </div>
      </div>

      {/* Right: gold & stats */}
      <div style={styles.section}>
        <div style={styles.statPair}>
          <span style={styles.label}>GOLD</span>
          <span style={{ ...styles.bigValue, color: 'var(--gold-bright)' }}>
            {gold}g
          </span>
        </div>
        <div style={styles.statPair}>
          <span style={styles.label}>SLAIN</span>
          <span style={{ ...styles.bigValue, color: 'var(--bone)' }}>{heroesKilled}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={styles.actions}>
        {phase === PHASE.PLAN && (
          <>
            <button
              style={{ ...styles.btn, ...(showPreview ? styles.btnActive : {}) }}
              onClick={togglePreview}
              title="Preview hero pathfinding routes"
            >
              👁 Paths
            </button>
            <button style={styles.btnPrimary} onClick={startWave}>
              ⚔ Send Them In
            </button>
          </>
        )}
        {phase === PHASE.WAVE && (
          <div style={styles.waveIndicator}>
            <span style={styles.wavePulse}>⚡</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: "'Cinzel', serif" }}>
              WAVE IN PROGRESS
            </span>
          </div>
        )}
        <button style={styles.menuBtn} onClick={goToMenu} title="Back to main menu">
          ☰
        </button>
      </div>
    </div>
  )
}

const styles = {
  hud: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '0.5rem 1rem',
    background: '#0d0b0e',
    borderBottom: '1px solid rgba(232,196,74,0.15)',
    minHeight: 52,
    flexShrink: 0,
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  label: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.6rem',
    letterSpacing: '0.15em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  bigValue: {
    fontFamily: "'Cinzel', serif",
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--bone)',
  },
  waveLabel: {
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  treasureHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hpTrack: {
    height: 6,
    background: '#1e1428',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
    border: '1px solid rgba(232,196,74,0.1)',
  },
  hpFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease, background 0.5s ease',
  },
  statPair: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.1rem',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginLeft: 'auto',
  },
  btn: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-secondary)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 5,
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
    fontFamily: "'Cinzel', serif",
    cursor: 'pointer',
  },
  btnActive: {
    background: 'rgba(232,196,74,0.12)',
    color: 'var(--gold-bright)',
    borderColor: 'rgba(232,196,74,0.35)',
  },
  btnPrimary: {
    background: 'var(--gold-mid)',
    color: '#0d0b0e',
    border: 'none',
    borderRadius: 5,
    padding: '0.45rem 1rem',
    fontSize: '0.8rem',
    fontFamily: "'Cinzel', serif",
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.03em',
    boxShadow: '0 2px 12px rgba(232,196,74,0.2)',
  },
  menuBtn: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 5,
    padding: '0.4rem 0.6rem',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  waveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  wavePulse: {
    fontSize: '1rem',
    animation: 'pulse 1s ease-in-out infinite',
  },
}

// Pulse keyframe
const styleEl = document.createElement('style')
styleEl.textContent = `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`
document.head.appendChild(styleEl)
