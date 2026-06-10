/**
 * Dungeon Architect — Shared Component Library
 * src/components/shared/index.jsx
 *
 * Exports: StatCard, GeraldMemo, PillBadge, CinzelButton, CinzelLabel
 */

import React from 'react'

// ── StatCard ────────────────────────────────────────────────────────────────
// A numbered/valued stat box used on ResultsScreen and VictoryScreen.
// Props: value (string|number), label (string), color (CSS color string)
export function StatCard({ value, label, color }) {
  return (
    <div style={sc.statCard}>
      <div style={{ ...sc.statValue, color: color ?? 'var(--bone)' }}>{value}</div>
      <div style={sc.statLabel}>{label}</div>
    </div>
  )
}

const sc = {
  statCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(232,196,74,0.12)',
    borderRadius: 8, padding: '1rem', textAlign: 'center',
  },
  statValue: {
    fontFamily: 'var(--font-serif)', fontSize: '1.75rem',
    fontWeight: 700, color: 'var(--bone)', lineHeight: 1,
  },
  statLabel: {
    fontFamily: 'var(--font-serif)', fontSize: '0.58rem',
    letterSpacing: '0.1em', color: 'var(--text-muted)',
    marginTop: '0.3rem', textTransform: 'uppercase',
  },
}

// ── GeraldMemo ──────────────────────────────────────────────────────────────
// The parchment-style memo box where Gerald delivers his verdict.
// Props: from (string — sender line), children (content)
export function GeraldMemo({ from, children }) {
  return (
    <div style={gm.memo}>
      <span style={gm.memoFrom}>{from}</span>
      <p style={gm.memoText}>{children}</p>
    </div>
  )
}

const gm = {
  memo: {
    background: 'rgba(232,196,74,0.04)',
    border: '1px solid rgba(232,196,74,0.12)',
    borderRadius: 8, padding: '1.2rem 1.5rem', textAlign: 'left',
  },
  memoFrom: {
    fontFamily: 'var(--font-serif)', fontSize: '0.58rem',
    letterSpacing: '0.1em', color: 'var(--gold-dim)',
    display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase',
  },
  memoText: {
    fontFamily: 'var(--font-italic)', fontStyle: 'italic',
    color: 'var(--bone)', fontSize: '1rem', lineHeight: 1.6, margin: 0,
  },
}

// ── PillBadge ───────────────────────────────────────────────────────────────
// A compact icon + count + label pill for the BattleLog status row.
// Props: icon (string), count (number), label (string), color (CSS color string)
export function PillBadge({ icon, count, label, color }) {
  return (
    <div style={pb.statusPill}>
      <span style={{ color: color ?? 'var(--bone)' }}>{icon}</span>
      <span style={pb.statusCount}>{count}</span>
      <span style={pb.statusLabel}>{label}</span>
    </div>
  )
}

const pb = {
  statusPill: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '0.08rem', padding: '0.3rem',
    background: 'rgba(255,255,255,0.03)', borderRadius: 4,
  },
  statusCount: {
    fontFamily: 'var(--font-serif)', fontSize: '0.95rem',
    fontWeight: 700, color: 'var(--bone)',
  },
  statusLabel: {
    fontFamily: 'var(--font-serif)', fontSize: '0.52rem',
    letterSpacing: '0.06em', color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
}

// ── CinzelButton ────────────────────────────────────────────────────────────
// Gold-styled primary action button using the Cinzel font.
// Props: onClick, disabled, children, style (override/extend)
export function CinzelButton({ onClick, disabled, children, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...cb.btn, ...(disabled ? cb.btnDisabled : {}), ...style }}
    >
      {children}
    </button>
  )
}

const cb = {
  btn: {
    background: 'var(--gold-mid)',
    color: '#0d0b0e',
    border: 'none',
    borderRadius: 6,
    padding: '0.55rem 1.4rem',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-serif)',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.04em',
    transition: 'all 0.15s ease',
  },
  btnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
}

// ── CinzelLabel ─────────────────────────────────────────────────────────────
// Small all-caps tracking label in Cinzel — used for section headers, chip labels.
// Props: children, color (CSS color string), style (override/extend)
export function CinzelLabel({ children, color, style }) {
  return (
    <span style={{ ...cl.label, ...(color ? { color } : {}), ...style }}>
      {children}
    </span>
  )
}

const cl = {
  label: {
    fontFamily: 'var(--font-serif)',
    fontSize: '0.56rem',
    letterSpacing: '0.12em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
}
