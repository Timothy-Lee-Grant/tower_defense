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

// hpMult scales HP and healing proportionally to the wave's difficulty.
// Healing scales as sqrt(hpMult) so healers stay useful but don't trivialise damage.
// goldValue scales so kill rewards reflect the effort involved.
export function createHero(heroType, spawnIndex, hpMult = 1) {
  const scaledHp    = Math.round(heroType.hp * hpMult)
  const healScale   = Math.sqrt(hpMult)    // gentler scaling so healing never trivialises damage
  const baseGold    = HERO_KILL_GOLD[heroType.id] ?? 30
  return {
    id:             `hero_${Date.now()}_${spawnIndex}`,
    type:           heroType.id,
    label:          heroType.label,
    emoji:          heroType.emoji,
    color:          heroType.color,
    hp:             scaledHp,
    maxHp:          scaledHp,
    baseMaxHp:      scaledHp,   // original max — used to visualise bat-drain desaturation
    speed:          heroType.speed,
    canDisarm:      heroType.canDisarm,
    heals:          heroType.heals,
    stasisTimer:    0,   // > 0 = frozen; immune to damage, can't move
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
    slowTimer:      0,
    hasGold:        false,
    spawnDelay:     spawnIndex * HERO_SPAWN_STAGGER_MS,
    spawned:        false,
    goldValue:      Math.round(baseGold * Math.max(1, hpMult * 0.65)),
    // Abilities (scale healing with healScale so they remain proportionally relevant)
    immuneToSlow:    heroType.immuneToSlow    ?? false,
    immuneToPoison:  heroType.immuneToPoison  ?? false,
    damageReduction: heroType.damageReduction ?? 0,
    boulderResist:   heroType.boulderResist   ?? false,
    healAmount:      +((heroType.healAmount   ?? 5)  * healScale).toFixed(1),
    selfHealRate:    +((heroType.selfHealRate  ?? 0)  * healScale).toFixed(1),
    partyHealRate:   +((heroType.partyHealRate ?? 0)  * healScale).toFixed(1),
    curseStacks:     0,
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

    // ── Stasis: frozen hero — immune to damage, can't move ──────────────────
    if (hero.stasisTimer > 0) {
      hero = { ...hero, stasisTimer: Math.max(0, hero.stasisTimer - deltaMs) }
      updatedHeroes.push(hero)
      continue
    }

    // ── Status effects ──

    // Slow timer countdown
    if (hero.slowed) {
      const newTimer = hero.slowTimer - deltaMs
      hero = newTimer > 0
        ? { ...hero, slowTimer: newTimer }
        : { ...hero, slowed: false, slowTimer: 0 }
    }

    // Poison DoT — 3 HP/s (ignored by immuneToPoison heroes)
    if (hero.poisoned && !hero.immuneToPoison) {
      const dmg = 3 * (deltaMs / 1000) * (1 - hero.damageReduction)
      hero = { ...hero, hp: hero.hp - dmg }
    }

    // Tile DoT: lava (15 HP/s) and tar (15 HP/s Berserker-only)
    const curTileId = grid[hero.row]?.[hero.col]
    if (curTileId === TILE.LAVA) {
      const dmg = 15 * (deltaMs / 1000) * (1 - hero.damageReduction)
      hero = { ...hero, hp: hero.hp - dmg }
      events.push({ type: 'lava_damage', heroId: hero.id })
    }
    if (curTileId === TILE.TAR && hero.immuneToSlow) {
      // Berserkers can't be slowed by tar, but it burns them
      const dmg = 15 * (deltaMs / 1000) * (1 - hero.damageReduction)
      hero = { ...hero, hp: hero.hp - dmg }
    }

    // Self-regen (mage, archmage)
    if (hero.selfHealRate > 0 && hero.hp < hero.maxHp) {
      hero = { ...hero, hp: Math.min(hero.maxHp, hero.hp + hero.selfHealRate * (deltaMs / 1000)) }
    }

    // Soft party heal (mage, archmage) — slight aura for adjacent allies
    if (hero.partyHealRate > 0) {
      for (const other of updatedHeroes) {
        const d = Math.abs(other.col - hero.col) + Math.abs(other.row - hero.row)
        if (d <= 1 && other.state === 'moving' && other.hp < other.maxHp) {
          other.hp = Math.min(other.maxHp, other.hp + hero.partyHealRate * (deltaMs / 1000))
        }
      }
    }

    // Dedicated healer passive — strong party healing (paladin, cleric)
    if (hero.heals) {
      const rate = hero.healAmount ?? 5
      for (const other of updatedHeroes) {
        const d = Math.abs(other.col - hero.col) + Math.abs(other.row - hero.row)
        if (d <= 1 && other.state === 'moving' && other.hp < other.maxHp) {
          other.hp = Math.min(other.maxHp, other.hp + rate * (deltaMs / 1000))
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
    const doorSlow = curTileId === TILE.DOOR
      ? (DUNGEON_TOOLS.find(t => t.id === TILE.DOOR)?.slow ?? 1) : 1
    // Tar: 0.25× speed for non-Berserkers (Berserkers immune to slow, take DoT instead)
    const tarSlow  = (curTileId === TILE.TAR && !hero.immuneToSlow) ? 0.25 : 1
    const goldMult = hero.hasGold ? hero.goldSpeedMult : 1
    const slowMult = hero.slowed  ? 0.5 : 1
    const moveSpeed = hero.speed * TILE_SIZE * (deltaMs / 1000) * doorSlow * tarSlow * goldMult * slowMult

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
        arrivedId !== TILE.DOOR     &&
        arrivedId !== TILE.TAR        // tar is handled as continuous DoT above
      ) {
        const result = handleOnPathTrap(hero, arrivedId, nextTile, events, updatedHeroes, updatedTimers)
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

      // ── Target selection ────────────────────────────────────────────
      const inRange = updatedHeroes.filter(h =>
        h.spawned && h.state === 'moving' &&
        (h.stasisTimer ?? 0) <= 0 &&          // frozen heroes are immune to tower attacks
        Math.sqrt((h.col - c) ** 2 + (h.row - r) ** 2) <= toolDef.range
      )
      if (inRange.length === 0) continue

      const closest = pool => pool.reduce((a, b) =>
        Math.sqrt((a.col-c)**2+(a.row-r)**2) <= Math.sqrt((b.col-c)**2+(b.row-r)**2) ? a : b
      )

      let targets
      if (toolDef.aoeAttack) {
        // Cave Troll: hit every hero in range at once
        targets = inRange
      } else if (toolDef.targetGoldCarriers) {
        // Shadow Stalker: gold-carriers first, else closest
        const carriers = inRange.filter(h => h.hasGold)
        targets = [closest(carriers.length > 0 ? carriers : inRange)]
      } else if (toolDef.targetFarthest) {
        // Gargoyle: most advanced hero (highest pathIndex)
        targets = [inRange.reduce((a, b) => a.pathIndex >= b.pathIndex ? a : b)]
      } else {
        // Default: closest hero
        targets = [closest(inRange)]
      }

      updatedTimers[key] = 0

      // ── Apply damage to each target ─────────────────────────────────
      for (const target of targets) {
        const idx = updatedHeroes.indexOf(target)
        if (idx < 0) continue
        const h = updatedHeroes[idx]

        let dmg = toolDef.damage
        // Elemental resistances
        if (tileId === TILE.FIRE) dmg = Math.round(dmg * (h.fireResist ?? 1))
        // Flat damage reduction (champion)
        dmg = Math.round(dmg * (1 - h.damageReduction))
        // Curse stacks amplify all tower damage (+15% per stack)
        if (h.curseStacks > 0) dmg = Math.round(dmg * (1 + h.curseStacks * 0.15))
        // Shadow Stalker double damage vs gold carriers
        if (toolDef.targetGoldCarriers && h.hasGold) dmg = dmg * 2

        // Cursed Idol: emit event so battle log can surface new stacks
        if (toolDef.curseOnHit && h.curseStacks < 3) {
          events.push({
            type:   'curse_applied',
            label:  h.label,
            stacks: Math.min(3, h.curseStacks + 1),
          })
        }

        // Vampire Bat drain: permanently reduce maxHp
        const newMaxHp = toolDef.drainOnHit
          ? Math.max(1, h.maxHp - dmg)
          : h.maxHp

        updatedHeroes[idx] = {
          ...h,
          hp:          h.hp - dmg,
          maxHp:       newMaxHp,
          curseStacks: toolDef.curseOnHit ? Math.min(3, h.curseStacks + 1) : h.curseStacks,
          poisoned:    h.poisoned || (!h.immuneToPoison && (toolDef.poisonOnHit ?? false)),
          slowed:      h.slowed   || (!h.immuneToSlow   && (toolDef.slowOnHit   ?? false)),
          slowTimer:   (!h.immuneToSlow && toolDef.slowOnHit)
            ? Math.max(h.slowTimer, 2000) : h.slowTimer,
        }

        // Death check
        if (updatedHeroes[idx].hp <= 0 && updatedHeroes[idx].state === 'moving') {
          const bonus = updatedHeroes[idx].hasGold ? GOLD_CARRYING_BONUS : 0
          goldEarned += updatedHeroes[idx].goldValue + bonus
          events.push({
            type: 'hero_killed', hero: updatedHeroes[idx].id, label: updatedHeroes[idx].label,
            gold: updatedHeroes[idx].goldValue + bonus, hadGold: updatedHeroes[idx].hasGold,
          })
          updatedHeroes[idx] = { ...updatedHeroes[idx], state: 'dead', hp: 0 }
        }

        events.push({
          type: 'tower_attack', col: c, row: r,
          towerType: tileId,
          heroId:    target.id,
          damage:    dmg,                          // used by renderer for damage numbers
          cursed:    (updatedHeroes[idx]?.curseStacks ?? 0) > 0,
          fromX: c * TILE_SIZE + TILE_SIZE / 2,
          fromY: r * TILE_SIZE + TILE_SIZE / 2,
          toX: target.x, toY: target.y,
        })
      }
    }
  }

  // ── Pit + Pendulum per-tile timer maintenance ──────────────────────────────
  // Runs over the whole grid once per tick regardless of hero positions.
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === TILE.PIT) {
        // Count DOWN cooldown; 0 = armed and ready to trigger
        const key = `pit_${c},${r}`
        if (updatedTimers[key] > 0)
          updatedTimers[key] = Math.max(0, updatedTimers[key] - deltaMs)
      } else if (grid[r][c] === TILE.PENDULUM) {
        // Cycle 0 – 3999 ms; stagger initial phase by tile position
        const key = `pendulum_${c},${r}`
        const seed = (c * 37 + r * 13) % 4000
        updatedTimers[key] = ((updatedTimers[key] ?? seed) + deltaMs) % 4000
      }
    }
  }

  return { heroes: updatedHeroes, events, treasureDamage, goldEarned, trapTimers: updatedTimers }
}

