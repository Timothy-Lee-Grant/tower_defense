// ── Hero Simulation Engine ──
//
// Path is a LOOP: entrance → treasure (gold pickup) → entrance (escape).
// Heroes only truly escape when they complete the full loop.
//
// Per-tick order:
//   1. Spawn countdown
//   2. Status effects (poison DoT, slow timer, lava DoT)
//   3. Paladin heal
//   4. Movement along PATH_TILES
//   5. On-arrival tile checks (treasure pickup, on-path traps)
//   6. Death check
//   7. Off-path tower range attacks (second full pass)

import {
  TILE, TILE_SIZE,
  HERO_KILL_GOLD, GOLD_CARRYING_BONUS,
  TREASURE_HERO_DAMAGE, HERO_SPAWN_STAGGER_MS,
  PATH_TILES, DUNGEON_TOOLS,
} from './constants.js'

// ── Hero factory ───────────────────────────────────────────────────────────

export function createHero(heroType, spawnIndex) {
  return {
    id:             `hero_${Date.now()}_${spawnIndex}`,
    type:           heroType.id,
    label:          heroType.label,
    emoji:          heroType.emoji,
    color:          heroType.color,
    hp:             heroType.hp,
    maxHp:          heroType.hp,
    speed:          heroType.speed,
    canDisarm:      heroType.canDisarm,
    heals:          heroType.heals,
    fireResist:     heroType.fireResist ?? 1,
    goldSpeedMult:  heroType.goldSpeedMult ?? 1,
    // Pixel/grid position — starts at entrance (PATH_TILES[0])
    col:            PATH_TILES[0].col,
    row:            PATH_TILES[0].row,
    x:              PATH_TILES[0].col * TILE_SIZE + TILE_SIZE / 2,
    y:              PATH_TILES[0].row * TILE_SIZE + TILE_SIZE / 2,
    pathIndex:      0,
    // State
    state:          'moving',   // moving | dead | escaped
    poisoned:       false,
    slowed:         false,
    slowTimer:      0,          // ms of slow remaining
    hasGold:        false,
    spawnDelay:     spawnIndex * HERO_SPAWN_STAGGER_MS,
    spawned:        false,
    goldValue:      HERO_KILL_GOLD[heroType.id] ?? 30,
  }
}

// ── Main tick ──────────────────────────────────────────────────────────────
// Returns { heroes, events, treasureDamage, goldEarned, trapTimers }

