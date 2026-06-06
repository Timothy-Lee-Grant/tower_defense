// ── Global Event Overlay ───────────────────────────────────────────────────
// Dramatic wave-start announcement for the Global Events system (Feature #10).
// Shown for ~3.5 seconds over the dungeon grid when a wave has an active event.
// Fades in on mount, fades out before dismissal.

import React, { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { CATEGORY_META } from '../game/globalEvents.js'

export default function GlobalEventOverlay() {
  const event   = useGameStore(s => s.activeGlobalEvent)
  const visible = useGameStore(s => s.showEventOverlay)
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    if (visible) {
      // Fade in
      const t = setTimeout(() => setOpacity(1), 20)
      return () => clearTimeout(t)
    } else {
      // Fade out
      setOpacity(0)
    }
  }, [visible])

  if (!event || (!visible && opacity === 0)) return null

  const catMeta = CATEGORY_META[event.category] ?? { label: 'EVENT', color: '#c8a048' }

  return (
    <div style={{ ...styles.backdrop, opacity, pointerEvents: visible ? 'none' : 'none' }}>
      <div style={{ ...styles.card, borderColor: event.color + '66', background: event.bgColor }}>

        {/* Category badge */}
        <div style={{ ...styles.badge, color: catMeta.color, borderColor: catMeta.color + '55' }}>
          {catMeta.label}
        </div>

        {/* Emoji + title */}
        <div style={styles.titleRow}>
          <span style={styles.emoji}>{event.emoji}</span>
          <h2 style={{ ...styles.title, color: event.color }}>{event.name}</h2>
        </div>

        {/* Description */}
        <p style={styles.description}>{event.description}</p>

        {/* Gerald's line — offset in a smaller memo box */}
        <div style={{ ...styles.geraldBox, borderColor: event.color + '33' }}>
          <span style={styles.geraldName}>💀 Gerald</span>
          <p style={styles.geraldText}>{event.geraldLine}</p>
        </div>

      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    position:       'absolute',
    inset:          0,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         100,
    background:     'rgba(0,0,0,0.6)',
    transition:     'opacity 0.4s ease',
    pointerEvents:  'none',
  },
  card: {
    maxWidth:     420,
    width:        '90%',
    border:       '1px solid',
    borderRadius: 10,
    padding:      '20px 22px 18px',
    boxShadow:    '0 8px 40px rgba(0,0,0,0.9)',
    backdropFilter: 'blur(2px)',
  },
  badge: {
    fontFamily:    "'Cinzel', serif",
    fontSize:      '0.55rem',
    letterSpacing: '0.2em',
    border:        '1px solid',
    borderRadius:  3,
    padding:       '2px 8px',
    display:       'inline-block',
    marginBottom:  12,
  },
  titleRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        12,
    marginBottom: 10,
  },
  emoji: {
    fontSize:   '2.4rem',
    lineHeight: 1,
  },
  title: {
    fontFamily:  "'Cinzel', serif",
    fontSize:    '1.25rem',
    fontWeight:  700,
    margin:      0,
    letterSpacing: '0.04em',
  },
  description: {
    fontFamily:  "'Crimson Text', serif",
    fontSize:    '1rem',
    color:       '#d0c8c0',
    lineHeight:  1.5,
    margin:      '0 0 14px',
  },
  geraldBox: {
    background:   'rgba(0,0,0,0.35)',
    border:       '1px solid',
    borderRadius: 5,
    padding:      '8px 12px',
  },
  geraldName: {
    fontFamily:   "'Cinzel', serif",
    fontSize:     '0.55rem',
    color:        '#c8a048',
    letterSpacing: '0.12em',
    display:      'block',
    marginBottom: 4,
  },
  geraldText: {
    fontFamily:  "'Crimson Text', serif",
    fontStyle:   'italic',
    fontSize:    '0.82rem',
    color:       '#a89880',
    lineHeight:  1.5,
    margin:      0,
  },
}
