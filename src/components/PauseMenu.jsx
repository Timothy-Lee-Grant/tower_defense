import React, { useCallback, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { audio } from '../audio/audioEngine.js'

export default function PauseMenu() {
  const resumeWave = useGameStore(s => s.resumeWave)
  const goToMenu   = useGameStore(s => s.goToMenu)

  const [muted,  setMuted]  = useState(() => audio.muted)
  const [volume, setVolume] = useState(() => audio.masterVolume)

  const handleResume = useCallback(() => {
    resumeWave()
  }, [resumeWave])

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
    <div style={s.overlay}>
      <div style={s.panel}>
        {/* Header */}
        <div style={s.ornament}>— ✦ —</div>
        <h2 style={s.title}>⏸ Paused</h2>
        <p style={s.subtitle}>The dungeon holds its breath.</p>
        <div style={s.ornament}>— ✦ —</div>

        {/* Actions */}
        <div style={s.actions}>
          <button style={s.btnPrimary} onClick={handleResume}>
            ▶ Resume Wave
          </button>

          {/* Volume */}
          <div style={s.volumeRow}>
            <button style={s.muteBtn} onClick={handleMute}>
              {muted ? '🔇 Muted' : '🔊 On'}
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={volume}
              onChange={handleVolume}
              style={s.slider}
              title="Master volume"
            />
          </div>

          {/* Controls reference */}
          <div style={s.controlsRef}>
            <div style={s.controlsHeader}>Controls</div>
            {[
              ['Left click', 'Place selected tool'],
              ['Right click', 'Open upgrade panel'],
              ['Esc / click Resume', 'Resume the wave'],
              ['During wave', '⚔ costs from War Chest'],
            ].map(([k, v]) => (
              <div key={k} style={s.controlRow}>
                <span style={s.controlKey}>{k}</span>
                <span style={s.controlVal}>{v}</span>
              </div>
            ))}
          </div>

          <button style={s.btnDanger} onClick={goToMenu}>
            ☰ Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(6,4,12,0.82)',
    backdropFilter: 'blur(3px)',
    zIndex: 200,
  },
  panel: {
    background: 'radial-gradient(ellipse at 50% 20%, #1a1228 0%, #0d0b0e 70%)',
    border: '1px solid rgba(232,196,74,0.2)',
    borderRadius: 10,
    padding: '2rem 2.2rem',
    minWidth: 320, maxWidth: 420,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '0.6rem',
    boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
  },
  ornament: {
    color: 'var(--gold-dim)', letterSpacing: '0.5em', fontSize: '0.75rem',
  },
  title: {
    fontFamily: "'Cinzel', serif", fontSize: '1.6rem',
    fontWeight: 700, color: 'var(--gold-bright)',
    margin: '0.15rem 0',
  },
  subtitle: {
    fontFamily: "'Crimson Text', serif", fontStyle: 'italic',
    color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0,
  },
  actions: {
    display: 'flex', flexDirection: 'column',
    gap: '0.75rem', width: '100%', marginTop: '0.5rem',
  },
  btnPrimary: {
    background: 'var(--gold-mid)',
    color: '#0d0b0e',
    border: 'none',
    borderRadius: 6,
    padding: '0.65rem 1.2rem',
    fontSize: '0.9rem',
    fontFamily: "'Cinzel', serif",
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.03em',
    boxShadow: '0 2px 12px rgba(232,196,74,0.25)',
  },
  volumeRow: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 6, padding: '0.55rem 0.75rem',
  },
  muteBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4,
    padding: '0.25rem 0.6rem',
    fontSize: '0.72rem',
    fontFamily: "'Cinzel', serif",
    color: 'var(--gold-dim)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    letterSpacing: '0.04em',
  },
  slider: {
    flex: 1, accentColor: 'var(--gold-mid)', cursor: 'pointer',
  },
  controlsRef: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 6, padding: '0.65rem 0.75rem',
    display: 'flex', flexDirection: 'column', gap: '0.35rem',
  },
  controlsHeader: {
    fontFamily: "'Cinzel', serif", fontSize: '0.55rem',
    letterSpacing: '0.12em', color: 'var(--text-muted)',
    textTransform: 'uppercase', marginBottom: '0.2rem',
  },
  controlRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem',
  },
  controlKey: {
    fontFamily: "'Cinzel', serif", fontSize: '0.6rem',
    color: 'var(--gold-dim)', letterSpacing: '0.03em', whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  controlVal: {
    fontFamily: "'Crimson Text', serif", fontSize: '0.75rem',
    color: 'var(--text-secondary)', textAlign: 'right',
  },
  btnDanger: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '0.5rem 1rem',
    fontSize: '0.75rem',
    fontFamily: "'Cinzel', serif",
    cursor: 'pointer',
    letterSpacing: '0.03em',
  },
}
