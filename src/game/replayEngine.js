// ── Feature 16: Replay Engine ─────────────────────────────────────────────────
//
// Records each wave as compressed snapshots + significant events,
// then plays them back at controllable speed with interpolation.
//
// Per-wave replay shape:
//   {
//     waveIndex:   number,
//     difficulty:  string,
//     waveDuration: number,          // total ms the wave lasted
//     grid:        string[][],       // grid at wave start (20×13)
//     waveConfig:  { wave, label, heroes },
//     heroMeta:    { [id]: { type, label, emoji, color } },
//     snapshots:   Array<Snapshot>,  // every SNAPSHOT_INTERVAL_MS
//     events:      Array<ReplayEv>,  // notable events only
//     stats:       { heroesKilled, heroesEscaped, waveScore, treasureHpEnd }
//   }
//
// Snapshot: { t: number, heroes: CompactHero[] }
// CompactHero (array for space): [id, x, y, hp, maxHp, state, hasGold, poisoned, slowed, curseStacks, spawned]
//   state: 0=moving, 1=dead, 2=escaped
//
// Notable event types stored: hero_killed, hero_escaped, treasure_reached,
//   trap_triggered (boulder/pit/electric only), boss_enraged, medic_revived.

export const SNAPSHOT_INTERVAL_MS = 500

// ── Notable event filter ──────────────────────────────────────────────────────

const NOTABLE_TYPES = new Set([
  'hero_killed', 'hero_escaped', 'treasure_reached',
  'trap_triggered', 'boss_enraged', 'medic_revived',
])
const NOTABLE_TRAPS = new Set(['boulder', 'pit', 'electric'])

export function isNotableEvent(ev) {
  if (!NOTABLE_TYPES.has(ev.type)) return false
  if (ev.type === 'trap_triggered' && !NOTABLE_TRAPS.has(ev.trap)) return false
  return true
}

// ── Recorder creation ─────────────────────────────────────────────────────────

export function createRecorder(waveIndex, difficulty, grid, heroes, waveConfig) {
  const heroMeta = {}
  for (const h of heroes) {
    heroMeta[h.id] = { type: h.type, label: h.label, emoji: h.emoji, color: h.color }
  }
  return {
    waveIndex,
    difficulty,
    grid:     grid.map(r => [...r]),
    waveConfig: {
      wave:   waveConfig.wave,
      label:  waveConfig.label,
      heroes: waveConfig.heroes,
    },
    heroMeta,
    snapshots:       [],
    events:          [],
    lastSnapshotAt:  -SNAPSHOT_INTERVAL_MS,  // ensures first snapshot fires at t≈0
  }
}

// ── Snapshot recording ────────────────────────────────────────────────────────

