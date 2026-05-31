// ── Hero Simulation Engine ──
// Runs each animation frame during Wave Phase.
// Returns updated hero list and any events (trap triggers, deaths, etc.)

import { TILE, TILE_SIZE, HERO_KILL_GOLD, TREASURE_HERO_DAMAGE } from './constants.js'
import { findPath } from './pathfinding.js'

export function createHero(heroType, spawnIndex, entrance) {
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
    detectsTraps: heroType.detectsTraps,
    heals: heroType.heals,
    fearFire: heroType.fearFire,
    fearSpike: heroType.fearSpike,
    // Grid position
    col: entrance.col,
    row: entrance.row,
    // Pixel position (for smooth animation)
    x: entrance.col * TILE_SIZE + TILE_SIZE / 2,
    y: entrance.row * TILE_SIZE + TILE_SIZE / 2,
    // Pathfinding state
    path: [],
    pathIndex: 0,
    // State machine
    state: 'moving', // moving | disarming | fighting | dead | escaped
    disarmTimer: 0,
    fightTarget: null,
    spawnDelay: spawnIndex * 1200, // ms stagger between spawns
    spawned: false,
    // Tracking
    goldValue: HERO_KILL_GOLD[heroType.id] ?? 30,
  }
}

// Returns { heroes, events, treasureDamage, goldEarned }
export function simulationTick(heroes, grid, entrance, treasure, deltaMs, trapTimers) {
  const events = []
  let treasureDamage = 0
  let goldEarned = 0
  const updatedHeroes = []

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
      // Calculate initial path
      const path = findPath(grid, entrance, treasure, hero)
      hero = { ...hero, path, pathIndex: 0 }
    }

    // Check if hero reached treasure
    if (hero.col === treasure.col && hero.row === treasure.row) {
      treasureDamage += TREASURE_HERO_DAMAGE
      events.push({ type: 'treasure_reached', hero: hero.id, label: hero.label })
      hero = { ...hero, state: 'escaped' }
      updatedHeroes.push(hero)
      continue
    }

    // Move along path
    if (hero.state === 'moving' && hero.path.length > 0) {
      const target = hero.path[hero.pathIndex]
      if (!target) {
        updatedHeroes.push(hero)
        continue
      }

      const targetX = target.col * TILE_SIZE + TILE_SIZE / 2
      const targetY = target.row * TILE_SIZE + TILE_SIZE / 2
      const dx = targetX - hero.x
      const dy = targetY - hero.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const moveSpeed = hero.speed * TILE_SIZE * (deltaMs / 1000)

      if (dist <= moveSpeed) {
        // Arrived at tile
        hero = {
          ...hero,
          x: targetX,
          y: targetY,
          col: target.col,
          row: target.row,
          pathIndex: hero.pathIndex + 1,
        }

        // Check tile under hero
        const tileId = grid[target.row]?.[target.col]
        if (tileId) {
          const result = handleTileInteraction(hero, tileId, target, events, trapTimers)
          hero = result.hero
          if (result.goldEarned) goldEarned += result.goldEarned
        }

        // Recalculate path occasionally (every 4 steps) for dynamic adjustment
        if (hero.pathIndex % 4 === 0 && hero.state === 'moving') {
          const newPath = findPath(grid, { col: hero.col, row: hero.row }, treasure, hero)
          hero = { ...hero, path: newPath, pathIndex: 0 }
        }
      } else {
        // Move toward target
        hero = {
          ...hero,
          x: hero.x + (dx / dist) * moveSpeed,
          y: hero.y + (dy / dist) * moveSpeed,
        }
      }
    }

    // Paladin passive heal
    if (hero.heals && hero.state === 'moving') {
      for (let other of updatedHeroes) {
        const dx = Math.abs(other.col - hero.col)
        const dy = Math.abs(other.row - hero.row)
        if (dx + dy <= 1 && other.state === 'moving' && other.hp < other.maxHp) {
          other.hp = Math.min(other.maxHp, other.hp + (5 * deltaMs / 1000))
        }
      }
    }

    // Death check
    if (hero.hp <= 0 && hero.state !== 'dead') {
      hero = { ...hero, state: 'dead', hp: 0 }
      goldEarned += hero.goldValue
      events.push({ type: 'hero_killed', hero: hero.id, label: hero.label, gold: hero.goldValue })
    }

    updatedHeroes.push(hero)
  }

  return { heroes: updatedHeroes, events, treasureDamage, goldEarned }
}

function handleTileInteraction(hero, tileId, tilePos, events, trapTimers) {
  const trapKey = `${tilePos.col},${tilePos.row}`

  switch (tileId) {
    case TILE.SPIKE: {
      // Pressure plate - triggers on step
      if (hero.canDisarm) {
        events.push({ type: 'trap_disarmed', trapKey, label: hero.label })
        return { hero }
      }
      events.push({ type: 'trap_triggered', trapKey, trap: 'spike' })
      return { hero: { ...hero, hp: hero.hp - 25 } }
    }

    case TILE.FIRE: {
      // Only damages if timer is in the "active" phase
      const timer = trapTimers[trapKey] ?? 0
      const inBurst = (timer % 4000) < 1000 // active 1s out of every 4s
      if (inBurst) {
        events.push({ type: 'trap_triggered', trapKey, trap: 'fire' })
        return { hero: { ...hero, hp: hero.hp - 35 } }
      }
      return { hero }
    }

    case TILE.POISON: {
      events.push({ type: 'trap_triggered', trapKey, trap: 'poison' })
      return { hero: { ...hero, hp: hero.hp - 10, poisoned: true } }
    }

    case TILE.BOULDER: {
      events.push({ type: 'trap_triggered', trapKey, trap: 'boulder' })
      return { hero: { ...hero, hp: hero.hp - 60 } }
    }

    case TILE.SKELETON:
    case TILE.SLIME: {
      // Simple: monster deals damage when hero enters its tile
      const monsterDmg = tileId === TILE.SKELETON ? 20 : 8
      events.push({ type: 'combat', trapKey, monster: tileId })
      return { hero: { ...hero, hp: hero.hp - monsterDmg } }
    }

    default:
      return { hero }
  }
}
