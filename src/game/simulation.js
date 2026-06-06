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
  TILE, TILE_SIZE, TOOL_CATEGORY,
  HERO_KILL_GOLD, GOLD_CARRYING_BONUS,
  TREASURE_HERO_DAMAGE, HERO_SPAWN_STAGGER_MS,
  PATH_TILES, DUNGEON_TOOLS, getEffectiveTool,
} from './constants.js'

// Tiles that count as "physical" damage — the only sources that hurt the Phantom.
const PHYSICAL_TILES = new Set([TILE.SPIKE, TILE.BOULDER, TILE.DART, TILE.SKELETON, TILE.SLIME])

// ── Shield absorption helper ──────────────────────────────────────────────
// Used for shield_potion event: shieldHp absorbs raw damage before real HP is touched.
// Takes the hero object and raw damage amount; returns updated hero object.
function applyDamageWithShield(hero, dmg) {
  const shield      = hero.shieldHp ?? 0
  const absorbed    = Math.min(shield, dmg)
  const remainder   = dmg - absorbed
  return { ...hero, shieldHp: Math.max(0, shield - absorbed), hp: hero.hp - remainder }
}

// ── Hero factory ───────────────────────────────────────────────────────────

// hpMult scales HP and healing proportionally to the wave's difficulty.
// pathTiles: the active layout's path (defaults to Catacombs for backwards compat).
// Healing scales as sqrt(hpMult) so healers stay useful but don't trivialise damage.
// goldValue scales so kill rewards reflect the effort involved.
export function createHero(heroType, spawnIndex, hpMult = 1, pathTiles = PATH_TILES) {
  const scaledHp    = Math.round(heroType.hp * hpMult)
  const healScale   = Math.sqrt(hpMult)
  const baseGold    = HERO_KILL_GOLD[heroType.id] ?? 30
  return {
    id:             `hero_${Date.now()}_${spawnIndex}`,
    type:           heroType.id,
    label:          heroType.label,
    emoji:          heroType.emoji,
    color:          heroType.color,
    hp:             scaledHp,
    maxHp:          scaledHp,
    baseMaxHp:      scaledHp,
    speed:          heroType.speed,
    canDisarm:      heroType.canDisarm,
    heals:          heroType.heals,
    stasisTimer:      0,
    distractedTimer:  0,
    distractedByMimics: [],
    fireResist:     heroType.fireResist ?? 1,
    goldSpeedMult:  heroType.goldSpeedMult ?? 1,
    // Pixel/grid position — starts at entrance (pathTiles[0])
    col:            pathTiles[0].col,
    row:            pathTiles[0].row,
    x:              pathTiles[0].col * TILE_SIZE + TILE_SIZE / 2,
    y:              pathTiles[0].row * TILE_SIZE + TILE_SIZE / 2,
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
    // Tier 6 hero flags
    monsterResist:   heroType.monsterResist   ?? 0,    // Crusader: fraction damage from MONSTERS
    physicalOnly:    heroType.physicalOnly     ?? false, // Phantom: immune to all non-physical
    disablesTowers:  heroType.disablesTowers  ?? false, // Engineer: disables a tower each step
    canRevive:       heroType.canRevive        ?? false, // Medic: revives nearby dead heroes
    pendingRevival:  {},    // heroId → msRemaining (Medic mechanic)
    revivedHeroes:   [],    // heroIds already revived (once per hero)
  }
}

// ── Main tick ──────────────────────────────────────────────────────────────
// Returns { heroes, events, treasureDamage, goldEarned, trapTimers }
// tileUpgrades: optional map of "col,row" → tier (0-2) for upgrade system
// pathTiles:    the active layout's path (defaults to Catacombs for backwards compat)
// globalEvent:  optional GLOBAL_EVENTS entry for the active event this wave
//
// Modifiers applied per event:
//   weapon_cache      — towers deal 1.4× damage
//   monster_fury      — towers fire at 0.667× interval (50% faster)
//   spike_overload    — spike traps deal damage twice per step
//   flooding          — lava DoT capped at 5 HP/s (overrides upgrade)
//   equipment_failure — towers fire at 1.5× interval (slower)
//   gold_bounty       — kill rewards doubled
//   shield_potion     — hero.shieldHp absorbs damage before real HP
//   know_the_way      — door slow ignored

