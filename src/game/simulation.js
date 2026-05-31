// ── Hero Simulation Engine ──
// Heroes follow the fixed PATH_TILES in order.
// Off-path towers scan for heroes within range each tick and attack.
// On-path traps trigger when a hero steps on their tile.

import {
  TILE, TILE_SIZE, HERO_KILL_GOLD, TREASURE_HERO_DAMAGE,
  PATH_TILES, DUNGEON_TOOLS,
} from './constants.js'

export function createHero(heroType, spawnIndex) {
  return {
    id: `hero_${Date.now()}_${spawnIndex}`,
    type: heroType.id,
    label: heroType.label,
    emoji: heroType.emoji,
    color: heroType.color,
    hp: heroType.hp,
    maxHp: heroType.hp,
    speed: heroType.speed,
    canDisarm: heroType.canDisarm,
    heals: heroType.heals,
    fireResist: heroType.fireResist ?? 1,
    // Position — start at entrance (first path tile)
    col: PATH_TILES[0].col,
    row: PATH_TILES[0].row,
    x: PATH_TILES[0].col * TILE_SIZE + TILE_SIZE / 2,
    y: PATH_TILES[0].row * TILE_SIZE + TILE_SIZE / 2,
    // Path progress
    pathIndex: 0,         // current index in PATH_TILES
    // State
    state: 'moving',      // moving | dead | escaped
    poisoned: false,
    spawnDelay: spawnIndex * 1200,
    spawned: false,
    goldValue: HERO_KILL_GOLD[heroType.id] ?? 30,
  }
}