export function simulationTick(heroes, grid, deltaMs, trapTimers) {
  const events = []
  let treasureDamage = 0
  let goldEarned     = 0
  const updatedHeroes = []

  // ── Pass 1: hero movement and status effects ───────────────────────────
  for (let hero of heroes) {
    if (hero.state === 'dead' || hero.state === 'escaped') {
      updatedHeroes.push(hero)
      continue
    }

    // Spawn countdown
    if (!hero.spawned) {
      hero = { ...hero, spawnDelay: hero.spawnDelay - deltaMs }
      if (hero.spawnDelay > 0) { updatedHeroes.push(hero); continue }
      hero = { ...hero, spawned: true, spawnDelay: 0 }
    }

    // ── Status effects ──

    // Slow timer countdown
    if (hero.slowed) {
      const newTimer = hero.slowTimer - deltaMs
      hero = newTimer > 0
        ? { ...hero, slowTimer: newTimer }
        : { ...hero, slowed: false, slowTimer: 0 }
    }

    // Poison DoT — 3 HP/s
    if (hero.poisoned) {
      hero = { ...hero, hp: hero.hp - 3 * (deltaMs / 1000) }
    }

    // Lava DoT — 15 HP/s while standing on a LAVA tile
    const curTileId = grid[hero.row]?.[hero.col]
    if (curTileId === TILE.LAVA) {
      hero = { ...hero, hp: hero.hp - 15 * (deltaMs / 1000) }
      events.push({ type: 'lava_damage', heroId: hero.id })
    }

    // Paladin passive heal — 5 HP/s to adjacent allies already queued
    if (hero.heals) {
      for (const other of updatedHeroes) {
        const d = Math.abs(other.col - hero.col) + Math.abs(other.row - hero.row)
        if (d <= 1 && other.state === 'moving' && other.hp < other.maxHp) {
          other.hp = Math.min(other.maxHp, other.hp + 5 * (deltaMs / 1000))
        }
      }
    }

    // ── Movement ──

    const nextTile = PATH_TILES[hero.pathIndex + 1]

    if (!nextTile) {
      // Already at the last tile (entrance = escape point)
      events.push({ type: 'hero_escaped', hero: hero.id, label: hero.label, hadGold: hero.hasGold })
      updatedHeroes.push({ ...hero, state: 'escaped' })
      continue
    }

    const targetX = nextTile.col * TILE_SIZE + TILE_SIZE / 2
    const targetY = nextTile.row * TILE_SIZE + TILE_SIZE / 2
    const dx      = targetX - hero.x
    const dy      = targetY - hero.y
    const dist    = Math.sqrt(dx * dx + dy * dy)

    // Speed modifiers stack multiplicatively
    const doorSlow   = curTileId === TILE.DOOR
      ? (DUNGEON_TOOLS.find(t => t.id === TILE.DOOR)?.slow ?? 1) : 1
    const goldMult   = hero.hasGold ? hero.goldSpeedMult : 1
    const slowMult   = hero.slowed  ? 0.5 : 1
    const moveSpeed  = hero.speed * TILE_SIZE * (deltaMs / 1000) * doorSlow * goldMult * slowMult

    if (dist <= moveSpeed) {
      // Arrived at next path tile
      hero = {
        ...hero,
        x: targetX, y: targetY,
        col: nextTile.col, row: nextTile.row,
        pathIndex: hero.pathIndex + 1,
      }

      const arrivedId = grid[nextTile.row]?.[nextTile.col]

      // Gold pickup — fires exactly once
      if (arrivedId === TILE.TREASURE && !hero.hasGold) {
        hero = { ...hero, hasGold: true }
        treasureDamage += TREASURE_HERO_DAMAGE
        events.push({ type: 'treasure_reached', hero: hero.id, label: hero.label })
      }

      // On-path trap interactions
      if (
        arrivedId &&
        arrivedId !== TILE.PATH     &&
        arrivedId !== TILE.ENTRANCE &&
        arrivedId !== TILE.TREASURE &&
        arrivedId !== TILE.DOOR
      ) {
        const result = handleOnPathTrap(hero, arrivedId, nextTile, events)
        hero = result.hero
      }

      // Escape check — completed the full loop
      if (hero.pathIndex >= PATH_TILES.length - 1) {
        events.push({ type: 'hero_escaped', hero: hero.id, label: hero.label, hadGold: hero.hasGold })
        updatedHeroes.push({ ...hero, state: 'escaped' })
        continue
      }
    } else {
      hero = {
        ...hero,
        x: hero.x + (dx / dist) * moveSpeed,
        y: hero.y + (dy / dist) * moveSpeed,
      }
    }

    // Death check (poison DoT, lava, or trap damage)
    if (hero.hp <= 0 && hero.state === 'moving') {
      const bonus = hero.hasGold ? GOLD_CARRYING_BONUS : 0
      goldEarned += hero.goldValue + bonus
      events.push({
        type: 'hero_killed', hero: hero.id, label: hero.label,
        gold: hero.goldValue + bonus, hadGold: hero.hasGold,
      })
      updatedHeroes.push({ ...hero, state: 'dead', hp: 0 })
      continue
    }

    updatedHeroes.push(hero)
  }

  // ── Pass 2: off-path tower range attacks ───────────────────────────────
  const updatedTimers = { ...trapTimers }

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const tileId  = grid[r][c]
      const toolDef = DUNGEON_TOOLS.find(t => t.id === tileId && t.range)
      if (!toolDef) continue

      const key = `tower_${c},${r}`
      updatedTimers[key] = (updatedTimers[key] ?? toolDef.attackSpeed) + deltaMs
      if (updatedTimers[key] < toolDef.attackSpeed) continue

      // Target: closest hero within range
      let target = null, closestDist = Infinity
      for (const h of updatedHeroes) {
        if (!h.spawned || h.state !== 'moving') continue
        const d = Math.sqrt((h.col - c) ** 2 + (h.row - r) ** 2)
        if (d <= toolDef.range && d < closestDist) { target = h; closestDist = d }
      }

      if (target) {
        const idx = updatedHeroes.indexOf(target)
        if (idx >= 0) {
          let dmg = toolDef.damage
          // Mage fire resistance
          if (tileId === TILE.FIRE) dmg = Math.round(dmg * (updatedHeroes[idx].fireResist ?? 1))

          const updates = {
            hp:      updatedHeroes[idx].hp - dmg,
            poisoned: updatedHeroes[idx].poisoned || (toolDef.poisonOnHit  ?? false),
            slowed:   updatedHeroes[idx].slowed   || (toolDef.slowOnHit    ?? false),
            slowTimer: toolDef.slowOnHit
              ? Math.max(updatedHeroes[idx].slowTimer, 2000)
              : updatedHeroes[idx].slowTimer,
          }
          updatedHeroes[idx] = { ...updatedHeroes[idx], ...updates }

          // Death from tower attack
          if (updatedHeroes[idx].hp <= 0 && updatedHeroes[idx].state === 'moving') {
            const bonus = updatedHeroes[idx].hasGold ? GOLD_CARRYING_BONUS : 0
            goldEarned += updatedHeroes[idx].goldValue + bonus
            events.push({
              type: 'hero_killed', hero: updatedHeroes[idx].id, label: updatedHeroes[idx].label,
              gold: updatedHeroes[idx].goldValue + bonus, hadGold: updatedHeroes[idx].hasGold,
            })
            updatedHeroes[idx] = { ...updatedHeroes[idx], state: 'dead', hp: 0 }
          }

          updatedTimers[key] = 0
          events.push({
            type: 'tower_attack', col: c, row: r,
            towerType: tileId,   // needed by renderer to pick the right animation
            heroId: target.id,
            fromX: c * TILE_SIZE + TILE_SIZE / 2,
            fromY: r * TILE_SIZE + TILE_SIZE / 2,
            toX: target.x, toY: target.y,
          })
        }
      }
    }
  }

  return { heroes: updatedHeroes, events, treasureDamage, goldEarned, trapTimers: updatedTimers }
}

// ── On-path trap interactions ──────────────────────────────────────────────
function handleOnPathTrap(hero, tileId, tilePos, events) {
  const trapKey = `${tilePos.col},${tilePos.row}`

  switch (tileId) {
    case TILE.SPIKE: {
      if (hero.canDisarm) {
        events.push({ type: 'trap_disarmed', trapKey, label: hero.label })
        return { hero }
      }
      events.push({ type: 'trap_triggered', trapKey, trap: 'spike', label: hero.label })
      return { hero: { ...hero, hp: hero.hp - 25 } }
    }
    case TILE.BOULDER: {
      events.push({ type: 'trap_triggered', trapKey, trap: 'boulder', label: hero.label })
      return { hero: { ...hero, hp: hero.hp - 60 } }
    }
    // LAVA damage is handled per-tick above, not on arrival
    default:
      return { hero }
  }
}