export function simulationTick(heroes, grid, deltaMs, trapTimers, tileUpgrades = {}, pathTiles = PATH_TILES, globalEvent = null) {
  const events = []
  let treasureDamage = 0
  let goldEarned     = 0
  const updatedHeroes = []
  const updatedTimers = { ...trapTimers }   // shared by Pass 1 (on-path traps) and Pass 2 (towers)

  // Pre-compute event flags for hot paths
  const ev_weaponCache     = globalEvent?.id === 'weapon_cache'
  const ev_monsterFury     = globalEvent?.id === 'monster_fury'
  const ev_spikeOverload   = globalEvent?.id === 'spike_overload'
  const ev_flooding        = globalEvent?.id === 'flooding'
  const ev_equipFail       = globalEvent?.id === 'equipment_failure'
  const ev_goldBounty      = globalEvent?.id === 'gold_bounty'
  const ev_knowTheWay      = globalEvent?.id === 'know_the_way'

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
      // wrong_dungeon event: hero realizes they're in the wrong dungeon and leaves immediately
      if (hero.wrongDungeon) {
        events.push({ type: 'hero_escaped', hero: hero.id, label: hero.label, hadGold: false, wrongDungeon: true })
        updatedHeroes.push({ ...hero, state: 'escaped' })
        continue
      }
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
      hero = applyDamageWithShield(hero, dmg)
    }

    // Tile DoT: lava (15 HP/s) and tar (15 HP/s Berserker-only)
    const curTileId = grid[hero.row]?.[hero.col]
    // curTier / curTool declared here so both the DoT section AND the movement
    // section can use them (movement section originally declared these but DoT
    // references were a TDZ bug — fixed by hoisting the declarations).
    const curTier_h  = tileUpgrades[`${hero.col},${hero.row}`] ?? 0
    const curTool    = getEffectiveTool(curTileId, curTier_h)
    if (curTileId === TILE.LAVA && !hero.physicalOnly) {
      // Phantom (physicalOnly) is immune to all magical/elemental damage incl. lava
      const lavaTool = getEffectiveTool(TILE.LAVA, tileUpgrades[`${hero.col},${hero.row}`] ?? 0)
      // Flooding event: lava is diluted to 5 HP/s regardless of upgrade tier
      const lavaRate = ev_flooding ? 5 : (lavaTool?.dotDamage ?? 15)
      const lavaDmg  = lavaRate * (deltaMs / 1000) * (1 - hero.damageReduction)
      hero = applyDamageWithShield(hero, lavaDmg)
      events.push({ type: 'lava_damage', heroId: hero.id })
    }
    if (curTileId === TILE.TAR && hero.immuneToSlow) {
      // Berserkers can't be slowed by tar, but it burns them
      const dmg = 15 * (deltaMs / 1000) * (1 - hero.damageReduction)
      hero = { ...hero, hp: hero.hp - dmg }
    }
    // Quicksand (Tar T3): tarDot damages even non-immune heroes
    if (curTileId === TILE.TAR && !hero.immuneToSlow && curTool?.tarDot) {
      const tarDotDmg = curTool.tarDot * (deltaMs / 1000) * (1 - hero.damageReduction)
      hero = { ...hero, hp: hero.hp - tarDotDmg }
    }
    // Door T3 (Barred Gate): applies Slowed status when entering
    if (curTileId === TILE.DOOR && curTool?.doorAppliesSlow && !hero.immuneToSlow && !hero.slowed) {
      hero = { ...hero, slowed: true, slowTimer: Math.max(hero.slowTimer, 2000) }
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

    // ── Mimic distraction: hero stops but can still take damage ─────────────
    if (hero.distractedTimer > 0) {
      hero = { ...hero, distractedTimer: Math.max(0, hero.distractedTimer - deltaMs) }
      updatedHeroes.push(hero)
      continue
    }

    // ── Movement ──

    const nextTile = pathTiles[hero.pathIndex + 1]

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

    // Speed modifiers stack multiplicatively (curTool already declared above)
    // know_the_way event: heroes ignore door slows entirely
    const doorSlow = (curTileId === TILE.DOOR && !ev_knowTheWay) ? (curTool?.slow ?? 1) : 1
    // Tar: upgraded tarSpeedMult; non-immune heroes crawl, immune heroes take DoT
    const tarMult  = curTool?.tarSpeedMult ?? 0.25
    const tarSlow  = (curTileId === TILE.TAR && !hero.immuneToSlow) ? tarMult : 1
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
        // Phantom skips all non-physical on-path traps
        if (!hero.physicalOnly || PHYSICAL_TILES.has(arrivedId)) {
          const eventFlags = { spikeOverload: ev_spikeOverload }
          const result = handleOnPathTrap(hero, arrivedId, nextTile, events, updatedHeroes, updatedTimers, tileUpgrades, eventFlags)
          hero = result.hero
        }
      }

      // Engineer: disable a random off-path tower within 5 tiles for 10 s
      if (hero.disablesTowers) {
        const nearby = []
        for (let er = 0; er < grid.length; er++) {
          for (let ec = 0; ec < grid[er].length; ec++) {
            const tid = grid[er][ec]
            const tool = DUNGEON_TOOLS.find(t => t.id === tid && t.range && t.attackSpeed)
            if (!tool) continue
            const d = Math.sqrt((ec - hero.col) ** 2 + (er - hero.row) ** 2)
            if (d <= 5) nearby.push({ ec, er, key: `tower_disabled_${ec},${er}` })
          }
        }
        if (nearby.length > 0) {
          const target = nearby[Math.floor(Math.random() * nearby.length)]
          updatedTimers[target.key] = 10000
          events.push({ type: 'engineer_disable', col: target.ec, row: target.er, label: hero.label })
        }
      }

      // Escape check — completed the full loop
      if (hero.pathIndex >= pathTiles.length - 1) {
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
      const killGold = (hero.goldValue + (hero.hasGold ? GOLD_CARRYING_BONUS : 0)) * (ev_goldBounty ? 2 : 1)
      goldEarned += killGold
      events.push({
        type: 'hero_killed', hero: hero.id, label: hero.label,
        gold: killGold, hadGold: hero.hasGold,
      })
      updatedHeroes.push({ ...hero, state: 'dead', hp: 0 })
      continue
    }

    updatedHeroes.push(hero)
  }

  // ── Pass 1.5: Medic revival processing ───────────────────────────────────
  // Medics tick down pending revival timers and bring heroes back to life.
  for (let mi = 0; mi < updatedHeroes.length; mi++) {
    const medic = updatedHeroes[mi]
    if (!medic.canRevive || medic.state !== 'moving' || !medic.spawned) continue

    const newPending  = { ...medic.pendingRevival }
    const newRevived  = [...medic.revivedHeroes]

    // 1. Check for newly dead heroes within 3 tiles to queue for revival
    for (const h of updatedHeroes) {
      if (h.state !== 'dead') continue
      if (newRevived.includes(h.id)) continue
      if (newPending[h.id] !== undefined) continue
      const dist = Math.sqrt((h.col - medic.col) ** 2 + (h.row - medic.row) ** 2)
      if (dist <= 3) {
        newPending[h.id] = 3000   // 3 s revival countdown
        events.push({ type: 'medic_revive_queued', label: h.label })
      }
    }

    // 2. Tick down timers and trigger revivals
    for (const heroId of Object.keys(newPending)) {
      newPending[heroId] -= deltaMs
      if (newPending[heroId] <= 0) {
        const idx = updatedHeroes.findIndex(h => h.id === heroId)
        if (idx >= 0 && updatedHeroes[idx].state === 'dead') {
          const target = updatedHeroes[idx]
          updatedHeroes[idx] = {
            ...target,
            state:  'moving',
            hp:     Math.round(target.maxHp * 0.4),
            poisoned: false, slowed: false, slowTimer: 0,
          }
          events.push({ type: 'medic_revived', label: target.label })
          newRevived.push(heroId)
        }
        delete newPending[heroId]
      }
    }

    updatedHeroes[mi] = { ...medic, pendingRevival: newPending, revivedHeroes: newRevived }
  }

  // ── Pass 2: off-path tower range attacks ───────────────────────────────

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const tileId  = grid[r][c]
      // Require attackSpeed to exclude Mimic (handled in its own loop below)
      const baseTool = DUNGEON_TOOLS.find(t => t.id === tileId && t.range && t.attackSpeed)
      if (!baseTool) continue

      // Engineer disable: tick down and skip this tower if still disabled
      const disableKey = `tower_disabled_${c},${r}`
      if ((updatedTimers[disableKey] ?? 0) > 0) {
        updatedTimers[disableKey] = Math.max(0, updatedTimers[disableKey] - deltaMs)
        continue
      }

      // Use effective (upgraded) tool stats
      const tier    = tileUpgrades[`${c},${r}`] ?? 0
      const toolDef = getEffectiveTool(tileId, tier) ?? baseTool

      const key = `tower_${c},${r}`
      updatedTimers[key] = (updatedTimers[key] ?? toolDef.attackSpeed) + deltaMs

      // Gather heroes in range first (needed for distraction speed-boost check)
      const inRange = updatedHeroes.filter(h =>
        h.spawned && h.state === 'moving' &&
        (h.stasisTimer ?? 0) <= 0 &&
        Math.sqrt((h.col - c) ** 2 + (h.row - r) ** 2) <= toolDef.range
      )
      if (inRange.length === 0) continue

      // Mimic distraction doubles fire rate for this tower
      const hasDistracted  = inRange.some(h => (h.distractedTimer ?? 0) > 0)
      // monster_fury: all towers fire 50% faster (0.667× threshold)
      // equipment_failure: all towers fire 50% slower (1.5× threshold)
      const eventSpeedMult = ev_monsterFury ? (2/3) : ev_equipFail ? 1.5 : 1.0
      const fireThreshold  = toolDef.attackSpeed * eventSpeedMult * (hasDistracted ? 0.5 : 1.0)
      if (updatedTimers[key] < fireThreshold) continue

      // ── Target selection ────────────────────────────────────────────
      const closest = pool => pool.reduce((a, b) =>
        Math.sqrt((a.col-c)**2+(a.row-r)**2) <= Math.sqrt((b.col-c)**2+(b.row-r)**2) ? a : b
      )

      let targets
      if (toolDef.aoeAttack) {
        targets = inRange
      } else if (toolDef.randomTarget) {
        targets = [inRange[Math.floor(Math.random() * inRange.length)]]
      } else if (toolDef.targetGoldCarriers) {
        const carriers = inRange.filter(h => h.hasGold)
        targets = [closest(carriers.length > 0 ? carriers : inRange)]
      } else if (toolDef.targetFarthest) {
        targets = [inRange.reduce((a, b) => a.pathIndex >= b.pathIndex ? a : b)]
      } else {
        targets = [closest(inRange)]
      }

      updatedTimers[key] = 0

      // Helper: apply one hit to a hero index ────────────────────────
      const applyHit = (idx, dmgMult = 1) => {
        if (idx < 0 || idx >= updatedHeroes.length) return
        const h = updatedHeroes[idx]
        if (h.state !== 'moving') return

        // weapon_cache: all towers deal 40% extra damage
        const eventDmgMult = ev_weaponCache ? 1.4 : 1.0
        let dmg = Math.round(toolDef.damage * dmgMult * eventDmgMult)
        if (h.physicalOnly && !PHYSICAL_TILES.has(tileId)) dmg = 0
        if (h.monsterResist > 0 && toolDef.category === TOOL_CATEGORY.MONSTERS)
          dmg = Math.round(dmg * (1 - h.monsterResist))
        if (tileId === TILE.FIRE) dmg = Math.round(dmg * (h.fireResist ?? 1))
        dmg = Math.round(dmg * (1 - h.damageReduction))
        if (h.curseStacks > 0) dmg = Math.round(dmg * (1 + h.curseStacks * 0.15))
        if (toolDef.targetGoldCarriers && h.hasGold) dmg = dmg * 2

        // Curse stacks — support cursesPerHit for upgraded Idol
        const cursesApplied = toolDef.curseOnHit ? (toolDef.cursesPerHit ?? 1) : 0
        const newCurseStacks = Math.min(3, h.curseStacks + cursesApplied)
        if (cursesApplied > 0 && h.curseStacks < 3) {
          events.push({ type: 'curse_applied', label: h.label, stacks: newCurseStacks })
        }

        const newMaxHp = toolDef.drainOnHit ? Math.max(1, h.maxHp - dmg) : h.maxHp
        const slowDuration = toolDef.slowTimer ?? 2000

        // shield_potion: shieldHp absorbs damage before real HP
        const shieldHp = h.shieldHp ?? 0
        const dmgToShield = Math.min(shieldHp, dmg)
        const dmgToHp     = dmg - dmgToShield

        updatedHeroes[idx] = {
          ...h,
          hp:          h.hp - dmgToHp,
          shieldHp:    Math.max(0, shieldHp - dmgToShield),
          maxHp:       newMaxHp,
          curseStacks: newCurseStacks,
          poisoned:    h.poisoned || (!h.immuneToPoison && (toolDef.poisonOnHit ?? false)),
          slowed:      h.slowed   || (!h.immuneToSlow   && (toolDef.slowOnHit   ?? false)),
          slowTimer:   (!h.immuneToSlow && toolDef.slowOnHit)
            ? Math.max(h.slowTimer, slowDuration) : h.slowTimer,
        }

        if (updatedHeroes[idx].hp <= 0 && updatedHeroes[idx].state === 'moving') {
          const killGold = (updatedHeroes[idx].goldValue + (updatedHeroes[idx].hasGold ? GOLD_CARRYING_BONUS : 0)) * (ev_goldBounty ? 2 : 1)
          goldEarned += killGold
          events.push({
            type: 'hero_killed', hero: updatedHeroes[idx].id, label: updatedHeroes[idx].label,
            gold: killGold, hadGold: updatedHeroes[idx].hasGold,
          })
          updatedHeroes[idx] = { ...updatedHeroes[idx], state: 'dead', hp: 0 }
        }

        events.push({
          type: 'tower_attack', col: c, row: r,
          towerType: tileId,
          heroId:    h.id,
          damage:    dmg,
          cursed:    (updatedHeroes[idx]?.curseStacks ?? 0) > 0,
          fromX: c * TILE_SIZE + TILE_SIZE / 2,
          fromY: r * TILE_SIZE + TILE_SIZE / 2,
          toX: h.x, toY: h.y,
        })
      }

      // ── Apply damage to each target ─────────────────────────────────
      for (const target of targets) {
        applyHit(updatedHeroes.indexOf(target))
      }

      // ── Ballista piercing: hit the second-closest hero too ──────────
      if (toolDef.piercing && targets.length === 1) {
        const primary = targets[0]
        const secondary = inRange
          .filter(h => h.id !== primary.id && updatedHeroes.find(u => u.id === h.id)?.state === 'moving')
          .sort((a, b) => a.pathIndex - b.pathIndex)   // furthest along path = most dangerous
          [0]
        if (secondary) applyHit(updatedHeroes.findIndex(u => u.id === secondary.id), 0.6)
      }

      // ── Death Knight aura: 5 HP/s to all heroes within 1.5 tiles ────
      if (toolDef.deathKnightAura) {
        const auraDmg = 5 * (deltaMs / 1000) * (ev_weaponCache ? 1.4 : 1.0)
        for (let i = 0; i < updatedHeroes.length; i++) {
          const h = updatedHeroes[i]
          if (!h.spawned || h.state !== 'moving') continue
          if (Math.sqrt((h.col - c) ** 2 + (h.row - r) ** 2) > 1.5) continue
          const reduced = auraDmg * (1 - h.damageReduction)
          updatedHeroes[i] = applyDamageWithShield(h, reduced)
          if (updatedHeroes[i].hp <= 0) {
            const killGold = (h.goldValue + (h.hasGold ? GOLD_CARRYING_BONUS : 0)) * (ev_goldBounty ? 2 : 1)
            goldEarned += killGold
            events.push({ type: 'hero_killed', hero: h.id, label: h.label,
              gold: killGold, hadGold: h.hasGold })
            updatedHeroes[i] = { ...updatedHeroes[i], state: 'dead', hp: 0 }
          }
        }
      }
    }
  }

  // ── Mimic Chest proximity distraction ────────────────────────────────────
  // Scanned after towers so distracted heroes are already frozen this tick.
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] !== TILE.MIMIC) continue
      const mimicKey  = `${c},${r}`
      const mimicRange = 2

      // Use upgraded mimic duration if applicable
      const mimicTier = tileUpgrades[`${c},${r}`] ?? 0
      const mimicTool = getEffectiveTool(TILE.MIMIC, mimicTier)
      const mimicDuration = mimicTool?.mimicDuration ?? 1500

      for (let i = 0; i < updatedHeroes.length; i++) {
        const h = updatedHeroes[i]
        if (!h.spawned || h.state !== 'moving') continue
        if ((h.stasisTimer    ?? 0) > 0) continue
        if ((h.distractedTimer ?? 0) > 0) continue
        if ((h.distractedByMimics ?? []).includes(mimicKey)) continue

        const dist = Math.sqrt((h.col - c) ** 2 + (h.row - r) ** 2)
        if (dist > mimicRange) continue

        updatedHeroes[i] = {
          ...h,
          distractedTimer:    mimicDuration,
          distractedByMimics: [...(h.distractedByMimics ?? []), mimicKey],
          // Ancient Mimic (T3) also slows the distracted hero
          slowed:    h.slowed || (mimicTool?.mimicAppliesSlow ?? false),
          slowTimer: (mimicTool?.mimicAppliesSlow && !h.immuneToSlow)
            ? Math.max(h.slowTimer, 2000) : h.slowTimer,
        }
        events.push({ type: 'mimic_triggered', label: h.label })
      }
    }
  }

  // ── Pit + Pendulum + Spike regen per-tile timer maintenance ──────────────
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const tId = grid[r][c]
      if (tId === TILE.PIT) {
        const key = `pit_${c},${r}`
        if (updatedTimers[key] > 0)
          updatedTimers[key] = Math.max(0, updatedTimers[key] - deltaMs)
      } else if (tId === TILE.PENDULUM) {
        const key = `pendulum_${c},${r}`
        const seed = (c * 37 + r * 13) % 4000
        updatedTimers[key] = ((updatedTimers[key] ?? seed) + deltaMs) % 4000
      } else if (tId === TILE.SPIKE) {
        // Blade Gauntlet / Death Corridor regen timer
        const regenKey = `spike_regen_${c},${r}`
        if ((updatedTimers[regenKey] ?? 0) > 0) {
          updatedTimers[regenKey] = Math.max(0, updatedTimers[regenKey] - deltaMs)
        }
      }
    }
  }

  // Spike regen: reinstate tiles whose regen timer just reached 0.
  // Return a spikeRespawns array so gameStore can update the grid.
  const spikeRespawns = []
  for (const key of Object.keys(updatedTimers)) {
    if (!key.startsWith('spike_regen_')) continue
    if (updatedTimers[key] !== 0) continue
    const coords = key.replace('spike_regen_', '').split(',').map(Number)
    if (grid[coords[1]]?.[coords[0]] === TILE.EMPTY || grid[coords[1]]?.[coords[0]] === TILE.PATH) {
      spikeRespawns.push({ col: coords[0], row: coords[1] })
      delete updatedTimers[key]
    }
  }

  return { heroes: updatedHeroes, events, treasureDamage, goldEarned, trapTimers: updatedTimers, spikeRespawns }
}

