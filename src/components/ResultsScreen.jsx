import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { TREASURE_MAX_HP } from '../game/constants.js'
import { selectResultsComment } from '../game/gerald.js'

export default function ResultsScreen() {
  const waveIndex             = useGameStore(s => s.waveIndex)
  const heroesKilled          = useGameStore(s => s.heroesKilled)
  const heroesEscapedWithGold = useGameStore(s => s.heroesEscapedWithGold)
  const goldEarnedThisWave    = useGameStore(s => s.goldEarnedThisWave)
  const goldStolenThisWave    = useGameStore(s => s.goldStolenThisWave)
  const treasureHp            = useGameStore(s => s.treasureHp)
  const upgradeCards          = useGameStore(s => s.upgradeCards)
  const pickUpgradeCard       = useGameStore(s => s.pickUpgradeCard)

  const [picked, setPicked] = useState(false)

  const hpRatio   = treasureHp / TREASURE_MAX_HP
  const perfect   = heroesEscapedWithGold === 0
  const lostHoard = treasureHp <= 0

  const treasureMaxHp = useGameStore(s => s.treasureMaxHp)

  const geraldMemo = selectResultsComment({
    heroesKilled,
    heroesEscapedWithGold,
    goldStolenThisWave,
    treasureHp,
    treasureMaxHp,
    waveIndex,
  })

  const handlePick = (card) => {
    if (picked) return
    setPicked(true)
    setTimeout(() => pickUpgradeCard(card), 600)
  }

  return (
    <div style={s.root}>
      <div style={s.panel}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.ornament}>— ✦ —</div>
          <h2 style={s.title}>
            {lostHoard ? '💀 The Hoard is Lost'
              : perfect ? '⚔ Dungeon Held'
              : '⚠ Partial Breach'}
          </h2>
          <p style={s.subtitle}>Wave {waveIndex} complete. Gerald has reviewed your performance.</p>
          <div style={s.ornament}>— ✦ —</div>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          <StatCard value={heroesKilled} label="Heroes Slain" />
          <StatCard
            value={heroesEscapedWithGold}
            label="Escaped With Gold"
            color={heroesEscapedWithGold > 0 ? '#8b1a1a' : 'var(--gold-bright)'}
          />
          <StatCard
            value={`+${goldEarnedThisWave}g`}
            label="Gold Earned"
            color="var(--gold-bright)"
          />
          <StatCard
            value={Math.ceil(treasureHp)}
            label="Treasure HP"
            color={hpRatio > 0.6 ? 'var(--gold-bright)' : hpRatio > 0.3 ? '#c4430a' : '#8b1a1a'}
          />
        </div>

        {/* Gold stolen bar */}
        {goldStolenThisWave > 0 && (
          <div style={s.stolenRow}>
            <span style={s.stolenLabel}>Gold stolen this wave</span>
            <div style={s.stolenBar}>
              <div style={{
                ...s.stolenFill,
                width: `${Math.min(100, (goldStolenThisWave / TREASURE_MAX_HP) * 100).toFixed(1)}%`,
              }} />
            </div>
            <span style={s.stolenAmount}>{goldStolenThisWave} HP</span>
          </div>
        )}

        {/* Gerald memo */}
        <div style={s.memo}>
          <span style={s.memoFrom}>Memo from Gerald, Dungeon Operations</span>
          <p style={s.memoText}>{geraldMemo}</p>
        </div>

        {/* Upgrade cards */}
        {!picked && upgradeCards.length > 0 && (
          <div style={s.upgradeSection}>
            <div style={s.upgradeHeader}>⚗ Choose Your Upgrade</div>
            <p style={s.upgradeSubtitle}>One new capability for the next wave</p>
            <div style={s.cards}>
              {upgradeCards.map((card, i) => (
                <button key={i} style={s.card} onClick={() => handlePick(card)}>
                  <div style={s.cardEmoji}>{card.type === 'unlock' ? card.tool.emoji : '💰'}</div>
                  <div style={s.cardName}>
                    {card.type === 'unlock' ? card.tool.label : `+${card.amount} Gold`}
                  </div>
                  {card.type === 'unlock' && <>
                    <div style={s.cardMeta}>
                      {card.tool.placesOn === 'path' ? '📍 On-path' : '🏹 Tower'} · Tier {card.tool.tier}
                    </div>
                    <p style={s.cardDesc}>{card.tool.description}</p>
                  </>}
                  {card.type === 'gold' && (
                    <p style={s.cardDesc}>Deposited directly to your gold reserve.</p>
                  )}
                  <div style={s.cardPickBtn}>Select →</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {picked && (
          <div style={s.nextWaveMsg}>
            <span style={s.nextWaveText}>Preparing next wave...</span>
          </div>
        )}
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
  panel: { maxWidth: 820, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.4rem' },
  header: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' },
  ornament: { color: 'var(--gold-dim)', letterSpacing: '0.5em', fontSize: '0.8rem' },
  title: {
    fontFamily: "'Cinzel', serif", fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)',
    fontWeight: 700, color: 'var(--gold-bright)', margin: '0.25rem 0',
  },
  subtitle: { fontFamily: "'Crimson Text', serif", fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '1rem' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' },
  statCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(232,196,74,0.12)',
    borderRadius: 8, padding: '1rem', textAlign: 'center',
  },
  statValue: { fontFamily: "'Cinzel', serif", fontSize: '1.7rem', fontWeight: 700, color: 'var(--bone)', lineHeight: 1 },
  statLabel: {
    fontFamily: "'Cinzel', serif", fontSize: '0.58rem',
    letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: '0.3rem', textTransform: 'uppercase',
  },
  stolenRow: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    background: 'rgba(139,26,26,0.08)', border: '1px solid rgba(139,26,26,0.2)',
    borderRadius: 8, padding: '0.6rem 1rem',
  },
  stolenLabel: { fontFamily: "'Cinzel', serif", fontSize: '0.6rem', color: '#8b1a1a', letterSpacing: '0.08em', whiteSpace: 'nowrap' },
  stolenBar: { flex: 1, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  stolenFill: { height: '100%', background: '#8b1a1a', borderRadius: 3 },
  stolenAmount: { fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: '#8b1a1a', whiteSpace: 'nowrap' },
  memo: {
    background: 'rgba(232,196,74,0.04)',
    border: '1px solid rgba(232,196,74,0.12)',
    borderRadius: 8, padding: '1rem 1.25rem',
  },
  memoFrom: {
    fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.1em',
    color: 'var(--gold-dim)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase',
  },
  memoText: { fontFamily: "'Crimson Text', serif", fontStyle: 'italic', color: 'var(--bone)', fontSize: '1rem', lineHeight: 1.6 },
  upgradeSection: { display: 'flex', flexDirection: 'column', gap: '0.7rem' },
  upgradeHeader: { fontFamily: "'Cinzel', serif", fontSize: '0.9rem', color: 'var(--gold-bright)', letterSpacing: '0.1em', textAlign: 'center' },
  upgradeSubtitle: { fontFamily: "'Crimson Text', serif", fontStyle: 'italic', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' },
  card: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,196,74,0.15)',
    borderRadius: 10, padding: '1.2rem 1rem', textAlign: 'center', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
    color: 'var(--text-primary)',
  },
  cardEmoji: { fontSize: '2rem', marginBottom: '0.2rem' },
  cardName: { fontFamily: "'Cinzel', serif", fontSize: '0.78rem', color: 'var(--gold-bright)', fontWeight: 600 },
  cardMeta: { fontFamily: "'Cinzel', serif", fontSize: '0.52rem', color: 'var(--text-muted)', letterSpacing: '0.08em' },
  cardDesc: { fontFamily: "'Crimson Text', serif", fontStyle: 'italic', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1 },
  cardPickBtn: { marginTop: '0.4rem', fontFamily: "'Cinzel', serif", fontSize: '0.62rem', color: 'var(--gold-dim)', letterSpacing: '0.05em' },
  nextWaveMsg: { textAlign: 'center', padding: '2rem' },
  nextWaveText: { fontFamily: "'Crimson Text', serif", fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text-secondary)' },
}