// ── Main tick ──
// Returns { heroes, events, treasureDamage, goldEarned, trapTimers }
export function simulationTick(heroes, grid, deltaMs, trapTimers) {
  const events = []
  let treasureDamage = 0
  let goldEarned = 0
  const updatedHeroes = []

  // ── Pass 1: move heroes along the fixed path ──
  for (let hero of heroes) {
    if (hero.state === 'dead' || hero.state === 'escaped') {
      updatedHeroes.push(hero)
      continue
    }

    // Handle spawn delay
    if (!hero.spawned) {
      hero = { ...hero, spawnDelay: hero.spawnDelay - deltaMs }
      if (hero.spawnDelay > 0) {
        updatedHeroes.push(hero)
        continue
      }
      hero = { ...hero, spawned: true, spawnDelay: 0 }
    }

    // Poison DoT — 3 HP/s
    if (hero.poisoned) {
      hero = { ...hero, hp: hero.hp - 3 * (deltaMs / 1000) }
    }

    // Paladin passive heal — 5 HP/s to adjacent allies already processed
    if (hero.heals) {
      for (let other of updatedHeroes) {
        const dist = Math.abs(other.col - hero.col) + Math.abs(other.row - hero.row)
        if (dist <= 1 && other.state === 'moving' && other.hp < other.maxHp) {
          other.hp = Math.min(other.maxHp, other.hp + 5 * (deltaMs / 1000))
        }
      }
    }

    // Move along path
    const nextTile = PATH_TILES[hero.pathIndex + 1]

    if (!nextTile) {
      // Hero is already at the treasure tile
      treasureDamage += TREASURE_HERO_DAMAGE
      events.push({ type: 'treasure_reached', hero: hero.id, label: hero.label })
      hero = { ...hero, state: 'escaped' }
      updatedHeroes.push(hero)
      continue
    }

    const targetX = nextTile.col * TILE_SIZE + TILE_SIZE / 2
    const targetY = nextTile.row * TILE_SIZE + TILE_SIZE / 2
    const dx = targetX - hero.x
    const dy = targetY - hero.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Speed reduced if currently standing on a slowing tile (Iron Door)
    const curTileId = grid[hero.row]?.[hero.col]
    const doorDef = curTileId === TILE.DOOR
      ? DUNGEON_TOOLS.find(t => t.id === TILE.DOOR)
      : null
    const speedMult = doorDef?.slow ?? 1
    const moveSpeed = hero.speed * TILE_SIZE * (deltaMs / 1000) * speedMult

    if (dist <= moveSpeed) {
      // Arrived at next path tile
      hero = {
        ...hero,
        x: targetX,
        y: targetY,
        col: nextTile.col,
        row: nextTile.row,
        pathIndex: hero.pathIndex + 1,
      }

      // Check for on-path trap at the tile we just arrived at
      const tileId = grid[nextTile.row]?.[nextTile.col]
      if (tileId && tileId !== TILE.PATH && tileId !== TILE.ENTRANCE && tileId !== TILE.TREASURE && tileId !== TILE.DOOR) {
        const result = handleOnPathTrap(hero, tileId, nextTile, events)
        hero = result.hero
      }

      // If hero just reached the last tile (treasure), mark escaped
      if (hero.pathIndex >= PATH_TILES.length - 1) {
        treasureDamage += TREASURE_HERO_DAMAGE
        events.push({ type: 'treasure_reached', hero: hero.id, label: hero.label })
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

    // Death check (can happen from poison DoT between waypoints)
    if (hero.hp <= 0 && hero.state === 'moving') {
      hero = { ...hero, state: 'dead', hp: 0 }
      goldEarned += hero.goldValue
      events.push({ type: 'hero_killed', hero: hero.id, label: hero.label, gold: hero.goldValue })
    }

    updatedHeroes.push(hero)
  }

  // ── Pass 2: tower range attacks ──
  // Advance all tower cooldown timers, then fire if ready.
  const updatedTimers = { ...trapTimers }

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const tileId = grid[r][c]
      const toolDef = DUNGEON_TOOLS.find(t => t.id === tileId && t.range)
      if (!toolDef) continue

      const timerKey = `tower_${c},${r}`
      // Advance cooldown (initialise to full attack speed so first attack is immediate)
      updatedTimers[timerKey] = (updatedTimers[timerKey] ?? toolDef.attackSpeed) + deltaMs

      if (updatedTimers[timerKey] < toolDef.attackSpeed) continue  // still on cooldown

      // Find closest hero in range
      let target = null
      let closestDist = Infinity
      for (const h of updatedHeroes) {
        if (!h.spawned || h.state !== 'moving') continue
        const dx = h.col - c
        const dy = h.row - r
        const tileDist = Math.sqrt(dx * dx + dy * dy)
        if (tileDist <= toolDef.range && tileDist < closestDist) {
          target = h
          closestDist = tileDist
        }
      }

      if (target) {
        const idx = updatedHeroes.indexOf(target)
        if (idx >= 0) {
          // Mage fire resistance
          let dmg = toolDef.damage
          if (tileId === TILE.FIRE && updatedHeroes[idx].fireResist !== undefined) {
            dmg = Math.round(dmg * updatedHeroes[idx].fireResist)
          }
          updatedHeroes[idx] = {
            ...updatedHeroes[idx],
            hp: updatedHeroes[idx].hp - dmg,
            poisoned: updatedHeroes[idx].poisoned || (toolDef.poisonOnHit ?? false),
          }

          // Death check after tower hit
          if (updatedHeroes[idx].hp <= 0 && updatedHeroes[idx].state === 'moving') {
            goldEarned += updatedHeroes[idx].goldValue
            events.push({ type: 'hero_killed', hero: updatedHeroes[idx].id, label: updatedHeroes[idx].label, gold: updatedHeroes[idx].goldValue })
            updatedHeroes[idx] = { ...updatedHeroes[idx], state: 'dead', hp: 0 }
          }

          updatedTimers[timerKey] = 0  // reset attack cooldown
          events.push({
            type: 'tower_attack',
            col: c, row: r,
            heroId: target.id,
            damage: dmg,
            towerType: tileId,
            // pixel coords for rendering attack line
            fromX: c * TILE_SIZE + TILE_SIZE / 2,
            fromY: r * TILE_SIZE + TILE_SIZE / 2,
            toX: target.x,
            toY: target.y,
          })
        }
      }
    }
  }

  return { heroes: updatedHeroes, events, treasureDamage, goldEarned, trapTimers: updatedTimers }
}

// ── On-path trap interactions ──
// Called when a hero arrives on a path tile that contains a trap.
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
      // Boulder is single-use — caller should clear the tile; we just deal damage here
      return { hero: { ...hero, hp: hero.hp - 60 } }
    }

    default:
      return { hero }
  }
}
