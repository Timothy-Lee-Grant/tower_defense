import React from 'react'
import { useGameStore } from '../store/gameStore.js'
import { WAVE_CONFIGS } from '../game/constants.js'
import { selectVictoryComment } from '../game/gerald.js'

export default function VictoryScreen() {
  const heroesKilled  = useGameStore(s => s.heroesKilled)
  const bank          = useGameStore(s => s.bank)
  const treasureHp    = useGameStore(s => s.treasureHp)
  const treasureMaxHp = useGameStore(s => s.treasureMaxHp)
  const goToMenu      = useGameStore(s => s.goToMenu)

  return (
    <div style={s.root}>
      <div style={s.panel}>

        <div style={s.header}>
          <div style={s.ornament}>— ✦ —</div>
          <h1 style={s.title}>⚜ The Dungeon Stands</h1>
          <p style={s.subtitle}>
            All {WAVE_CONFIGS.length} waves repelled. Gerald is filing a very positive report.
          </p>
          <div style={s.ornament}>— ✦ —</div>
        </div>

        <div style={s.statsRow}>
          <StatCard value={WAVE_CONFIGS.length} label="Waves Survived" color="var(--gold-bright)" />
          <StatCard value={heroesKilled}         label="Heroes Slain"   color="var(--bone)" />
          <StatCard value={`${bank}g`}           label="Gold Earned"    color="var(--gold-bright)" />
        </div>

        <div style={s.memo}>
          <span style={s.memoFrom}>Final Memo from Gerald, Dungeon Operations</span>
          <p style={s.memoText}>
            {selectVictoryComment({ treasureHp, treasureMaxHp })}
          </p>
        </div>

        <button style={s.btn} onClick={goToMenu}>
          ↩ Return to Main Menu
        </button>

      </div>
    </div>
  )
}

function StatCard({ value, label, color }) {
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statValue, color: color ?? 'var(--bone)' }}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  )
}

const s = {
  root: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 30%, #1a1228 0%, #0d0b0e 70%)',
    padding: '2rem', overflowY: 'auto',
  },
  panel: {
    maxWidth: 680, width: '100%',
    display: 'flex', flexDirection: 'column', gap: '1.6rem',
    textAlign: 'center',
  },
  header: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
  },
  ornament: {
    color: 'var(--gold-dim)', letterSpacing: '0.5em', fontSize: '0.8rem',
  },
  title: {
    fontFamily: "'Cinzel', serif",
    fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
    fontWeight: 700, color: 'var(--gold-bright)', margin: '0.3rem 0',
  },
  subtitle: {
    fontFamily: "'Crimson Text', serif", fontStyle: 'italic',
    color: 'var(--text-secondary)', fontSize: '1.1rem',
  },
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem',
  },
  statCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(232,196,74,0.12)',
    borderRadius: 8, padding: '1rem', textAlign: 'center',
  },
  statValue: {
    fontFamily: "'Cinzel', serif", fontSize: '1.8rem', fontWeight: 700, lineHeight: 1,
  },
  statLabel: {
    fontFamily: "'Cinzel', serif", fontSize: '0.58rem',
    letterSpacing: '0.1em', color: 'var(--text-muted)',
    marginTop: '0.3rem', textTransform: 'uppercase',
  },
  memo: {
    background: 'rgba(232,196,74,0.04)',
    border: '1px solid rgba(232,196,74,0.12)',
    borderRadius: 8, padding: '1.2rem 1.5rem', textAlign: 'left',
  },
  memoFrom: {
    fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em',
    color: 'var(--gold-dim)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase',
  },
  memoText: {
    fontFamily: "'Crimson Text', serif", fontStyle: 'italic',
    color: 'var(--bone)', fontSize: '1rem', lineHeight: 1.7, margin: 0,
  },
  btn: {
    background: 'var(--gold-mid)', color: '#0d0b0e',
    border: 'none', borderRadius: 6,
    padding: '0.65rem 2rem',
    fontSize: '0.85rem', fontFamily: "'Cinzel', serif", fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.04em',
    boxShadow: '0 2px 16px rgba(232,196,74,0.25)',
    alignSelf: 'center',
  },
}
