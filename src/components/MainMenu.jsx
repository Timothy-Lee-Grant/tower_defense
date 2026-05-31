import React, { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'

const CONSULTANT_QUIPS = [
  '"Your spike trap placement last session lacked synergy. I\'ve filed a report."',
  '"The heroes returned. Again. I\'ve scheduled a performance review."',
  '"Three knights defeated in room two. Recommend investing in ambush diversity."',
  '"Your Wraith called in sick. I\'ve arranged temporary slime coverage."',
  '"Q3 villain metrics are down. Have you considered more boulders?"',
]

export default function MainMenu() {
  const startGame = useGameStore(s => s.startGame)
  const [quip] = useState(() => CONSULTANT_QUIPS[Math.floor(Math.random() * CONSULTANT_QUIPS.length)])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={styles.root}>
      {/* Animated background particles */}
      <div style={styles.particles}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{ ...styles.particle, ...particleStyle(i) }} />
        ))}
      </div>

      <div style={{ ...styles.content, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s ease' }}>
        {/* Title block */}
        <div style={styles.titleBlock}>
          <div style={styles.ornament}>⚔ ✦ ⚔</div>
          <h1 style={styles.title}>Dungeon</h1>
          <h1 style={styles.titleSub}>Architect</h1>
          <div style={styles.ornament}>⚔ ✦ ⚔</div>
        </div>

        {/* Consultant memo */}
        <div style={styles.memo}>
          <div style={styles.memoHeader}>
            💀 Memo from Gerald, Your Management Consultant Skeleton
          </div>
          <p style={styles.memoText}>{quip}</p>
        </div>

        {/* Buttons */}
        <div style={styles.buttonGroup}>
          <button style={styles.primaryBtn} onClick={startGame}>
            ⚔ Begin Campaign
          </button>
          <button style={styles.secondaryBtn} onClick={startGame}>
            🏛 Sandbox Mode
          </button>
        </div>

        {/* Subtitle */}
        <p style={styles.tagline}>
          Place your traps. Command your monsters. Stop the heroes.<br />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
            They think this will be easy. They are wrong.
          </span>
        </p>
      </div>
    </div>
  )
}

function particleStyle(i) {
  const size = 2 + (i % 4)
  const left = (i * 5.3 + 7) % 100
  const delay = (i * 0.37) % 4
  const duration = 4 + (i % 5)
  return {
    width: size,
    height: size,
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    opacity: 0.2 + (i % 5) * 0.08,
  }
}

const styles = {
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 40%, #1e1428 0%, #0d0b0e 70%)',
    position: 'relative',
    overflow: 'hidden',
  },
  particles: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    bottom: '-10px',
    borderRadius: '50%',
    background: 'var(--gold-dim)',
    animation: 'floatUp 5s ease-in infinite',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2rem',
    padding: '2rem',
    maxWidth: 560,
    textAlign: 'center',
    zIndex: 1,
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  ornament: {
    color: 'var(--gold-dim)',
    fontSize: '0.9rem',
    letterSpacing: '0.5em',
  },
  title: {
    fontFamily: "'Cinzel', serif",
    fontSize: 'clamp(3rem, 8vw, 5.5rem)',
    fontWeight: 700,
    color: 'var(--gold-bright)',
    lineHeight: 1,
    textShadow: '0 0 40px rgba(232,196,74,0.3)',
    letterSpacing: '0.05em',
  },
  titleSub: {
    fontFamily: "'Cinzel', serif",
    fontSize: 'clamp(1.4rem, 4vw, 2.2rem)',
    fontWeight: 400,
    color: 'var(--bone)',
    lineHeight: 1,
    letterSpacing: '0.4em',
    textTransform: 'uppercase',
  },
  memo: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(232,196,74,0.15)',
    borderRadius: 8,
    padding: '1rem 1.5rem',
    maxWidth: 440,
  },
  memoHeader: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.7rem',
    color: 'var(--gold-dim)',
    letterSpacing: '0.1em',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
  },
  memoText: {
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    color: 'var(--bone)',
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryBtn: {
    background: 'var(--gold-mid)',
    color: 'var(--stone-darkest)',
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    fontFamily: "'Cinzel', serif",
    fontWeight: 700,
    borderRadius: 6,
    border: 'none',
    letterSpacing: '0.05em',
    boxShadow: '0 4px 20px rgba(232,196,74,0.2)',
  },
  secondaryBtn: {
    background: 'transparent',
    color: 'var(--bone)',
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    fontFamily: "'Cinzel', serif",
    border: '1px solid rgba(200,184,154,0.3)',
    borderRadius: 6,
    letterSpacing: '0.05em',
  },
  tagline: {
    fontFamily: "'Crimson Text', serif",
    fontSize: '1.05rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
  },
}

// Inject keyframe animation
const styleEl = document.createElement('style')
styleEl.textContent = `
  @keyframes floatUp {
    0%   { transform: translateY(0) scale(1); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 0.6; }
    100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
  }
`
document.head.appendChild(styleEl)
