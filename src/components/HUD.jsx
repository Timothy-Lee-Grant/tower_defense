import React, { useState, useCallback } from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'
import { WAVE_CONFIGS, DIFFICULTIES } from '../game/constants.js'
import { audio } from '../audio/audioEngine.js'

export default function HUD() {
  const phase          = useGameStore(s => s.phase)
  const waveIndex      = useGameStore(s => s.waveIndex)
  const gold           = useGameStore(s => s.gold)
  const bank           = useGameStore(s => s.bank)
  const treasureHp     = useGameStore(s => s.treasureHp)
  const heroesKilled   = useGameStore(s => s.heroesKilled)
  const startWave      = useGameStore(s => s.startWave)
  const goToMenu       = useGameStore(s => s.goToMenu)

  const difficulty    = useGameStore(s => s.difficulty)
  const treasureMaxHp = useGameStore(s => s.treasureMaxHp)
  const waveConfig    = WAVE_CONFIGS[waveIndex] ?? WAVE_CONFIGS[WAVE_CONFIGS.length - 1]
  const diff          = DIFFICULTIES[difficulty] ?? DIFFICULTIES.medium
  const hpRatio       = treasureHp / treasureMaxHp

  // ── Audio controls state ──────────────────────────────────────────────────
  const [muted,      setMuted]      = useState(() => audio.muted)
  const [volume,     setVolume]     = useState(() => audio.masterVolume)
  const [audioOpen,  setAudioOpen]  = useState(false)

  const handleMute = useCallback(() => {
    const nowMuted = audio.toggleMute()
    setMuted(nowMuted)
  }, [])

  const handleVolume = useCallback((e) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    audio.setMasterVolume(v)
  }, [])

  return (
    <div style={styles.hud}>
      {/* Left: wave info */}
      <div style={styles.section}>
        <span style={styles.label}>WAVE</span>
        <span style={styles.bigValue}>
          {waveIndex + 1}
          <span style={{ fontSize: '0.6em', opacity: 0.55, fontWeight: 400 }}>
            {' '}/ {WAVE_CONFIGS.length}
          </span>
        </span>
        {waveConfig && (
          <span style={styles.waveLabel}>{waveConfig.label}</span>
        )}
        {/* Difficulty badge */}
        <span style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '0.52rem',
          letterSpacing: '0.1em',
          color: diff.color,
          border: `1px solid ${diff.borderColor}`,
          borderRadius: 3,
          padding: '1px 5px',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {diff.emoji} {diff.label}
        </span>
      </div>

      {/* Center: treasure HP */}
      <div style={{ ...styles.section, flexDirection: 'column', gap: '0.2rem', flex: 2 }}>
        <div style={styles.treasureHeader}>
          <span style={styles.label}>★ TREASURE</span>
          <span style={{ ...styles.label, color: hpRatio < 0.3 ? '#8b1a1a' : 'var(--gold-dim)' }}>
            {Math.ceil(treasureHp)} / {treasureMaxHp}
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

      {/* Right: gold, war chest & kills */}
      <div style={styles.section}>

        {/* Gold — planning budget (dimmed during wave since it can't be spent) */}
        <div style={styles.statPair}>
          <span style={styles.label}>
            {phase === PHASE.WAVE ? 'NEXT WAVE' : 'GOLD'}
          </span>
          <span style={{
            ...styles.bigValue,
            color: phase === PHASE.WAVE ? 'var(--text-muted)' : 'var(--gold-bright)',
            fontSize: phase === PHASE.WAVE ? '0.85rem' : '1.1rem',
            transition: 'color 0.3s, font-size 0.3s',
          }}>
            {gold}g
          </span>
        </div>

        <div style={styles.statDivider} />

        {/* War Chest — always shown; prominent amber glow during wave (spendable now) */}
        <div style={{
          ...styles.statPair,
          padding: phase === PHASE.WAVE ? '0.2rem 0.5rem' : '0',
          background: phase === PHASE.WAVE ? 'rgba(180,100,20,0.15)' : 'transparent',
          borderRadius: 5,
          border: phase === PHASE.WAVE ? '1px solid rgba(232,160,48,0.3)' : '1px solid transparent',
          transition: 'all 0.3s',
        }}>
          <span style={{
            ...styles.label,
            color: phase === PHASE.WAVE ? '#e8a030' : 'var(--text-muted)',
          }}>
            ⚔ WAR CHEST
          </span>
          <span style={{
            ...styles.bigValue,
            color: phase === PHASE.WAVE ? '#f0c060' : 'var(--text-secondary)',
            fontSize: phase === PHASE.WAVE ? '1.1rem' : '0.9rem',
            textShadow: phase === PHASE.WAVE ? '0 0 10px rgba(240,192,96,0.4)' : 'none',
            transition: 'all 0.3s',
          }}>
            {bank}g
          </span>
        </div>

        <div style={styles.statDivider} />

        <div style={styles.statPair}>
          <span style={styles.label}>SLAIN</span>
          <span style={{ ...styles.bigValue, color: 'var(--bone)' }}>{heroesKilled}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={styles.actions}>
        {phase === PHASE.PLAN && (
          <button style={styles.btnPrimary} onClick={startWave}>
            ⚔ Send Them In
          </button>
        )}
        {phase === PHASE.WAVE && (
          <div style={styles.waveIndicator}>
            <span style={styles.wavePulse}>⚡</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: "'Cinzel', serif" }}>
              WAVE IN PROGRESS
            </span>
          </div>
        )}
        {/* Audio controls */}
        <div style={{ position: 'relative' }}>
          <button
            style={styles.menuBtn}
            onClick={() => setAudioOpen(o => !o)}
            title="Audio settings"
          >
            {muted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
          </button>
          {audioOpen && (
            <div style={styles.audioPanel}>
              <div style={styles.audioPanelRow}>
                <button
                  style={{ ...styles.muteBtn, color: muted ? '#8b1a1a' : 'var(--gold-dim)' }}
                  onClick={handleMute}
                >
                  {muted ? '🔇 Muted' : '🔊 On'}
                </button>
              </div>
              <div style={styles.audioPanelRow}>
                <span style={styles.audioLabel}>Volume</span>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={volume}
                  onChange={handleVolume}
                  style={styles.slider}
                />
              </div>
            </div>
          )}
        </div>

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
  statDivider: {
    width: 1,
    height: 28,
    background: 'rgba(255,255,255,0.07)',
    flexShrink: 0,
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
  audioPanel: {
    position: 'absolute',
    bottom: '110%',
    right: 0,
    background: '#0d0b0e',
    border: '1px solid rgba(232,196,74,0.2)',
    borderRadius: 6,
    padding: '0.6rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    minWidth: 160,
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  audioPanelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  audioLabel: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.58rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  },
  muteBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4,
    padding: '0.25rem 0.5rem',
    fontSize: '0.72rem',
    fontFamily: "'Cinzel', serif",
    cursor: 'pointer',
    width: '100%',
    letterSpacing: '0.05em',
  },
  slider: {
    flex: 1,
    accentColor: 'var(--gold-mid)',
    cursor: 'pointer',
  },
}

// Pulse keyframe
const styleEl = document.createElement('style')
styleEl.textContent = `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`
document.head.appendChild(styleEl)
