import React, { useState, useEffect } from 'react'
import { useGameStore, PHASE } from '../store/gameStore.js'

const TUTORIAL_KEY = 'dungeon_tutorial_done'

const STEPS = [
  {
    id: 'place',
    title: 'Place Your First Trap',
    body: 'Click any tool in the left panel to select it, then click a path tile (brown square) to place it on the dungeon floor.',
    hint: 'Try placing a Spike Plate — it\'s cheap and effective.',
    arrow: 'left',
  },
  {
    id: 'sell',
    title: 'Right-Click to Upgrade or Sell',
    body: 'Right-click any tile you\'ve placed to open the upgrade panel. You can upgrade it with bank gold or sell it for a 50% refund.',
    hint: 'Upgrades change behaviour, not just stats — Tier 3 units are completely different.',
    arrow: 'left',
  },
  {
    id: 'range',
    title: 'Range Previews',
    body: 'Hover over a tower in the left panel and then hover over the grid. You\'ll see a gold ring showing exactly which tiles it can reach.',
    hint: 'Towers fire at the closest hero in range. Overlap ranges to hit heroes multiple times.',
    arrow: 'left',
  },
  {
    id: 'start',
    title: 'Send Them In',
    body: 'When your defenses are ready, click the ⚔ Send Them In button at the top right. The wave begins immediately.',
    hint: 'You can still place tiles during a wave — but it costs from your War Chest at 1.5× price.',
    arrow: 'top',
  },
  {
    id: 'log',
    title: 'Watch the Battle Log',
    body: 'The right panel shows every hero\'s HP, status effects, and how far they are from the treasure. The battle log records what happened.',
    hint: 'Gerald will comment on your performance. He is not impressed easily.',
    arrow: 'right',
  },
]

// Check if tutorial should be shown (no prior completion + first play)
function shouldShowTutorial() {
  try {
    return !localStorage.getItem(TUTORIAL_KEY)
  } catch {
    return false
  }
}

function markTutorialDone() {
  try { localStorage.setItem(TUTORIAL_KEY, '1') } catch {}
}

export default function Tutorial() {
  const phase = useGameStore(s => s.phase)
  const [step, setStep]       = useState(0)
  const [visible, setVisible] = useState(false)

  // Only show during PLAN phase, and only for new players
  useEffect(() => {
    if (phase === PHASE.PLAN && shouldShowTutorial()) {
      setVisible(true)
      setStep(0)
    }
  }, [phase])

  // Advance to next step or close
  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      markTutorialDone()
      setVisible(false)
    }
  }

  const handleSkip = () => {
    markTutorialDone()
    setVisible(false)
  }

  if (!visible) return null

  const current = STEPS[step]

  return (
    <div style={s.overlay} onClick={(e) => e.stopPropagation()}>
      <div style={s.card}>
        {/* Progress dots */}
        <div style={s.dots}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{ ...s.dot, ...(i === step ? s.dotActive : i < step ? s.dotDone : {}) }}
            />
          ))}
        </div>

        {/* Step header */}
        <div style={s.stepLabel}>Step {step + 1} of {STEPS.length}</div>
        <h3 style={s.title}>{current.title}</h3>
        <p style={s.body}>{current.body}</p>

        {current.hint && (
          <div style={s.hintBox}>
            <span style={s.hintIcon}>💡</span>
            <p style={s.hintText}>{current.hint}</p>
          </div>
        )}

        {/* Actions */}
        <div style={s.actions}>
          <button style={s.skipBtn} onClick={handleSkip}>
            Skip tutorial
          </button>
          <button style={s.nextBtn} onClick={handleNext}>
            {step < STEPS.length - 1 ? 'Next →' : 'Got it ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'absolute',
    bottom: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 300,
    pointerEvents: 'all',
  },
  card: {
    background: 'rgba(10,8,18,0.97)',
    border: '1px solid rgba(232,196,74,0.35)',
    borderRadius: 10,
    padding: '1.1rem 1.3rem',
    minWidth: 320, maxWidth: 420,
    boxShadow: '0 6px 30px rgba(0,0,0,0.75)',
    display: 'flex', flexDirection: 'column', gap: '0.55rem',
  },
  dots: {
    display: 'flex', gap: '0.35rem', justifyContent: 'center',
  },
  dot: {
    width: 7, height: 7, borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    transition: 'all 0.2s',
  },
  dotActive: {
    background: 'var(--gold-bright)',
    transform: 'scale(1.3)',
  },
  dotDone: {
    background: 'rgba(232,196,74,0.4)',
  },
  stepLabel: {
    fontFamily: "'Cinzel', serif", fontSize: '0.52rem',
    letterSpacing: '0.12em', color: 'var(--text-muted)',
    textAlign: 'center', textTransform: 'uppercase',
  },
  title: {
    fontFamily: "'Cinzel', serif", fontSize: '0.95rem',
    color: 'var(--gold-bright)', fontWeight: 700,
    margin: 0, textAlign: 'center',
    letterSpacing: '0.04em',
  },
  body: {
    fontFamily: "'Crimson Text', serif",
    fontSize: '0.9rem', color: 'var(--bone)',
    lineHeight: 1.55, margin: 0, textAlign: 'center',
  },
  hintBox: {
    display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
    background: 'rgba(232,196,74,0.07)',
    border: '1px solid rgba(232,196,74,0.15)',
    borderRadius: 6, padding: '0.5rem 0.7rem',
  },
  hintIcon: { fontSize: '0.85rem', flexShrink: 0, marginTop: '1px' },
  hintText: {
    fontFamily: "'Crimson Text', serif", fontStyle: 'italic',
    fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0,
  },
  actions: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: '0.25rem',
  },
  skipBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontFamily: "'Cinzel', serif",
    fontSize: '0.62rem',
    cursor: 'pointer',
    letterSpacing: '0.04em',
    padding: '0.3rem 0.1rem',
  },
  nextBtn: {
    background: 'var(--gold-mid)',
    color: '#0d0b0e',
    border: 'none',
    borderRadius: 5,
    padding: '0.45rem 1rem',
    fontSize: '0.78rem',
    fontFamily: "'Cinzel', serif",
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.03em',
  },
}
