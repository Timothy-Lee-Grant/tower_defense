import React from 'react'
import { useGameStore } from '../store/gameStore.js'
import { WAVE_CONFIGS } from '../game/constants.js'
import { selectVictoryComment } from '../game/gerald.js'
import { getAchievement } from '../game/scoring.js'
import { readLeaderboard } from '../game/persistence.js'

export default function VictoryScreen() {
  const runKills                  = useGameStore(s => s.runKills)
  const bank                      = useGameStore(s => s.bank)
  const treasureHp                = useGameStore(s => s.treasureHp)
  const treasureMaxHp             = useGameStore(s => s.treasureMaxHp)
  const runScore                  = useGameStore(s => s.runScore)
  const leaderboardRank           = useGameStore(s => s.leaderboardRank)
  const difficulty                = useGameStore(s => s.difficulty)
  const newlyUnlockedAchievements = useGameStore(s => s.newlyUnlockedAchievements)
  const goToMenu           = useGameStore(s => s.goToMenu)
  const startEndlessMode   = useGameStore(s => s.startEndlessMode)
  const goToCampaign       = useGameStore(s => s.goToCampaign)
  const campaignNodeId     = useGameStore(s => s.campaignNodeId)
  const isEndlessMode      = useGameStore(s => s.isEndlessMode)

  // Read current leaderboard for the difficulty
  const leaderboard = readLeaderboard()[difficulty] ?? []
  const RANK_LABELS = ['🥇', '🥈', '🥉', '4th', '5th']

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
          <StatCard value={WAVE_CONFIGS.length}       label="Waves Survived" color="var(--gold-bright)" />
          <StatCard value={runKills}                  label="Heroes Slain"   color="var(--bone)" />
          <StatCard value={`${bank}g`}               label="Gold Earned"    color="var(--gold-bright)" />
          <StatCard value={runScore.toLocaleString()} label="Final Score"    color="var(--gold-bright)" />
        </div>

        {/* Leaderboard rank banner */}
        {leaderboardRank !== null && leaderboardRank <= 5 && (
          <div style={s.rankBanner}>
            <span style={s.rankEmoji}>{RANK_LABELS[leaderboardRank - 1] ?? `#${leaderboardRank}`}</span>
            <span style={s.rankText}>
              {leaderboardRank === 1
                ? 'New high score on this difficulty!'
                : `Rank #${leaderboardRank} on ${difficulty} difficulty`}
            </span>
          </div>
        )}

        {/* Mini leaderboard — top 5 for this difficulty */}
        {leaderboard.length > 0 && (
          <div style={s.leaderboard}>
            <div style={s.lbHeader}>🏆 Gerald's Hall of Excellence — {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</div>
            {leaderboard.map((entry, i) => (
              <div key={i} style={{
                ...s.lbRow,
                background: leaderboardRank === i + 1 ? 'rgba(232,196,74,0.1)' : undefined,
              }}>
                <span style={s.lbRank}>{RANK_LABELS[i] ?? `#${i + 1}`}</span>
                <span style={s.lbScore}>{entry.score.toLocaleString()}</span>
                <span style={s.lbMeta}>{entry.kills} kills · {entry.waves}w · {new Date(entry.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Achievement unlocks */}
        {newlyUnlockedAchievements.length > 0 && (
          <div style={s.achieveSection}>
            <div style={s.achieveHeader}>🎖 Achievement Unlocked</div>
            {newlyUnlockedAchievements.map(id => {
              const a = getAchievement(id)
              if (!a) return null
              return (
                <div key={id} style={s.achieveCard}>
                  <span style={s.achieveEmoji}>{a.emoji}</span>
                  <div>
                    <div style={s.achieveName}>{a.name}</div>
                    <div style={s.achieveDesc}>{a.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={s.memo}>
          <span style={s.memoFrom}>Final Memo from Gerald, Dungeon Operations</span>
          <p style={s.memoText}>
            {selectVictoryComment({ treasureHp, treasureMaxHp })}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center', alignSelf: 'center' }}>
          {!isEndlessMode && (
            <button style={s.endlessBtn} onClick={startEndlessMode} title="Waves continue scaling forever">
              ∞ Endless Mode
            </button>
          )}
          {campaignNodeId && (
            <button style={s.campaignBtn} onClick={goToCampaign}>
              🗺 Campaign Map
            </button>
          )}
          <button style={s.btn} onClick={goToMenu}>
            ↩ Main Menu
          </button>
        </div>

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
    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem',
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
  endlessBtn: {
    background: 'rgba(100,140,200,0.12)', color: '#8ab0cc',
    border: '1px solid rgba(100,140,200,0.3)', borderRadius: 6,
    padding: '0.65rem 1.4rem',
    fontSize: '0.85rem', fontFamily: "'Cinzel', serif", fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.04em',
  },
  // Rank banner
  rankBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
    background: 'rgba(232,196,74,0.08)', border: '1px solid rgba(232,196,74,0.25)',
    borderRadius: 8, padding: '0.65rem 1rem',
  },
  rankEmoji: { fontSize: '1.4rem' },
  rankText: {
    fontFamily: "'Cinzel', serif", fontSize: '0.78rem', color: 'var(--gold-bright)',
    letterSpacing: '0.05em',
  },
  // Leaderboard
  leaderboard: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8, padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem',
  },
  lbHeader: {
    fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.12em',
    color: 'var(--gold-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', textAlign: 'left',
  },
  lbRow: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.3rem 0.5rem', borderRadius: 5,
  },
  lbRank: {
    fontFamily: "'Cinzel', serif", fontSize: '0.75rem', fontWeight: 700,
    color: 'var(--gold-bright)', minWidth: '2.2rem', textAlign: 'center',
  },
  lbScore: {
    fontFamily: "'Cinzel', serif", fontSize: '0.88rem', fontWeight: 700,
    color: 'var(--bone)', minWidth: '5rem',
  },
  lbMeta: {
    fontFamily: "'Crimson Text', serif", fontStyle: 'italic',
    fontSize: '0.78rem', color: 'var(--text-muted)',
  },
  // Achievements
  achieveSection: {
    background: 'rgba(255,210,60,0.05)', border: '1px solid rgba(255,210,60,0.2)',
    borderRadius: 8, padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem',
  },
  achieveHeader: {
    fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.12em',
    color: 'rgba(255,220,80,0.8)', textTransform: 'uppercase', marginBottom: '0.1rem', textAlign: 'left',
  },
  achieveCard: {
    display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
    background: 'rgba(255,200,50,0.06)', border: '1px solid rgba(255,200,50,0.15)',
    borderRadius: 6, padding: '0.45rem 0.7rem', textAlign: 'left',
  },
  achieveEmoji: { fontSize: '1.2rem', flexShrink: 0, lineHeight: 1 },
  achieveName: {
    fontFamily: "'Cinzel', serif", fontSize: '0.7rem', fontWeight: 700,
    color: 'var(--gold-bright)', letterSpacing: '0.04em',
  },
  achieveDesc: {
    fontFamily: "'Crimson Text', serif", fontStyle: 'italic',
    fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.35,
  },
  campaignBtn: {
    background: 'rgba(200,160,72,0.10)', color: '#c8a048',
    border: '1px solid rgba(200,160,72,0.3)', borderRadius: 6,
    padding: '0.65rem 1.4rem',
    fontSize: '0.85rem', fontFamily: "'Cinzel', serif", fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.04em',
  },
}