// ── On-path trap interactions ──────────────────────────────────────────────
// updatedHeroes: mutable array of heroes processed so far this tick (for electric chain)
// updatedTimers: mutable timer map (for pit cooldown writes)
function handleOnPathTrap(hero, tileId, tilePos, events, updatedHeroes = [], updatedTimers = {}) {
  const trapKey = `${tilePos.col},${tilePos.row}`

  switch (tileId) {

    // ── Existing traps ───────────────────────────────────────────────────────
    case TILE.SPIKE: {
      if (hero.canDisarm) {
        events.push({ type: 'trap_disarmed', trapKey, label: hero.label })
        return { hero }
      }
      const spikeDmg = Math.round(25 * (1 - hero.damageReduction))
      events.push({ type: 'trap_triggered', trapKey, trap: 'spike', label: hero.label })
      return { hero: { ...hero, hp: hero.hp - spikeDmg } }
    }
    case TILE.BOULDER: {
      if (hero.boulderResist) {
        events.push({ type: 'trap_disarmed', trapKey, label: hero.label })
        return { hero }
      }
      const boulderDmg = Math.round(60 * (1 - hero.damageReduction))
      events.push({ type: 'trap_triggered', trapKey, trap: 'boulder', label: hero.label })
      return { hero: { ...hero, hp: hero.hp - boulderDmg } }
    }
    // LAVA + TAR handled as continuous DoT in Pass 1, not on arrival

    // ── New traps (7.1) ──────────────────────────────────────────────────────

    case TILE.PIT: {
      if (hero.canDisarm) {
        // Warlord/Thief disarm pits (reset cooldown)
        updatedTimers[`pit_${tilePos.col},${tilePos.row}`] = 0
        events.push({ type: 'trap_disarmed', trapKey, label: hero.label })
        return { hero }
      }
      const pitKey   = `pit_${tilePos.col},${tilePos.row}`
      const isArmed  = !(updatedTimers[pitKey] > 0)
      if (!isArmed) return { hero }  // still on cooldown
      const pitDmg = Math.round(50 * (1 - hero.damageReduction))
      updatedTimers[pitKey] = 8000   // start 8 s reset cooldown
      events.push({ type: 'trap_triggered', trapKey, trap: 'pit', label: hero.label })
      return {
        hero: {
          ...hero,
          hp:       hero.hp - pitDmg,
          slowed:   hero.immuneToSlow ? hero.slowed : true,
          slowTimer: hero.immuneToSlow ? hero.slowTimer : Math.max(hero.slowTimer, 3000),
        },
      }
    }

    case TILE.PENDULUM: {
      const pendKey   = `pendulum_${tilePos.col},${tilePos.row}`
      const phase     = updatedTimers[pendKey] ?? 0
      const swinging  = (phase % 4000) < 2000
      if (!swinging) return { hero }  // pendulum at rest — safe to pass
      const pendDmg = Math.round(40 * (1 - hero.damageReduction))
      events.push({ type: 'trap_triggered', trapKey, trap: 'pendulum', label: hero.label })
      return { hero: { ...hero, hp: hero.hp - pendDmg } }
    }

    case TILE.ELECTRIC: {
      const elecDmg = Math.round(25 * (1 - hero.damageReduction))
      events.push({ type: 'trap_triggered', trapKey, trap: 'electric', label: hero.label })

      // Chain to nearest other living hero within 2 tiles (uses already-processed heroes)
      const chainTarget = updatedHeroes
        .filter(h => h.id !== hero.id && h.state === 'moving' && h.spawned && (h.stasisTimer ?? 0) <= 0)
        .sort((a, b) => {
          const da = (a.col - tilePos.col) ** 2 + (a.row - tilePos.row) ** 2
          const db = (b.col - tilePos.col) ** 2 + (b.row - tilePos.row) ** 2
          return da - db
        })
        .find(h => Math.sqrt((h.col - tilePos.col) ** 2 + (h.row - tilePos.row) ** 2) <= 2)

      if (chainTarget) {
        const idx      = updatedHeroes.indexOf(chainTarget)
        const chainDmg = Math.round(15 * (1 - chainTarget.damageReduction))
        updatedHeroes[idx] = { ...chainTarget, hp: chainTarget.hp - chainDmg }
        events.push({ type: 'electric_chain', trapKey, label: chainTarget.label, damage: chainDmg })
      }

      return { hero: { ...hero, hp: hero.hp - elecDmg } }
    }

    case TILE.STASIS: {
      if ((hero.stasisTimer ?? 0) > 0) return { hero }  // already frozen
      events.push({ type: 'trap_triggered', trapKey, trap: 'stasis', label: hero.label })
      return { hero: { ...hero, stasisTimer: 2000 } }   // 2 s freeze
    }

    default:
      return { hero }
  }
}