// ── On-path trap interactions ──────────────────────────────────────────────
// updatedHeroes: mutable array of heroes processed so far this tick (for electric chain)
// updatedTimers: mutable timer map (for pit cooldown writes)
// tileUpgrades:  map of "col,row" → tier
// eventFlags:    { spikeOverload, goldBounty } from active global event
function handleOnPathTrap(hero, tileId, tilePos, events, updatedHeroes = [], updatedTimers = {}, tileUpgrades = {}, eventFlags = {}) {
  const trapKey = `${tilePos.col},${tilePos.row}`
  const tier = tileUpgrades[trapKey] ?? 0

  switch (tileId) {

    // ── Existing traps ───────────────────────────────────────────────────────
    case TILE.SPIKE: {
      const effSpike = getEffectiveTool(TILE.SPIKE, tier)
      // Death Corridor (T3): noDisarm — thieves can no longer disarm
      if (hero.canDisarm && !(effSpike?.noDisarm)) {
        events.push({ type: 'trap_disarmed', trapKey, label: hero.label })
        return { hero }
      }
      const spikeDmg = Math.round((effSpike?.damage ?? 25) * (1 - hero.damageReduction))
      events.push({ type: 'trap_triggered', trapKey, trap: 'spike', label: hero.label })
      let updatedHero = applyDamageWithShield(hero, spikeDmg)
      // Blade Gauntlet+ (T2/T3): regen timer — set cooldown instead of staying destroyed
      if (tier >= 1 && effSpike?.spikeRegen) {
        updatedTimers[`spike_regen_${trapKey}`] = effSpike.spikeRegen
      }
      // Death Corridor (T3): doubleSpike — deal damage twice
      // spike_overload event: also deals damage twice (stacks with Death Corridor)
      if (effSpike?.doubleSpike || eventFlags.spikeOverload) {
        const dmg2 = Math.round((effSpike?.damage ?? 25) * (1 - updatedHero.damageReduction))
        updatedHero = applyDamageWithShield(updatedHero, dmg2)
        events.push({ type: 'trap_triggered', trapKey, trap: 'spike', label: hero.label })
      }
      return { hero: updatedHero }
    }
    case TILE.BOULDER: {
      if (hero.boulderResist) {
        events.push({ type: 'trap_disarmed', trapKey, label: hero.label })
        return { hero }
      }
      const effBoulder = getEffectiveTool(TILE.BOULDER, tier)
      const boulderDmg = Math.round((effBoulder?.damage ?? 60) * (1 - hero.damageReduction))
      events.push({ type: 'trap_triggered', trapKey, trap: 'boulder', label: hero.label })
      // Iron Crusher (T3): schedule respawn via timer instead of permanent removal
      if (effBoulder?.boulderRespawn) {
        updatedTimers[`boulder_respawn_${trapKey}`] = effBoulder.boulderRespawn
      }
      return { hero: applyDamageWithShield(hero, boulderDmg) }
    }
    // LAVA + TAR handled as continuous DoT in Pass 1, not on arrival

    // ── New traps (7.1) ──────────────────────────────────────────────────────

    case TILE.PIT: {
      if (hero.canDisarm) {
        updatedTimers[`pit_${tilePos.col},${tilePos.row}`] = 0
        events.push({ type: 'trap_disarmed', trapKey, label: hero.label })
        return { hero }
      }
      const pitKey    = `pit_${tilePos.col},${tilePos.row}`
      const isArmed   = !(updatedTimers[pitKey] > 0)
      if (!isArmed) return { hero }
      const effPit    = getEffectiveTool(TILE.PIT, tier)
      const pitDmg    = Math.round((effPit?.damage ?? 50) * (1 - hero.damageReduction))
      const pitCd     = effPit?.pitCooldown ?? 8000
      const pitSlowMs = effPit?.pitSlowMs   ?? 3000
      updatedTimers[pitKey] = pitCd
      events.push({ type: 'trap_triggered', trapKey, trap: 'pit', label: hero.label })
      const heroAfterPit = applyDamageWithShield(hero, pitDmg)
      return {
        hero: {
          ...heroAfterPit,
          slowed:   hero.immuneToSlow ? hero.slowed : true,
          slowTimer: hero.immuneToSlow ? hero.slowTimer : Math.max(hero.slowTimer, pitSlowMs),
        },
      }
    }

    case TILE.PENDULUM: {
      const pendKey   = `pendulum_${tilePos.col},${tilePos.row}`
      const pendPhase = updatedTimers[pendKey] ?? 0
      const swinging  = (pendPhase % 4000) < 2000
      if (!swinging) return { hero }
      const effPend   = getEffectiveTool(TILE.PENDULUM, tier)
      const pendDmg   = Math.round((effPend?.damage ?? 40) * (1 - hero.damageReduction))
      events.push({ type: 'trap_triggered', trapKey, trap: 'pendulum', label: hero.label })
      return { hero: { ...hero, hp: hero.hp - pendDmg } }
    }

    case TILE.ELECTRIC: {
      const effElec  = getEffectiveTool(TILE.ELECTRIC, tier)
      const elecDmg  = Math.round((effElec?.damage ?? 25) * (1 - hero.damageReduction))
      const chainDmgBase = effElec?.electricChain ?? 15
      events.push({ type: 'trap_triggered', trapKey, trap: 'electric', label: hero.label })

      // Chain targets: Tesla Coil (T3) hits TWO nearest heroes
      const chainCount = effElec?.electricDoubleChain ? 2 : 1
      const chainCandidates = updatedHeroes
        .filter(h => h.id !== hero.id && h.state === 'moving' && h.spawned && (h.stasisTimer ?? 0) <= 0)
        .sort((a, b) => {
          const da = (a.col - tilePos.col) ** 2 + (a.row - tilePos.row) ** 2
          const db = (b.col - tilePos.col) ** 2 + (b.row - tilePos.row) ** 2
          return da - db
        })
        .filter(h => Math.sqrt((h.col - tilePos.col) ** 2 + (h.row - tilePos.row) ** 2) <= 2)
        .slice(0, chainCount)

      for (const ct of chainCandidates) {
        const idx      = updatedHeroes.indexOf(ct)
        const chainDmg = Math.round(chainDmgBase * (1 - ct.damageReduction))
        updatedHeroes[idx] = { ...ct, hp: ct.hp - chainDmg }
        events.push({ type: 'electric_chain', trapKey, label: ct.label, damage: chainDmg })
      }

      return { hero: { ...hero, hp: hero.hp - elecDmg } }
    }

    case TILE.STASIS: {
      if ((hero.stasisTimer ?? 0) > 0) return { hero }
      const effStasis = getEffectiveTool(TILE.STASIS, tier)
      const stasisDur = effStasis?.stasisDuration ?? 2000
      events.push({ type: 'trap_triggered', trapKey, trap: 'stasis', label: hero.label })
      return { hero: { ...hero, stasisTimer: stasisDur } }
    }

    default:
      return { hero }
  }
}