export function recordSnapshotIfDue(recorder, t, heroes) {
  if (!recorder) return
  if (t - recorder.lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return
  recorder.lastSnapshotAt = t
  recorder.snapshots.push({
    t,
    heroes: heroes.map(h => [
      h.id,
      Math.round(h.x),
      Math.round(h.y),
      Math.round(h.hp),
      Math.round(h.maxHp),
      h.state === 'moving' ? 0 : h.state === 'dead' ? 1 : 2,
      h.hasGold    ? 1 : 0,
      h.poisoned   ? 1 : 0,
      h.slowed     ? 1 : 0,
      h.curseStacks ?? 0,
      h.spawned    ? 1 : 0,
    ]),
  })
}

// ── Event recording ───────────────────────────────────────────────────────────

export function recordNotableEvent(recorder, t, ev) {
  if (!recorder) return
  if (!isNotableEvent(ev)) return
  const compact = { t, type: ev.type }
  if (ev.label)    compact.label    = ev.label
  if (ev.heroType) compact.heroType = ev.heroType
  if (ev.hadGold !== undefined) compact.hadGold = ev.hadGold
  if (ev.isBoss)   compact.isBoss   = true
  if (ev.trap)     compact.trap     = ev.trap
  // For closest-call detection: treasureHp at the moment of treasure_reached
  if (ev.treasureHpSnapshot !== undefined) compact.treasureHpSnapshot = ev.treasureHpSnapshot
  recorder.events.push(compact)
}

// ── Finalize replay ───────────────────────────────────────────────────────────

export function finalizeRecorder(recorder, waveDuration, stats) {
  if (!recorder) return null
  return {
    waveIndex:    recorder.waveIndex,
    difficulty:   recorder.difficulty,
    grid:         recorder.grid,
    waveConfig:   recorder.waveConfig,
    heroMeta:     recorder.heroMeta,
    snapshots:    recorder.snapshots,
    events:       recorder.events,
    waveDuration,
    stats,
  }
}

// ── Hero expansion ────────────────────────────────────────────────────────────

function expandHero(arr, heroMeta) {
  const [id, x, y, hp, maxHp, stateCode, hasGold, poisoned, slowed, curseStacks, spawned] = arr
  const meta  = heroMeta[id] ?? {}
  const state = stateCode === 0 ? 'moving' : stateCode === 1 ? 'dead' : 'escaped'
  return {
    id, x, y, hp, maxHp, state,
    hasGold:     hasGold    === 1,
    poisoned:    poisoned   === 1,
    slowed:      slowed     === 1,
    curseStacks: curseStacks ?? 0,
    spawned:     spawned    === 1,
    type:        meta.type  ?? 'knight',
    label:       meta.label ?? '?',
    emoji:       meta.emoji ?? '⚔️',
    color:       meta.color ?? '#888',
  }
}

function interpolateHero(a, b, frac) {
  return {
    ...a,
    x:  a.x  + (b.x  - a.x)  * frac,
    y:  a.y  + (b.y  - a.y)  * frac,
    hp: a.hp + (b.hp - a.hp) * frac,
  }
}

// ── Playback ──────────────────────────────────────────────────────────────────

/**
 * Returns an array of hero objects (suitable for DungeonGrid rendering)
 * interpolated to time `t` (ms from wave start).
 */
export function getReplayFrame(replay, t) {
  if (!replay) return []
  const { snapshots, heroMeta } = replay
  if (!snapshots || snapshots.length === 0) return []

  const clamped = Math.max(0, Math.min(t, replay.waveDuration ?? t))

  // Binary search for the two surrounding snapshots
  let lo = 0, hi = snapshots.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (snapshots[mid].t <= clamped) lo = mid
    else hi = mid
  }

  const snapA = snapshots[lo]
  const snapB = snapshots[hi] ?? snapA

  if (snapA === snapB || snapB.t === snapA.t) {
    return snapA.heroes.map(arr => expandHero(arr, heroMeta))
  }

  const frac = (clamped - snapA.t) / (snapB.t - snapA.t)

  // Build lookup for snapshot A
  const mapA = {}
  for (const arr of snapA.heroes) mapA[arr[0]] = arr

  const result = []
  // Heroes present in snapshot B
  for (const arrB of snapB.heroes) {
    const id  = arrB[0]
    const hB  = expandHero(arrB, heroMeta)
    const arrA = mapA[id]
    if (arrA) {
      const hA = expandHero(arrA, heroMeta)
      result.push(interpolateHero(hA, hB, frac))
    } else {
      result.push(hB)
    }
  }
  // Heroes in A but not B (died/escaped between snapshots)
  const bIds = new Set(snapB.heroes.map(a => a[0]))
  for (const arrA of snapA.heroes) {
    if (!bIds.has(arrA[0])) result.push(expandHero(arrA, heroMeta))
  }

  return result
}

/**
 * Returns notable events whose timestamp falls in (t - delta, t].
 * Used to append to the replay battle log.
 */
export function getReplayEvents(replay, t, delta = 500) {
  if (!replay) return []
  return (replay.events ?? []).filter(ev => ev.t > t - delta && ev.t <= t)
}

// ── Highlight Detection ───────────────────────────────────────────────────────

/**
 * Returns up to 3 highlight moments: { type, t, label, description }
 * The `t` values are suitable for seeking the replay scrubber.
 */
export function getHighlights(replay) {
  if (!replay) return []
  const events = replay.events ?? []
  const highlights = []

  // 1. Closest Call: treasure_reached with the lowest recorded treasureHpSnapshot
  const reaches = events.filter(e => e.type === 'treasure_reached')
  if (reaches.length > 0) {
    const withHp = reaches.filter(e => e.treasureHpSnapshot !== undefined)
    const closest = withHp.length > 0
      ? withHp.sort((a, b) => a.treasureHpSnapshot - b.treasureHpSnapshot)[0]
      : reaches[reaches.length - 1]
    highlights.push({
      type:        'closest_call',
      t:           Math.max(0, closest.t - 1500),
      label:       '🏃 Closest Call',
      description: withHp.length > 0
        ? `${closest.label} grabbed gold — treasure at ${Math.round(closest.treasureHpSnapshot)} HP`
        : `${closest.label} grabbed the gold`,
    })
  }

  // 2. Biggest Fight: 3-second window with the most kills
  const kills = events.filter(e => e.type === 'hero_killed')
  if (kills.length > 0) {
    let best = { t: kills[0].t, count: 0 }
    for (const kill of kills) {
      const count = kills.filter(k => Math.abs(k.t - kill.t) <= 1500).length
      if (count > best.count) best = { t: kill.t, count }
    }
    highlights.push({
      type:        'biggest_fight',
      t:           Math.max(0, best.t - 500),
      label:       '⚔️ Most Kills',
      description: `${best.count} hero${best.count !== 1 ? 'es' : ''} fell in 3 seconds`,
    })
  }

  // 3. Last Kill: final hero_killed, only if it was in the last 25% of the wave
  if (kills.length > 0) {
    const last = kills[kills.length - 1]
    if (!replay.waveDuration || last.t > replay.waveDuration * 0.5) {
      highlights.push({
        type:        'last_kill',
        t:           Math.max(0, last.t - 1500),
        label:       '💀 Last Kill',
        description: `${last.label} finally taken down at ${(last.t / 1000).toFixed(1)}s`,
      })
    }
  }

  return highlights
}
