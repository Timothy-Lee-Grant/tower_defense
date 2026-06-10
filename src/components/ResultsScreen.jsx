import React, { useState } from 'react'
import { useGameStore } from '../store/gameStore.js'
import { selectResultsComment } from '../game/gerald.js'
import { WAVE_CONFIGS, DUNGEON_TOOLS, SYNERGY_PAIRS } from '../game/constants.js'
import { getAchievement } from '../game/scoring.js'
import { StatCard, GeraldMemo } from './shared/index.jsx'

export default function ResultsScreen() {
  const waveIndex             = useGameStore(s => s.waveIndex)
  const heroesKilled          = useGameStore(s => s.heroesKilled)
  const heroesEscapedWithGold = useGameStore(s => s.heroesEscapedWithGold)
  const goldEarnedThisWave    = useGameStore(s => s.goldEarnedThisWave)
  const goldStolenThisWave    = useGameStore(s => s.goldStolenThisWave)
  const treasureHp            = useGameStore(s => s.treasureHp)
  const treasureMaxHp         = useGameStore(s => s.treasureMaxHp)   // difficulty-adjusted ceiling
  const upgradeCards          = useGameStore(s => s.upgradeCards)
  const pickUpgradeCard       = useGameStore(s => s.pickUpgradeCard)
  const darkLordDemandMet         = useGameStore(s => s.darkLordDemandMet)
  const bestComboThisWave         = useGameStore(s => s.bestComboThisWave)
  const waveScore                 = useGameStore(s => s.waveScore)
  const newlyUnlockedAchievements = useGameStore(s => s.newlyUnlockedAchievements)

  // Dark Lord's demand for the wave that just completed
  const demand = WAVE_CONFIGS[waveIndex]?.darkLordDemand ?? null

  const [picked, setPicked]       = useState(false)
  const [hoveredCard, setHoveredCard] = useState(null)   // index of hovered upgrade card

  // Use the store's difficulty-adjusted max, not the hardcoded constant (spec bug 18.6)
  const hpRatio   = treasureMaxHp > 0 ? treasureHp / treasureMaxHp : 1
  const perfect   = heroesEscapedWithGold === 0
  const lostHoard = treasureHp <= 0

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
            color={heroesEscapedWithGold > 0 ? 'var(--color-hard)' : 'var(--gold-bright)'}
          />
          <StatCard
            value={`+${goldEarnedThisWave}g`}
            label="Gold Earned"
            color="var(--gold-bright)"
          />
          <StatCard
            value={Math.ceil(treasureHp)}
            label="Treasure HP"
            color={hpRatio > 0.6 ? 'var(--gold-bright)' : hpRatio > 0.3 ? 'var(--color-fire)' : 'var(--color-hard)'}
          />
        </div>

        {/* Feature 15.1: Wave score */}
        {waveScore > 0 && (
          <div style={s.scoreRow}>
            <span style={s.scoreLabel}>⭐ Wave Score</span>
            <span style={s.scoreValue}>{waveScore.toLocaleString()}</span>
          </div>
        )}

        {/* Feature 14.3: Best combo of the wave */}
        {bestComboThisWave && (
          <div style={s.bestCombo}>
            <span style={s.bestComboHeader}>⚡ Best Kill of the Wave</span>
            <p style={s.bestComboLabel}>{bestComboThisWave.label}</p>
            <p style={s.bestComboHero}>{bestComboThisWave.heroLabel}</p>
          </div>
        )}

        {/* Gold stolen bar */}
        {goldStolenThisWave > 0 && (
          <div style={s.stolenRow}>
            <span style={s.stolenLabel}>Gold stolen this wave</span>
            <div style={s.stolenBar}>
              <div style={{
                ...s.stolenFill,
                width: `${Math.min(100, treasureMaxHp > 0 ? (goldStolenThisWave / treasureMaxHp) * 100 : 0).toFixed(1)}%`,
              }} />
            </div>
            <span style={s.stolenAmount}>{goldStolenThisWave} HP</span>
          </div>
        )}

        {/* Gerald memo */}
        <GeraldMemo from="Memo from Gerald, Dungeon Operations">
          {geraldMemo}
        </GeraldMemo>

        {/* Dark Lord's Demand result */}
        {demand && darkLordDemandMet !== null && (
          <div style={{
            ...s.demandResult,
            background: darkLordDemandMet ? 'rgba(20,80,20,0.25)' : 'rgba(80,20,20,0.2)',
            borderColor: darkLordDemandMet ? 'rgba(80,180,80,0.25)' : 'rgba(180,40,40,0.25)',
          }}>
            <div style={s.demandResultHeader}>
              <span style={s.demandIcon}>🔱</span>
              <span style={s.demandLabel}>
                THE DARK LORD'S DEMAND
              </span>
              <span style={{
                ...s.demandStatus,
                color: darkLordDemandMet ? '#60c060' : '#c06060',
              }}>
                {darkLordDemandMet ? '✅ FULFILLED' : '❌ FAILED'}
              </span>
            </div>
            <p style={s.demandText}>{demand.text}</p>
            {darkLordDemandMet && (
              <p style={s.demandReward}>
                Reward unlocked: +{demand.reward.amount}g bonus upgrade option below
              </p>
            )}
          </div>
        )}

        {/* Feature 15.2: Achievement unlocks */}
        {newlyUnlockedAchievements.length > 0 && (
          <div style={s.achieveSection}>
            <div style={s.achieveHeader}>🎖 Achievement Unlocked</div>
            {newlyUnlockedAchievements.map(id => {
              const a = getAchievement(id)
              if (!a) return null
              return (
                <div key={id} style={s.achieveCard}>
                  <span style={s.achieveEmoji}>{a.emoji}</span>
                  <div style={s.achieveText}>
                    <div style={s.achieveName}>{a.name}</div>
                    <div style={s.achieveDesc}>{a.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Upgrade cards */}
        {!picked && upgradeCards.length > 0 && (
          <div style={s.upgradeSection}>
            <div style={s.upgradeHeader}>⚗ Choose Your Upgrade</div>
            <p style={s.upgradeSubtitle}>
              {upgradeCards.some(c => c.isDemandReward)
                ? 'One new capability — plus a bonus option from the Dark Lord'
                : 'One new capability for the next wave'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{
                ...s.cards,
                gridTemplateColumns: upgradeCards.length === 4 ? 'repeat(4,1fr)' : 'repeat(3,1fr)',
                flex: 1,
              }}>
                {upgradeCards.map((card, i) => (
                  <button
                    key={i}
                    style={{
                      ...s.card,
                      ...(card.isDemandReward ? s.cardDemandReward : {}),
                      ...(hoveredCard === i ? s.cardHovered : {}),
                    }}
                    onClick={() => handlePick(card)}
                    onMouseEnter={() => setHoveredCard(i)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {card.isDemandReward && (
                      <div style={s.cardDemandBadge}>🔱 Dark Lord's Reward</div>
                    )}
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

              {/* Hover preview panel */}
              {hoveredCard !== null && upgradeCards[hoveredCard]?.type === 'unlock' && (
                <CardPreview card={upgradeCards[hoveredCard]} />
              )}
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

// ── Upgrade card hover preview ────────────────────────────────────────────────
function CardPreview({ card }) {
  const tool = card.tool
  if (!tool) return null

  // Show tier label instead of wave lookup (WAVE_CONFIGS doesn't track per-tool appearances)
  const tierLabel = tool.tier === 1 ? 'Tier 1 — starter' : tool.tier === 2 ? 'Tier 2 — mid-game' : tool.tier === 3 ? 'Tier 3 — late-game' : null

  // Build synergy list
  const synergies = []
  if (SYNERGY_PAIRS[tool.id]) {
    Object.keys(SYNERGY_PAIRS[tool.id]).forEach(pid => {
      const p = DUNGEON_TOOLS.find(t => t.id === pid)
      if (p) synergies.push(p.label)
    })
  }
  Object.entries(SYNERGY_PAIRS).forEach(([oid, pairs]) => {
    if (pairs[tool.id]) {
      const p = DUNGEON_TOOLS.find(t => t.id === oid)
      if (p && !synergies.includes(p.label)) synergies.push(p.label)
    }
  })

  return (
    <div style={s.cardPreview}>
      <div style={s.cardPreviewHeader}>
        <span style={{ fontSize: '1.4rem' }}>{tool.emoji}</span>
        <div>
          <div style={s.cardPreviewName}>{tool.label}</div>
          <div style={s.cardPreviewMeta}>
            {tool.placesOn === 'path' ? '📍 On-path trap' : '🏹 Off-path tower'} · {tool.cost}g
          </div>
        </div>
      </div>

      <p style={s.cardPreviewDesc}>{tool.description}</p>

      {/* Stats */}
      {(tool.damage || tool.range || tool.attackSpeed || tool.dotDamage) && (
        <div style={s.cardPreviewStats}>
          {tool.damage      && <CPStatRow label="Damage"    val={tool.damage} />}
          {tool.range       && <CPStatRow label="Range"     val={tool.range} />}
          {tool.attackSpeed && <CPStatRow label="Speed"     val={`${(tool.attackSpeed/1000).toFixed(2)}s`} />}
          {tool.dotDamage   && <CPStatRow label="DoT HP/s"  val={tool.dotDamage} />}
          {tool.damage && tool.attackSpeed && (
            <CPStatRow label="DPS" val={(tool.damage / (tool.attackSpeed / 1000)).toFixed(1)} gold />
          )}
        </div>
      )}

      {tierLabel && (
        <div style={s.cardPreviewRow}>
          <span style={s.cardPreviewRowLabel}>Classification</span>
          <span style={s.cardPreviewRowVal}>{tierLabel}</span>
        </div>
      )}

      {synergies.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={s.cardPreviewRowLabel}>✦ Synergizes with</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
            {synergies.map(name => (
              <span key={name} style={s.cardPreviewChip}>{name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CPStatRow({ label, val, gold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={s.cardPreviewRowLabel}>{label}</span>
      <span style={{ ...s.cardPreviewRowVal, color: gold ? 'var(--gold-bright)' : 'var(--bone)' }}>{val}</span>
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
    fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.4rem, 3.5vw, 2.2rem)',
    fontWeight: 700, color: 'var(--gold-bright)', margin: '0.25rem 0',
  },
  subtitle: { fontFamily: 'var(--font-italic)', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '1rem' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' },
  // Feature 14.3: Best combo card
  bestCombo: {
    background: 'rgba(40,220,160,0.05)',
    border: '1px solid rgba(40,220,160,0.2)',
    borderRadius: 8, padding: '0.65rem 1.1rem',
    display: 'flex', flexDirection: 'column', gap: '0.15rem',
  },
  bestComboHeader: {
    fontFamily: 'var(--font-serif)', fontSize: '0.56rem',
    letterSpacing: '0.1em', color: 'rgba(60,255,180,0.7)',
    textTransform: 'uppercase',
  },
  bestComboLabel: {
    fontFamily: 'var(--font-italic)', fontStyle: 'italic',
    fontSize: '0.95rem', color: 'var(--bone)', margin: 0, lineHeight: 1.4,
  },
  bestComboHero: {
    fontFamily: 'var(--font-serif)', fontSize: '0.6rem',
    color: 'rgba(60,255,180,0.55)', letterSpacing: '0.06em', margin: 0,
  },

  stolenRow: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    background: 'rgba(139,26,26,0.08)', border: '1px solid rgba(139,26,26,0.2)',
    borderRadius: 8, padding: '0.6rem 1rem',
  },
  stolenLabel: { fontFamily: 'var(--font-serif)', fontSize: '0.6rem', color: 'var(--color-hard)', letterSpacing: '0.08em', whiteSpace: 'nowrap' },
  stolenBar: { flex: 1, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' },
  stolenFill: { height: '100%', background: 'var(--color-hard)', borderRadius: 3 },
  stolenAmount: { fontFamily: 'var(--font-serif)', fontSize: '0.65rem', color: 'var(--color-hard)', whiteSpace: 'nowrap' },
  upgradeSection: { display: 'flex', flexDirection: 'column', gap: '0.7rem' },
  upgradeHeader: { fontFamily: 'var(--font-serif)', fontSize: '0.9rem', color: 'var(--gold-bright)', letterSpacing: '0.1em', textAlign: 'center' },
  upgradeSubtitle: { fontFamily: 'var(--font-italic)', fontStyle: 'italic', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' },
  card: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,196,74,0.15)',
    borderRadius: 10, padding: '1.2rem 1rem', textAlign: 'center', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
    color: 'var(--text-primary)',
  },
  cardEmoji: { fontSize: '2rem', marginBottom: '0.2rem' },
  cardName: { fontFamily: 'var(--font-serif)', fontSize: '0.78rem', color: 'var(--gold-bright)', fontWeight: 600 },
  cardMeta: { fontFamily: 'var(--font-serif)', fontSize: '0.52rem', color: 'var(--text-muted)', letterSpacing: '0.08em' },
  cardDesc: { fontFamily: 'var(--font-italic)', fontStyle: 'italic', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1 },
  cardPickBtn: { marginTop: '0.4rem', fontFamily: 'var(--font-serif)', fontSize: '0.62rem', color: 'var(--gold-dim)', letterSpacing: '0.05em' },
  nextWaveMsg: { textAlign: 'center', padding: '2rem' },
  nextWaveText: { fontFamily: 'var(--font-italic)', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text-secondary)' },

  // Dark Lord's Demand
  demandResult: {
    border: '1px solid',
    borderRadius: 8,
    padding: '0.85rem 1.1rem',
    display: 'flex', flexDirection: 'column', gap: '0.4rem',
  },
  demandResultHeader: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
  },
  demandIcon: { fontSize: '0.9rem', flexShrink: 0 },
  demandLabel: {
    fontFamily: 'var(--font-serif)',
    fontSize: '0.58rem', letterSpacing: '0.12em',
    color: 'var(--text-muted)', textTransform: 'uppercase', flex: 1,
  },
  demandStatus: {
    fontFamily: 'var(--font-serif)',
    fontSize: '0.62rem', letterSpacing: '0.08em', fontWeight: 700,
  },
  demandText: {
    fontFamily: 'var(--font-italic)', fontStyle: 'italic',
    fontSize: '0.88rem', color: 'var(--bone)', lineHeight: 1.5, margin: 0,
  },
  demandReward: {
    fontFamily: 'var(--font-serif)',
    fontSize: '0.58rem', color: '#a0d0a0', letterSpacing: '0.05em', margin: 0,
  },

  // Feature 15.1: Wave score row
  scoreRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'rgba(232,196,74,0.06)', border: '1px solid rgba(232,196,74,0.15)',
    borderRadius: 8, padding: '0.55rem 1.1rem',
  },
  scoreLabel: {
    fontFamily: 'var(--font-serif)', fontSize: '0.62rem', letterSpacing: '0.1em',
    color: 'var(--gold-dim)', textTransform: 'uppercase',
  },
  scoreValue: {
    fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 700,
    color: 'var(--gold-bright)',
  },
  // Feature 15.2: Achievement unlock section
  achieveSection: {
    background: 'rgba(255,210,60,0.05)', border: '1px solid rgba(255,210,60,0.2)',
    borderRadius: 8, padding: '0.8rem 1rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  },
  achieveHeader: {
    fontFamily: 'var(--font-serif)', fontSize: '0.62rem', letterSpacing: '0.12em',
    color: 'rgba(255,220,80,0.8)', textTransform: 'uppercase', marginBottom: '0.1rem',
  },
  achieveCard: {
    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
    background: 'rgba(255,200,50,0.07)', border: '1px solid rgba(255,200,50,0.18)',
    borderRadius: 6, padding: '0.55rem 0.75rem',
  },
  achieveEmoji: { fontSize: '1.3rem', flexShrink: 0, lineHeight: 1 },
  achieveText: { display: 'flex', flexDirection: 'column', gap: '0.1rem' },
  achieveName: {
    fontFamily: 'var(--font-serif)', fontSize: '0.72rem', fontWeight: 700,
    color: 'var(--gold-bright)', letterSpacing: '0.04em',
  },
  achieveDesc: {
    fontFamily: 'var(--font-italic)', fontStyle: 'italic',
    fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4,
  },

  // Card hover highlight
  cardHovered: {
    border: '1px solid rgba(232,196,74,0.45)',
    background: 'rgba(232,196,74,0.09)',
    transform: 'translateY(-2px)',
    transition: 'all 0.15s',
  },

  // Card preview side panel
  cardPreview: {
    width: 210, flexShrink: 0,
    background: 'rgba(14,10,22,0.98)',
    border: '1px solid rgba(232,196,74,0.25)',
    borderRadius: 9, padding: '1rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
    alignSelf: 'flex-start',
  },
  cardPreviewHeader: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
  },
  cardPreviewName: {
    fontFamily: 'var(--font-serif)', fontSize: '0.82rem',
    color: 'var(--gold-bright)', fontWeight: 700,
  },
  cardPreviewMeta: {
    fontFamily: 'var(--font-serif)', fontSize: '0.5rem',
    color: 'var(--text-muted)', letterSpacing: '0.06em',
    marginTop: '0.1rem',
  },
  cardPreviewDesc: {
    fontFamily: 'var(--font-italic)', fontStyle: 'italic',
    fontSize: '0.78rem', color: 'var(--text-secondary)',
    lineHeight: 1.4, margin: 0,
  },
  cardPreviewStats: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 5, padding: '0.45rem 0.6rem',
    display: 'flex', flexDirection: 'column', gap: '0.18rem',
  },
  cardPreviewRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  cardPreviewRowLabel: {
    fontFamily: 'var(--font-serif)', fontSize: '0.52rem',
    color: 'var(--text-muted)', letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  cardPreviewRowVal: {
    fontFamily: 'var(--font-serif)', fontSize: '0.65rem',
    color: 'var(--bone)', fontWeight: 600,
  },
  cardPreviewChip: {
    fontFamily: 'var(--font-serif)', fontSize: '0.5rem',
    color: 'rgba(60,255,180,0.85)',
    background: 'rgba(40,220,160,0.07)',
    border: '1px solid rgba(40,220,160,0.2)',
    borderRadius: 3, padding: '1px 6px',
  },

  // 4th card (demand reward)
  cardDemandReward: {
    border: '1px solid rgba(100,180,100,0.35)',
    background: 'rgba(20,60,20,0.3)',
  },
  cardDemandBadge: {
    fontFamily: 'var(--font-serif)',
    fontSize: '0.5rem', letterSpacing: '0.08em',
    color: '#80c080', textTransform: 'uppercase',
    marginBottom: '0.1rem',
  },
}
