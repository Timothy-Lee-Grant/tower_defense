import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { TREASURE_MAX_HP } from '../game/constants.js'

export default function ResultsScreen() {
  const waveIndex          = useGameStore(s => s.waveIndex)
  const heroesKilled       = useGameStore(s => s.heroesKilled)
  const heroesEscaped      = useGameStore(s => s.heroesEscaped)
  const goldEarnedThisWave = useGameStore(s => s.goldEarnedThisWave)
  const treasureHp         = useGameStore(s => s.treasureHp)
  const upgradeCards       = useGameStore(s => s.upgradeCards)
  const bank               = useGameStore(s => s.bank)
  const pickUpgradeCard    = useGameStore(s => s.pickUpgradeCard)

  const [picked, setPicked] = useState(false)

  const hpRatio = treasureHp / TREASURE_MAX_HP
  const survived = treasureHp > 0

  const handlePick = (card) => {
    if (picked) return
    setPicked(true)
    setTimeout(() => pickUpgradeCard(card), 600)
  }

  return (
    <div style={styles.root}>
      <div style={styles.panel}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.ornament}>— ✦ —</div>
          <h2 style={styles.title}>
            {survived ? '⚔ Wave Repelled' : '💀 The Treasure Falls'}
          </h2>
          <p style={styles.subtitle}>
            Wave {waveIndex} complete. Gerald has reviewed your performance.
          </p>
          <div style={styles.ornament}>— ✦ —</div>
        </div>

        {/* Stats row */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{heroesKilled}</div>
            <div style={styles.statLabel}>Heroes Slain</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: heroesEscaped > 0 ? '#8b1a1a' : 'var(--gold-bright)' }}>
              {heroesEscaped}
            </div>
            <div style={styles.statLabel}>Escaped</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: 'var(--gold-bright)' }}>+{goldEarnedThisWave}g</div>
            <div style={styles.statLabel}>Gold Earned</div>
          </div>
          <div style={styles.statCard}>
            <div style={{
              ...styles.statValue,
              color: hpRatio > 0.6 ? 'var(--gold-bright)' : hpRatio > 0.3 ? '#c4430a' : '#8b1a1a',
            }}>
              {Math.ceil(treasureHp)}
            </div>
            <div style={styles.statLabel}>Treasure HP</div>
          </div>
        </div>

        {/* Gerald memo */}
        <div style={styles.memo}>
          <span style={styles.memoFrom}>Memo from Gerald, Dungeon Operations</span>
          <p style={styles.memoText}>
            {heroesKilled === 0
              ? '"Zero kills recorded. I\'ve arranged remedial trap placement training for Tuesday."'
              : heroesEscaped === 0
              ? '"Perfect defense. I\'ve forwarded your performance to the Dark Lord Board of Directors."'
              : heroesEscaped > 2
              ? `"${heroesEscaped} heroes reached the treasure. This is concerning. I\'ve filed a formal incident report."`
              : '"Adequate performance. Some heroes escaped, but the quarterly average remains acceptable."'}
          </p>
        </div>

        {/* Upgrade cards */}
        {!picked && upgradeCards.length > 0 && (
          <div style={styles.upgradeSection}>
            <div style={styles.upgradeHeader}>⚗ Choose Your Upgrade</div>
            <p style={styles.upgradeSubtitle}>Select one to bring into the next wave</p>
            <div style={styles.cards}>
              {upgradeCards.map((card, i) => (
                <button
                  key={i}
                  style={styles.card}
                  onClick={() => handlePick(card)}
                >
                  <div style={styles.cardEmoji}>
                    {card.type === 'unlock' ? card.tool.emoji : '💰'}
                  </div>
                  <div style={styles.cardName}>
                    {card.type === 'unlock' ? card.tool.label : `+${card.amount} Gold`}
                  </div>
                  {card.type === 'unlock' && (
                    <>
                      <div style={styles.cardTier}>Tier {card.tool.tier} • {card.tool.category}</div>
                      <p style={styles.cardDesc}>{card.tool.description}</p>
                    </>
                  )}
                  {card.type === 'gold' && (
                    <p style={styles.cardDesc}>Added directly to your gold reserve.</p>
                  )}
                  <div style={styles.cardPickBtn}>Select →</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {picked && (
          <div style={styles.nextWaveMsg}>
            <span style={styles.nextWaveText}>Preparing next wave...</span>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 30%, #1a1228 0%, #0d0b0e 70%)',
    padding: '2rem',
    overflowY: 'auto',
  },
  panel: {
    maxWidth: 800,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
  },
  ornament: {
    color: 'var(--gold-dim)',
    letterSpacing: '0.5em',
    fontSize: '0.8rem',
  },
  title: {
    fontFamily: "'Cinzel', serif",
    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
    fontWeight: 700,
    color: 'var(--gold-bright)',
    margin: '0.25rem 0',
  },
  subtitle: {
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    color: 'var(--text-secondary)',
    fontSize: '1rem',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.75rem',
  },
  statCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(232,196,74,0.12)',
    borderRadius: 8,
    padding: '1rem',
    textAlign: 'center',
  },
  statValue: {
    fontFamily: "'Cinzel', serif",
    fontSize: '1.8rem',
    fontWeight: 700,
    color: 'var(--bone)',
    lineHeight: 1,
  },
  statLabel: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.6rem',
    letterSpacing: '0.12em',
    color: 'var(--text-muted)',
    marginTop: '0.3rem',
    textTransform: 'uppercase',
  },
  memo: {
    background: 'rgba(232,196,74,0.04)',
    border: '1px solid rgba(232,196,74,0.12)',
    borderRadius: 8,
    padding: '1rem 1.25rem',
  },
  memoFrom: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.6rem',
    letterSpacing: '0.1em',
    color: 'var(--gold-dim)',
    display: 'block',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
  },
  memoText: {
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    color: 'var(--bone)',
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  upgradeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  upgradeHeader: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.9rem',
    color: 'var(--gold-bright)',
    letterSpacing: '0.1em',
    textAlign: 'center',
  },
  upgradeSubtitle: {
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    color: 'var(--text-muted)',
    textAlign: 'center',
    fontSize: '0.9rem',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(232,196,74,0.15)',
    borderRadius: 10,
    padding: '1.25rem 1rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    color: 'var(--text-primary)',
  },
  cardEmoji: {
    fontSize: '2rem',
    marginBottom: '0.25rem',
  },
  cardName: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.8rem',
    color: 'var(--gold-bright)',
    fontWeight: 600,
  },
  cardTier: {
    fontFamily: "'Cinzel', serif",
    fontSize: '0.55rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  cardDesc: {
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    flex: 1,
  },
  cardPickBtn: {
    marginTop: '0.5rem',
    fontFamily: "'Cinzel', serif",
    fontSize: '0.65rem',
    color: 'var(--gold-dim)',
    letterSpacing: '0.05em',
  },
  nextWaveMsg: {
    textAlign: 'center',
    padding: '2rem',
  },
  nextWaveText: {
    fontFamily: "'Crimson Text', serif",
    fontStyle: 'italic',
    fontSize: '1.1rem',
    color: 'var(--text-secondary)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
}
