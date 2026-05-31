// ── Hero Simulation Engine ──
// Heroes follow the fixed PATH_TILES centerline in order (index 0 → last).
// The path is a LOOP:
//   • index 0          = entrance  (spawn point)
//   • midpoint tile    = TREASURE  (hero picks up gold, keeps moving)
//   • index last       = entrance  (hero has escaped with the gold)
//
// Off-path towers scan for heroes within their range each tick and attack.
// On-path traps fire when a hero steps onto their tile.

import {
  TILE, TILE_SIZE, HERO_KILL_GOLD, TREASURE_HERO_DAMAGE,
  PATH_TILES, DUNGEON_TOOLS,
} from './constants.js'

// ── Hero factory ───────────────────────────────────────────────────────────

export function createHero(heroType, spawnIndex) {
  return {
    id:         `hero_${Date.now()}_${spawnIndex}`,
    type:       heroType.id,
    label:      heroType.label,
    emoji:      heroType.emoji,
    color:      heroType.color,
    hp:         heroType.hp,
    maxHp:      heroType.hp,
    speed:      heroType.speed,
    canDisarm:  heroType.canDisarm,
    heals:      heroType.heals,
    fireResist: heroType.fireResist ?? 1,
    // Path position — starts at first path tile (entrance)
    col:        PATH_TILES[0].col,
    row:        PATH_TILES[0].row,
    x:          PATH_TILES[0].col * TILE_SIZE + TILE_SIZE / 2,
    y:          PATH_TILES[0].row * TILE_SIZE + TILE_SIZE / 2,
    pathIndex:  0,
    // Status
    state:      'moving',   // moving | dead | escaped
    poisoned:   false,
    hasGold:    false,      // true after hero reaches the treasure tile
    spawnDelay: spawnIndex * 1200,
    spawned:    false,
    goldValue:  HERO_KILL_GOLD[heroType.id] ?? 30,
  }
}

// ── Main tick ──────────────────────────────────────────────────────────────
// Returns { heroes, events, treasureDamage, goldEarned, trapTimers }

