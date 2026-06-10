import React, { useEffect, useState, useCallback } from 'react'
import { useGameStore } from '../store/gameStore.js'
import {
  DIFFICULTIES, WAVE_CONFIGS as _WC,
  GRID_COLS, GRID_ROWS, TILE, PATH_ALL, ENTRANCE, TREASURE,
} from '../game/constants.js'
import { audio } from '../audio/audioEngine.js'
import { MENU_QUIPS } from '../game/gerald.js'
import {
  listSaves, deleteSave, readStats, favoriteTool,
  relativeTime, decodeLayout, readLeaderboard, readAchievements,
} from '../game/persistence.js'
import { ACHIEVEMENTS } from '../game/scoring.js'

function buildEmptyGrid() {
  const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(TILE.EMPTY))
  for (const pt of PATH_ALL) grid[pt.row][pt.col] = TILE.PATH
  grid[ENTRANCE.row][ENTRANCE.col] = TILE.ENTRANCE
  grid[TREASURE.row][TREASURE.col] = TILE.TREASURE
  return grid
}

export default function MainMenu() {
  const startGame        = useGameStore(s => s.startGame)
  const goToCampaign     = useGameStore(s => s.goToCampaign)
  const loadGame         = useGameStore(s => s.loadGame)
  const setDifficulty    = useGameStore(s => s.setDifficulty)
  const setPendingLayout = useGameStore(s => s.setPendingLayout)
  const difficulty       = useGameStore(s => s.difficulty)

  const [quip]    = useState(() => MENU_QUIPS[Math.floor(Math.random() * MENU_QUIPS.length)])
  const [visible, setVisible] = useState(false)

  // Save slots — re-read from localStorage on mount (could change each visit)
  const [saves, setSaves] = useState(() => listSaves())
  const refreshSaves = () => setSaves(listSaves())

  // Stats panel
  const [stats] = useState(() => readStats())
  const favTool  = favoriteTool(stats)
  const DIFFICULTY_LABELS = { easy: '🌿 Easy', medium: '⚔ Medium', hard: '🔥 Hard' }

  // Feature 15: leaderboard + achievements
  const [leaderboard]       = useState(() => readLeaderboard())
  const [unlockedIds]       = useState(() => readAchievements())
  const [showAchievements,  setShowAchievements]  = useState(false)
  const [showLeaderboard,   setShowLeaderboard]   = useState(false)
  const [lbDifficulty,      setLbDifficulty]      = useState('medium')

  const unlockedCount = ACHIEVEMENTS.filter(a => unlockedIds.has(a.id)).length
  const hasLeaderboard = Object.values(leaderboard).some(arr => arr.length > 0)
  const RANK_LABELS = ['🥇', '🥈', '🥉', '4th', '5th']
  const DIFF_LABELS = { easy: '🌿 Easy', medium: '⚔ Medium', hard: '🔥 Hard' }

  // Layout import
  const [showImport,   setShowImport]   = useState(false)
  const [importCode,   setImportCode]   = useState('')
  const [importError,  setImportError]  = useState('')
  const [importOk,     setImportOk]     = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleStart = () => {
    audio.init()
    audio.play('btn_click')
    startGame()
  }

  const handleDifficultySelect = (id) => {
    audio.init()
    setDifficulty(id)
    audio.play('difficulty_' + id)
  }

  const handleLoad = (saveData) => {
    audio.init()
    audio.play('btn_click')
    loadGame(saveData)
  }

  const handleDelete = (key) => {
    deleteSave(key)
    refreshSaves()
  }

  const handleImport = useCallback(() => {
    const code = importCode.trim()
    if (!code) return
    const grid = decodeLayout(code, buildEmptyGrid())
    if (!grid) {
      setImportError('Invalid layout code. Please check and try again.')
      setImportOk(false)
      return
    }
    setPendingLayout(grid)
    setImportOk(true)
    setImportError('')
  }, [importCode, setPendingLayout])

  const handleStartWithLayout = () => {
    audio.init()
    audio.play('btn_click')
    startGame()  // startGame() picks up pendingLayout
  }

  const hasSaves = saves.some(s => s.data !== null)
  const mostRecent = saves.find(s => s.data !== null)

  return (
    <div style={styles.root}>
      {/* Animated background particles */}
      <div style={styles.particles}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{ ...styles.particle, ...particleStyle(i) }} />
        ))}
      </div>

      <div style={{ ...styles.content, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s ease' }}>

        {/* Title */}
        <div style={styles.titleBlock}>
          <div style={styles.ornament}>⚔ ✦ ⚔</div>
          <h1 style={styles.title}>Dungeon</h1>
          <h1 style={styles.titleSub}>Architect</h1>
          <div style={styles.ornament}>⚔ ✦ ⚔</div>
        </div>

        {/* Gerald quip */}
        <div style={styles.memo}>
          <div style={styles.memoHeader}>💀 Memo from Gerald, Your Management Consultant Skeleton</div>
          <p style={styles.memoText}>{quip}</p>
        </div>

        {/* ── Save slots ── */}
        {hasSaves && (
          <div style={styles.saveSection}>
            <div style={styles.saveHeader}>💾 SAVED GAMES</div>
            <div style={styles.saveSlots}>
              {saves.map(({ slotKey, slotLabel, data }) => (
                <SaveSlotCard
                  key={slotKey}
                  slotLabel={slotLabel}
                  data={data}
                  onLoad={() => data && handleLoad(data)}
                  onDelete={() => handleDelete(slotKey)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Difficulty selector */}
        <div style={styles.diffSection}>
          <div style={styles.diffLabel}>— Select Difficulty —</div>
          <div style={styles.diffCards}>
            {Object.values(DIFFICULTIES).map(diff => {
              const selected = difficulty === diff.id
              return (
                <button
                  key={diff.id}
                  style={{
                    ...styles.diffCard,
                    borderColor: selected ? diff.borderColor.replace('0.5','0.9') : diff.borderColor,
                    background:  selected ? `rgba(${hexToRgb(diff.color)},0.12)` : 'rgba(255,255,255,0.03)',
                    boxShadow:   selected ? `0 0 16px ${diff.borderColor}` : 'none',
                  }}
                  onClick={() => handleDifficultySelect(diff.id)}
                >
                  <div style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>{diff.emoji}</div>
                  <div style={{ ...styles.diffCardLabel, color: selected ? diff.color : 'var(--bone)' }}>
                    {diff.label}
                  </div>
                  <div style={styles.diffCardTagline}>{diff.tagline}</div>
                  <div style={styles.diffCardDesc}>{diff.description}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div style={styles.actionRow}>
          {mostRecent?.data && (
            <button style={styles.continueBtn} onClick={() => handleLoad(mostRecent.data)}>
              ↩ Continue — Wave {mostRecent.data.waveIndex + 1}
            </button>
          )}
          <button style={styles.primaryBtn} onClick={handleStart}>
            ⚔ Quick Play
          </button>
          <button style={styles.campaignBtn} onClick={() => { audio.init(); audio.play('btn_click'); goToCampaign() }}>
            🗺 Campaign Map
          </button>
        </div>

        <p style={styles.tagline}>
          Place your traps. Command your monsters. Stop the heroes.<br />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
            They think this will be easy. They are wrong.
          </span>
        </p>

        {/* ── Stats panel ── */}
        {stats.gamesPlayed > 0 && (
          <div style={styles.statsPanel}>
            <div style={styles.statsHeader}>📜 Gerald's Records</div>
            <div style={styles.statsGrid}>
              <StatItem label="Campaigns" value={stats.gamesPlayed} />
              <StatItem label="All-Time Kills" value={stats.totalKills.toLocaleString()} />
              <StatItem label="Best Wave" value={
                Object.entries(stats.bestWave).length > 0
                  ? Object.entries(stats.bestWave)
                    .map(([d, w]) => `${DIFFICULTY_LABELS[d] ?? d}: ${w}`)
                    .join(' · ')
                  : '—'
              } />
              {favTool && (
                <StatItem label="Favorite Tool" value={favTool} />
              )}
            </div>
          </div>
        )}

        {/* ── Hall of Excellence leaderboard ── */}
        {hasLeaderboard && (
          <div style={styles.hallSection}>
            <button
              style={styles.hallToggle}
              onClick={() => setShowLeaderboard(v => !v)}
            >
              🏆 Gerald's Hall of Excellence {showLeaderboard ? '▲' : '▼'}
            </button>
            {showLeaderboard && (
              <div style={styles.hallPanel}>
                {/* Difficulty tabs */}
                <div style={styles.lbTabs}>
                  {['easy','medium','hard'].map(d => (
                    <button
                      key={d}
                      style={{
                        ...styles.lbTab,
                        borderBottom: lbDifficulty === d
                          ? '2px solid var(--gold-bright)'
                          : '2px solid transparent',
                        color: lbDifficulty === d ? 'var(--gold-bright)' : 'var(--text-muted)',
                      }}
                      onClick={() => setLbDifficulty(d)}
                    >
                      {DIFF_LABELS[d]}
                    </button>
                  ))}
                </div>
                {(leaderboard[lbDifficulty] ?? []).length === 0 ? (
                  <p style={styles.lbEmpty}>No runs recorded on {lbDifficulty} yet.</p>
                ) : (
                  <div style={styles.lbList}>
                    {(leaderboard[lbDifficulty] ?? []).map((entry, i) => (
                      <div key={i} style={styles.lbRow}>
                        <span style={styles.lbRank}>{RANK_LABELS[i] ?? `#${i+1}`}</span>
                        <span style={styles.lbScore}>{entry.score.toLocaleString()}</span>
                        <span style={styles.lbMeta}>{entry.kills} kills · {entry.waves}w</span>
                        <span style={styles.lbDate}>{new Date(entry.date).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p style={styles.hallNote}>
                  "A dungeon is not measured by the heroes who enter, but by the heroes who do not leave."
                  <br /><span style={{ color: 'var(--text-muted)' }}>— Gerald, quarterly report</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Achievements panel ── */}
        <div style={styles.achieveSection}>
          <button
            style={styles.achieveToggle}
            onClick={() => setShowAchievements(v => !v)}
          >
            🎖 Achievements — {unlockedCount} / {ACHIEVEMENTS.length} {showAchievements ? '▲' : '▼'}
          </button>
          {showAchievements && (
            <div style={styles.achievePanel}>
              {['strategic', 'quirky', 'endurance'].map(cat => (
                <div key={cat} style={styles.achieveCat}>
                  <div style={styles.achieveCatLabel}>
                    {cat === 'strategic' ? '⚔ Strategic' : cat === 'quirky' ? '🎭 Quirky' : '🔥 Endurance'}
                  </div>
                  {ACHIEVEMENTS.filter(a => a.category === cat).map(a => {
                    const unlocked = unlockedIds.has(a.id)
                    return (
                      <div key={a.id} style={{
                        ...styles.achieveCard,
                        opacity: unlocked ? 1 : 0.45,
                      }}>
                        <span style={styles.achieveEmoji}>{unlocked ? a.emoji : '🔒'}</span>
                        <div style={styles.achieveText}>
                          <span style={{
                            ...styles.achieveName,
                            color: unlocked ? 'var(--gold-bright)' : 'var(--text-muted)',
                          }}>
                            {a.name}
                          </span>
                          <span style={styles.achieveDesc}>
                            {unlocked ? a.desc : a.hint}
                          </span>
                        </div>
                        {unlocked && <span style={styles.achieveCheck}>✓</span>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Layout import ── */}
        <div style={styles.importSection}>
          <button
            style={styles.importToggle}
            onClick={() => setShowImport(v => !v)}
          >
            {showImport ? '▲' : '▼'} Import Layout Code
          </button>
          {showImport && (
            <div style={styles.importPanel}>
              <input
                style={styles.importInput}
                value={importCode}
                onChange={e => { setImportCode(e.target.value); setImportOk(false); setImportError('') }}
                placeholder="Paste layout code here..."
                spellCheck={false}
              />
              <div style={styles.importRow}>
                <button style={styles.importBtn} onClick={handleImport}>
                  Validate
                </button>
                {importOk && (
                  <button style={{ ...styles.importBtn, ...styles.importBtnGo }} onClick={handleStartWithLayout}>
                    ⚔ Start with this Layout
                  </button>
                )}
              </div>
              {importError && <p style={styles.importError}>{importError}</p>}
              {importOk    && <p style={styles.importSuccess}>Layout valid! Click "Start" to begin.</p>}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Save slot card ─────────────────────────────────────────────────────────────

function SaveSlotCard({ slotLabel, data, onLoad, onDelete }) {
  const SLOT_NAMES = { auto: 'Auto', manual1: 'Slot 1', manual2: 'Slot 2' }
  const name = SLOT_NAMES[slotLabel] ?? slotLabel

  if (!data) {
    return (
      <div style={{ ...styles.slotCard, ...styles.slotCardEmpty }}>
        <span style={styles.slotName}>{name}</span>
        <span style={styles.slotEmptyLabel}>— empty —</span>
      </div>
    )
  }

  const diff       = DIFFICULTIES[data.difficulty] ?? DIFFICULTIES.medium
  const hpRatio    = data.treasureMaxHp > 0 ? data.treasureHp / data.treasureMaxHp : 1
  const wavePct    = ((data.waveIndex) / _WC.length * 100).toFixed(0)

  return (
    <div style={styles.slotCard}>
      <div style={styles.slotCardTop}>
        <span style={styles.slotName}>{name}</span>
        <button style={styles.slotDelete} onClick={onDelete} title="Delete save">×</button>
      </div>
      <span style={{ ...styles.slotDiff, color: diff.color }}>
        {diff.emoji} {diff.label}
      </span>
      <span style={styles.slotWave}>Wave {data.waveIndex + 1} / {_WC.length}</span>
      {/* Wave progress bar */}
      <div style={styles.slotTrack}>
        <div style={{ ...styles.slotFill, width: `${wavePct}%`, background: diff.color }} />
      </div>
      {/* Treasure HP */}
      <div style={styles.slotTrack}>
        <div style={{
          ...styles.slotFill,
          width: `${(hpRatio * 100).toFixed(0)}%`,
          background: hpRatio > 0.6 ? '#c9a02a' : hpRatio > 0.3 ? 'var(--color-fire)' : 'var(--color-hard)',
        }} />
      </div>
      <span style={styles.slotTime}>{relativeTime(data.timestamp)}</span>
      <button style={styles.slotLoadBtn} onClick={onLoad}>Load →</button>
    </div>
  )
}

function StatItem({ label, value }) {
  return (
    <div style={styles.statItem}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

function particleStyle(i) {
  return {
    width:  2 + (i % 4),
    height: 2 + (i % 4),
    left:   `${(i * 5.3 + 7) % 100}%`,
    animationDelay:    `${(i * 0.37) % 4}s`,
    animationDuration: `${4 + (i % 5)}s`,
    opacity: 0.2 + (i % 5) * 0.08,
  }
}

const styles = {
  root: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 40%, #1e1428 0%, #0d0b0e 70%)',
    position: 'relative', overflow: 'hidden',
  },
  particles: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  particle: {
    position: 'absolute', bottom: '-10px', borderRadius: '50%',
    background: 'var(--gold-dim)', animation: 'floatUp 5s ease-in infinite',
  },
  content: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '1.5rem', padding: '2rem', maxWidth: 600, width: '100%',
    textAlign: 'center', zIndex: 1, overflowY: 'auto', maxHeight: '100vh',
  },
  titleBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' },
  ornament:   { color: 'var(--gold-dim)', fontSize: '0.9rem', letterSpacing: '0.5em' },
  title: {
    fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.5rem, 7vw, 5rem)',
    fontWeight: 700, color: 'var(--gold-bright)', lineHeight: 1,
    textShadow: '0 0 40px rgba(232,196,74,0.3)', letterSpacing: '0.05em',
  },
  titleSub: {
    fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.1rem, 3vw, 2rem)',
    fontWeight: 400, color: 'var(--bone)', lineHeight: 1,
    letterSpacing: '0.4em', textTransform: 'uppercase',
  },
  memo: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,196,74,0.15)',
    borderRadius: 8, padding: '0.8rem 1.2rem', maxWidth: 480, width: '100%',
  },
  memoHeader: {
    fontFamily: 'var(--font-serif)', fontSize: '0.65rem', color: 'var(--gold-dim)',
    letterSpacing: '0.08em', marginBottom: '0.4rem', textTransform: 'uppercase',
  },
  memoText: {
    fontFamily: 'var(--font-italic)', fontStyle: 'italic',
    color: 'var(--bone)', fontSize: '0.95rem', lineHeight: 1.6,
  },
  // Save slots
  saveSection: { width: '100%', maxWidth: 520 },
  saveHeader: {
    fontFamily: 'var(--font-serif)', fontSize: '0.62rem', letterSpacing: '0.15em',
    color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase',
    textAlign: 'left',
  },
  saveSlots: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' },
  slotCard: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,196,74,0.12)',
    borderRadius: 8, padding: '0.6rem 0.7rem',
    display: 'flex', flexDirection: 'column', gap: '0.2rem',
    textAlign: 'left', position: 'relative',
  },
  slotCardEmpty: { opacity: 0.4, justifyContent: 'center', alignItems: 'center', minHeight: 80 },
  slotCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  slotName: {
    fontFamily: 'var(--font-serif)', fontSize: '0.55rem', letterSpacing: '0.1em',
    color: 'var(--gold-dim)', textTransform: 'uppercase',
  },
  slotEmptyLabel: { fontFamily: 'var(--font-italic)', fontStyle: 'italic', fontSize: '0.78rem', color: 'var(--text-muted)' },
  slotDelete: {
    background: 'transparent', border: 'none', color: 'var(--text-muted)',
    fontSize: '0.9rem', cursor: 'pointer', padding: '0 2px', lineHeight: 1,
  },
  slotDiff: { fontFamily: 'var(--font-serif)', fontSize: '0.58rem', letterSpacing: '0.05em' },
  slotWave: { fontFamily: 'var(--font-serif)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--bone)' },
  slotTrack: { height: 3, background: '#1a1428', borderRadius: 2, overflow: 'hidden' },
  slotFill:  { height: '100%', borderRadius: 2 },
  slotTime:  { fontFamily: 'var(--font-italic)', fontStyle: 'italic', fontSize: '0.7rem', color: 'var(--text-muted)' },
  slotLoadBtn: {
    marginTop: '0.2rem', background: 'var(--gold-mid)', color: '#0d0b0e',
    border: 'none', borderRadius: 4, padding: '0.28rem 0.5rem',
    fontFamily: 'var(--font-serif)', fontSize: '0.6rem', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.04em', alignSelf: 'flex-end',
  },
  // Difficulty
  diffSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', width: '100%' },
  diffLabel: {
    fontFamily: 'var(--font-serif)', fontSize: '0.65rem', letterSpacing: '0.2em',
    color: 'var(--text-muted)', textTransform: 'uppercase',
  },
  diffCards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', width: '100%', maxWidth: 500 },
  diffCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
    padding: '0.9rem 0.6rem', borderRadius: 8, border: '1px solid',
    cursor: 'pointer', transition: 'all 0.18s ease', textAlign: 'center',
  },
  diffCardLabel: { fontFamily: 'var(--font-serif)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.05em' },
  diffCardTagline: { fontFamily: 'var(--font-italic)', fontStyle: 'italic', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' },
  diffCardDesc:    { fontFamily: 'var(--font-italic)', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 },
  // Action buttons
  actionRow: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  continueBtn: {
    background: 'rgba(232,196,74,0.12)', color: 'var(--gold-bright)',
    border: '1px solid rgba(232,196,74,0.4)', borderRadius: 6,
    padding: '0.55rem 1.2rem', fontSize: '0.85rem',
    fontFamily: 'var(--font-serif)', fontWeight: 700, cursor: 'pointer',
    letterSpacing: '0.03em',
  },
  primaryBtn: {
    background: 'var(--gold-mid)', color: '#0d0b0e',
    border: 'none', borderRadius: 6, padding: '0.6rem 1.6rem',
    fontSize: '0.9rem', fontFamily: 'var(--font-serif)', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.03em',
    boxShadow: '0 4px 20px rgba(232,196,74,0.2)',
  },
  campaignBtn: {
    background: 'rgba(200,160,72,0.12)', color: 'var(--color-medium)',
    border: '1px solid rgba(200,160,72,0.4)', borderRadius: 6, padding: '0.6rem 1.6rem',
    fontSize: '0.9rem', fontFamily: 'var(--font-serif)', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.03em',
  },
  tagline: {
    fontFamily: 'var(--font-italic)', fontSize: '1rem',
    color: 'var(--text-secondary)', lineHeight: 1.7,
  },
  // Stats
  statsPanel: {
    width: '100%', maxWidth: 480,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8, padding: '0.75rem 1rem',
  },
  statsHeader: {
    fontFamily: 'var(--font-serif)', fontSize: '0.6rem', letterSpacing: '0.12em',
    color: 'var(--gold-dim)', marginBottom: '0.5rem', textTransform: 'uppercase',
    textAlign: 'left',
  },
  statsGrid: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  statItem:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' },
  statLabel: { fontFamily: 'var(--font-serif)', fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' },
  statValue: { fontFamily: 'var(--font-italic)', fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'right' },
  // ── Hall of Excellence ─────────────────────────────────────────────────────
  hallSection: { width: '100%', maxWidth: 480 },
  hallToggle: {
    width: '100%', background: 'transparent', color: 'var(--gold-dim)',
    border: '1px solid rgba(232,196,74,0.18)', borderRadius: 5,
    padding: '0.38rem 0.75rem', fontFamily: 'var(--font-serif)', fontSize: '0.62rem',
    letterSpacing: '0.08em', cursor: 'pointer',
  },
  hallPanel: {
    marginTop: '0.5rem',
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(232,196,74,0.1)',
    borderRadius: 8, padding: '0.75rem',
    display: 'flex', flexDirection: 'column', gap: '0.4rem',
  },
  lbTabs: { display: 'flex', gap: '0.25rem', marginBottom: '0.35rem' },
  lbTab: {
    flex: 1, background: 'transparent', border: 'none',
    padding: '0.3rem', fontFamily: 'var(--font-serif)', fontSize: '0.58rem',
    letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase',
  },
  lbEmpty: {
    fontFamily: 'var(--font-italic)', fontStyle: 'italic',
    fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0.5rem 0',
  },
  lbList: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  lbRow: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    padding: '0.28rem 0.4rem', borderRadius: 4,
    background: 'rgba(255,255,255,0.025)',
  },
  lbRank: {
    fontFamily: 'var(--font-serif)', fontSize: '0.7rem', fontWeight: 700,
    color: 'var(--gold-bright)', minWidth: '2rem', textAlign: 'center',
  },
  lbScore: {
    fontFamily: 'var(--font-serif)', fontSize: '0.82rem', fontWeight: 700,
    color: 'var(--bone)', minWidth: '4.5rem',
  },
  lbMeta: {
    fontFamily: 'var(--font-italic)', fontStyle: 'italic',
    fontSize: '0.73rem', color: 'var(--text-secondary)', flex: 1,
  },
  lbDate: {
    fontFamily: 'var(--font-italic)', fontSize: '0.68rem',
    color: 'var(--text-muted)',
  },
  hallNote: {
    fontFamily: 'var(--font-italic)', fontStyle: 'italic',
    fontSize: '0.73rem', color: 'var(--text-muted)', textAlign: 'center',
    lineHeight: 1.5, marginTop: '0.35rem',
  },
  // ── Achievements ────────────────────────────────────────────────────────────
  achieveSection: { width: '100%', maxWidth: 480 },
  achieveToggle: {
    width: '100%', background: 'transparent', color: 'var(--text-muted)',
    border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5,
    padding: '0.35rem 0.75rem', fontFamily: 'var(--font-serif)', fontSize: '0.6rem',
    letterSpacing: '0.08em', cursor: 'pointer',
  },
  achievePanel: {
    marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
  },
  achieveCat: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  achieveCatLabel: {
    fontFamily: 'var(--font-serif)', fontSize: '0.55rem', letterSpacing: '0.14em',
    color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: '0.1rem',
  },
  achieveCard: {
    display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 6, padding: '0.45rem 0.6rem',
  },
  achieveEmoji: { fontSize: '1rem', flexShrink: 0, lineHeight: 1.2, marginTop: '0.05rem' },
  achieveText: { display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 },
  achieveName: {
    fontFamily: 'var(--font-serif)', fontSize: '0.65rem', fontWeight: 700,
    letterSpacing: '0.04em',
  },
  achieveDesc: {
    fontFamily: 'var(--font-italic)', fontStyle: 'italic',
    fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35,
  },
  achieveCheck: {
    fontFamily: 'var(--font-serif)', fontSize: '0.7rem',
    color: '#60c060', flexShrink: 0, alignSelf: 'center',
  },
  // Layout import
  importSection: { width: '100%', maxWidth: 480 },
  importToggle: {
    background: 'transparent', color: 'var(--text-muted)',
    border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5,
    padding: '0.35rem 0.75rem', fontFamily: 'var(--font-serif)', fontSize: '0.6rem',
    letterSpacing: '0.08em', cursor: 'pointer', width: '100%',
  },
  importPanel: { marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  importInput: {
    width: '100%', background: '#0d0b0e', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 5, padding: '0.45rem 0.65rem', color: 'var(--bone)',
    fontFamily: 'monospace', fontSize: '0.72rem', outline: 'none',
    boxSizing: 'border-box',
  },
  importRow: { display: 'flex', gap: '0.4rem' },
  importBtn: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 5, padding: '0.38rem 0.75rem', color: 'var(--bone)',
    fontFamily: 'var(--font-serif)', fontSize: '0.62rem', cursor: 'pointer',
  },
  importBtnGo: {
    background: 'var(--gold-mid)', color: '#0d0b0e', border: 'none', fontWeight: 700,
  },
  importError:   { fontFamily: 'var(--font-italic)', fontStyle: 'italic', color: '#c04040', fontSize: '0.8rem', margin: 0 },
  importSuccess: { fontFamily: 'var(--font-italic)', fontStyle: 'italic', color: '#40a060', fontSize: '0.8rem', margin: 0 },
}

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