export function simulationTick(heroes, grid, deltaMs, trapTimers) {
  const events = []
  let treasureDamage = 0
  let goldEarned     = 0
  const updatedHeroes = []

  // ── Pass 1: move every hero along the path ──────────────────────────────
  for (let hero of heroes) {
    if (hero.state === 'dead' || hero.state === 'escaped') {
      updatedHeroes.push(hero)
      continue
    }

    // Spawn delay countdown
    if (!hero.spawned) {
      hero = { ...hero, spawnDelay: hero.spawnDelay - deltaMs }
      if (hero.spawnDelay > 0) { updatedHeroes.push(hero); continue }
      hero = { ...hero, spawned: true, spawnDelay: 0 }
    }

    // Poison damage-over-time (3 HP/s)
    if (hero.poisoned) {
      hero = { ...hero, hp: hero.hp - 3 * (deltaMs / 1000) }
    }

    // Paladin heals adjacent allies already in updatedHeroes
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
      // Already at the very last tile (entrance / escape point)
      events.push({ type: 'hero_escaped', hero: hero.id, label: hero.label, hadGold: hero.hasGold })
      hero = { ...hero, state: 'escaped' }
      updatedHeroes.push(hero)
      continue
    }

    const targetX  = nextTile.col * TILE_SIZE + TILE_SIZE / 2
    const targetY  = nextTile.row * TILE_SIZE + TILE_SIZE / 2
    const dx       = targetX - hero.x
    const dy       = targetY - hero.y
    const dist     = Math.sqrt(dx * dx + dy * dy)

    // Iron Door slows the hero while they stand on it
    const curTileId = grid[hero.row]?.[hero.col]
    const doorDef   = curTileId === TILE.DOOR ? DUNGEON_TOOLS.find(t => t.id === TILE.DOOR) : null
    const speedMult = doorDef?.slow ?? 1
    const moveSpeed = hero.speed * TILE_SIZE * (deltaMs / 1000) * speedMult

    if (dist <= moveSpeed) {
      // ── Arrived at nextTile ──
      hero = {
        ...hero,
        x: targetX, y: targetY,
        col: nextTile.col, row: nextTile.row,
        pathIndex: hero.pathIndex + 1,
      }

      // Check the tile we just stepped onto
      const arrivedTileId = grid[nextTile.row]?.[nextTile.col]

      // Gold pickup — happens exactly once when the hero first reaches TREASURE
      if (arrivedTileId === TILE.TREASURE && !hero.hasGold) {
        hero = { ...hero, hasGold: true }
        treasureDamage += TREASURE_HERO_DAMAGE
        events.push({ type: 'treasure_reached', hero: hero.id, label: hero.label })
        // Hero keeps moving — does NOT escape here
      }

      // On-path trap interaction (spike, boulder)
      if (
        arrivedTileId &&
        arrivedTileId !== TILE.PATH   &&
        arrivedTileId !== TILE.ENTRANCE &&
        arrivedTileId !== TILE.TREASURE &&
        arrivedTileId !== TILE.DOOR
      ) {
        const result = handleOnPathTrap(hero, arrivedTileId, nextTile, events)
        hero = result.hero
      }

      // Escape check — hero completes the full loop back to entrance
      if (hero.pathIndex >= PATH_TILES.length - 1) {
        events.push({ type: 'hero_escaped', hero: hero.id, label: hero.label, hadGold: hero.hasGold })
        hero = { ...hero, state: 'escaped' }
        updatedHeroes.push(hero)
        continue
      }
    } else {
      // Still moving toward next tile
      hero = {
        ...hero,
        x: hero.x + (dx / dist) * moveSpeed,
        y: hero.y + (dy / dist) * moveSpeed,
      }
    }

    // Death from poison DoT (or trap damage applied above)
    if (hero.hp <= 0 && hero.state === 'moving') {
      hero = { ...hero, state: 'dead', hp: 0 }
      goldEarned += hero.goldValue
      events.push({ type: 'hero_killed', hero: hero.id, label: hero.label, gold: hero.goldValue })
    }

    updatedHeroes.push(hero)
  }

  // ── Pass 2: off-path tower range attacks ─────────────────────────────────
  const updatedTimers = { ...trapTimers }

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const tileId  = grid[r][c]
      const toolDef = DUNGEON_TOOLS.find(t => t.id === tileId && t.range)
      if (!toolDef) continue

      const key = `tower_${c},${r}`
      // Advance cooldown; initialise to full attackSpeed so first shot is immediate
      updatedTimers[key] = (updatedTimers[key] ?? toolDef.attackSpeed) + deltaMs
      if (updatedTimers[key] < toolDef.attackSpeed) continue

      // Pick closest hero in range
      let target = null, closestDist = Infinity
      for (const h of updatedHeroes) {
        if (!h.spawned || h.state !== 'moving') continue
        const tileDist = Math.sqrt((h.col - c) ** 2 + (h.row - r) ** 2)
        if (tileDist <= toolDef.range && tileDist < closestDist) {
          target = h; closestDist = tileDist
        }
      }

      if (target) {
        const idx = updatedHeroes.indexOf(target)
        if (idx >= 0) {
          let dmg = toolDef.damage
          // Mage fire resistance
          if (tileId === TILE.FIRE && updatedHeroes[idx].fireResist !== undefined) {
            dmg = Math.round(dmg * updatedHeroes[idx].fireResist)
          }

          updatedHeroes[idx] = {
            ...updatedHeroes[idx],
            hp:      updatedHeroes[idx].hp - dmg,
            poisoned: updatedHeroes[idx].poisoned || (toolDef.poisonOnHit ?? false),
          }

          // Death from tower hit
          if (updatedHeroes[idx].hp <= 0 && updatedHeroes[idx].state === 'moving') {
            goldEarned += updatedHeroes[idx].goldValue
            events.push({ type: 'hero_killed', hero: updatedHeroes[idx].id, label: updatedHeroes[idx].label, gold: updatedHeroes[idx].goldValue })
            updatedHeroes[idx] = { ...updatedHeroes[idx], state: 'dead', hp: 0 }
          }

          updatedTimers[key] = 0
          events.push({
            type: 'tower_attack', col: c, row: r, heroId: target.id,
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
    default:
      return { hero }
  }
}
