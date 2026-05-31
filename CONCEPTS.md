# How Dungeon Architect Works — A Complete Technical Guide

This document explains every major concept in this codebase from the ground up, written for an engineer who has scripted backend systems but has never built a graphical user interface, never touched a browser game, and has never worked with JavaScript in a frontend context. No prior knowledge of React, HTML, or game development is assumed.

---

## Part 1 — How a Frontend App Comes to Life

### What even is a web page?

Every web page is three things working together:

- **HTML** — the structure (what elements exist: buttons, divs, headings)
- **CSS** — the styling (colours, fonts, layout)
- **JavaScript** — the behaviour (what happens when you click, move, or interact)

The browser is the runtime environment. It reads HTML, applies CSS, and executes JavaScript. Think of the browser the way you'd think of a Python interpreter — it's the thing that actually runs your code.

### The entry point: `index.html`

Every web app needs one HTML file that the browser opens first. Ours is `index.html` in the project root. It looks roughly like this:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Dungeon Architect</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

The `<div id="root">` is a placeholder — it starts empty. The `<script>` tag tells the browser to load and run our JavaScript. Our JavaScript will then fill that empty div with the entire game UI.

### What is Vite?

When you run `npm run dev`, you're starting **Vite** — a development server.

Vite does two things:

1. **Serves your files** over a local URL (`http://localhost:5173`) so the browser can load them
2. **Transforms your code** — browsers don't natively understand JSX (the React syntax we use) or ES module imports. Vite converts them on the fly into plain JavaScript the browser can understand.

Think of Vite as a build pipeline that runs in the background. You write convenient modern syntax; Vite compiles it to browser-compatible code, instantly, every time you save a file. That's how hot-reloading works — you save, Vite re-compiles the changed module, and the browser updates in under a second.

### React: component-based UIs

**React** is a JavaScript library for building user interfaces. Its core idea is that the UI is a function of your state:

```
UI = f(state)
```

When state changes, React automatically recomputes which parts of the UI need to update and re-renders only those parts. You don't manually manipulate the DOM (the browser's internal tree of elements) — you describe what the UI *should* look like for a given state, and React makes it so.

**Components** are the building blocks. A component is just a JavaScript function that returns JSX (which looks like HTML but is actually JavaScript):

```jsx
function WaveCounter({ waveNumber }) {
  return <div>Wave {waveNumber}</div>
}
```

You compose a full page by nesting components. Our `GameScreen` component renders a `HUD`, a `DungeonGrid`, a `ToolPalette`, and a `BattleLog`. Each of those is its own component with its own logic.

### The entry point: `main.jsx`

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

This is the four-line file that boots the whole game. `ReactDOM.createRoot` finds the empty `<div id="root">` in `index.html`, and `.render(<App />)` fills it with our `App` component. Everything else flows from there.

---

## Part 2 — Drawing on Screen: The HTML5 Canvas API

### Why not just use HTML elements?

For most UIs (buttons, menus, text), HTML elements are perfect. But a game grid with 260 animated tiles, moving hero sprites, attack projectiles, and pulsing glow effects running at 60 frames per second would be impossibly slow if each tile were a separate HTML element. The browser would have to recalculate layout and repaint thousands of DOM nodes every frame.

**HTML5 Canvas** solves this. It gives you a single `<canvas>` element that works like a bitmap you can draw on directly — much closer to OpenGL or any 2D graphics library. You call drawing commands, and they immediately paint pixels. There's no layout engine involved.

### The coordinate system

Canvas uses a 2D coordinate system where:
- **(0, 0)** is the top-left corner
- **X increases to the right**
- **Y increases downward**

Our dungeon grid is 20 tiles wide × 13 tiles tall, each tile 48×48 pixels. So the canvas is 960×624 pixels internally, then CSS stretches it to fill the screen.

### Drawing primitives

All drawing goes through the **context** (`ctx`), obtained from the canvas element:

```js
const canvas = canvasRef.current        // the DOM element
const ctx = canvas.getContext('2d')     // the drawing API

// Paint a filled rectangle
ctx.fillStyle = '#3a1e58'               // set colour first
ctx.fillRect(x, y, width, height)      // then draw

// Draw a circle
ctx.beginPath()
ctx.arc(cx, cy, radius, 0, Math.PI * 2)  // full circle = 0 to 2π radians
ctx.fill()

// Draw a line
ctx.strokeStyle = '#e8c44a'
ctx.lineWidth = 2
ctx.beginPath()
ctx.moveTo(x1, y1)
ctx.lineTo(x2, y2)
ctx.stroke()

// Draw rotated content
ctx.save()            // save current transform state
ctx.translate(cx, cy) // move origin to center
ctx.rotate(angle)     // rotate around the new origin
ctx.fillRect(-5, -15, 10, 30)  // draw in rotated space
ctx.restore()         // restore original transform
```

The `save()` / `restore()` pattern is critical. It works like a stack — save pushes the current state (transform, clip, alpha, colour), restore pops back to it. This lets you draw rotated/scaled things without permanently affecting subsequent draws.

### The clear-and-redraw pattern

Canvas has no concept of "moving an object". Every frame, we:

1. Call `ctx.clearRect(0, 0, width, height)` to wipe the entire canvas
2. Redraw every tile, every sprite, every effect from scratch

This sounds wasteful, but it's how virtually all 2D games work. At 60fps you have 16ms per frame, and redrawing a 960×624 canvas is very fast for the GPU.

---

## Part 3 — The Game Loop: requestAnimationFrame

### Why a loop?

A static webpage renders once and waits. A game needs to update continuously — heroes move, traps animate, HP bars change. The browser provides `requestAnimationFrame` (RAF) for this.

```js
function gameLoop(timestamp) {
  update(timestamp)   // advance game state
  draw()              // render the new state
  requestAnimationFrame(gameLoop)  // schedule the next frame
}

requestAnimationFrame(gameLoop)  // kick off the first frame
```

`requestAnimationFrame` calls your function just before the browser paints the next frame — typically 60 times per second on a 60Hz display. It's far more efficient than `setInterval` because it pauses when the tab is hidden and syncs to the display's refresh rate.

### Two separate loops

Our game actually has *two* RAF loops running simultaneously:

**1. The simulation loop** (in `gameStore.js` `startWave()`):
- Runs every frame during a wave
- Advances hero positions, checks trap interactions, fires tower attacks
- Updates the Zustand store with new hero state

**2. The canvas draw loop** (in `DungeonGrid.jsx`):
- Runs every frame continuously (even in plan phase)
- Reads state from the Zustand store via refs
- Redraws the entire canvas

They're independent. The simulation mutates state; the canvas reads it and paints it.

### Delta time — the key to smooth, consistent motion

Frames don't always take exactly 16ms. On a slow device, a frame might take 30ms. On a fast device, 8ms. If you moved a hero by a fixed number of pixels per frame, it would move faster on a fast device and slower on a slow one.

The fix is **delta time** (`deltaMs`): calculate how many milliseconds have elapsed since the last frame, and scale all movement by that value.

```js
let lastTime = performance.now()

const loop = (now) => {
  const deltaMs = now - lastTime  // time since last frame
  lastTime = now

  // Move at 1.2 tiles per second, regardless of frame rate
  const moveSpeed = hero.speed * TILE_SIZE * (deltaMs / 1000)
  // At 16ms: 1.2 * 48 * 0.016 = 0.92 pixels
  // At 33ms: 1.2 * 48 * 0.033 = 1.90 pixels — still covers the same distance per second

  requestAnimationFrame(loop)
}
```

We also cap deltaMs at 100ms in the gameStore to prevent a huge "time jump" if the tab was backgrounded.

---

## Part 4 — State Management: Zustand

### What is "state"?

State is all the data your app needs to know what to show. In our game:

- What phase are we in? (plan, wave, results)
- What's on the grid? (20×13 array of tile IDs)
- How much gold does the player have?
- Where are the heroes right now?
- What's in the battle log?

If you stored all this in individual component variables, sharing it between components would be a mess — you'd have to pass data through many layers of component props ("prop drilling"). And RAF loops can't easily read React component state.

### Zustand: a global state store

**Zustand** creates a single global store — a plain JavaScript object with both state and the functions that mutate it ("actions"):

```js
import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
  // State
  gold: 250,
  phase: 'plan',

  // Actions
  spendGold(amount) {
    set({ gold: get().gold - amount })
  },
}))
```

`set()` updates state. `get()` reads current state from within an action (useful in the simulation loop which is outside React). Any component that calls `useGameStore(s => s.gold)` automatically re-renders when `gold` changes.

### Reading state in components (hooks)

```jsx
function HUD() {
  const gold  = useGameStore(s => s.gold)    // subscribes to gold
  const phase = useGameStore(s => s.phase)   // subscribes to phase

  return <div>{gold}g — Phase: {phase}</div>
}
```

The selector function `s => s.gold` is a **selector** — it extracts just the piece of state you care about. Zustand only re-renders the component when *that specific piece* of state changes, not on every store update.

### Reading state in the RAF loop (refs)

The simulation RAF loop needs to read state on every frame, but it can't use hooks (hooks only work inside React components). The solution is **refs**:

```jsx
// In DungeonGrid.jsx
const heroes = useGameStore(s => s.heroes)  // React subscription
const heroesRef = useRef(heroes)
heroesRef.current = heroes  // Updated on every render

const draw = useCallback(() => {
  const currentHeroes = heroesRef.current  // Always fresh, no stale closure
  // draw heroes...
  requestAnimationFrame(draw)
}, [])  // No dependencies — the loop never restarts
```

Without refs, the RAF loop would capture a stale "snapshot" of `heroes` from when it was created and never see updates. Refs solve this: `heroesRef.current` is always the latest value.

---

## Part 5 — React Components in Practice

### JSX: HTML inside JavaScript

JSX looks like HTML but it compiles to JavaScript function calls:

```jsx
// What you write
const button = <button onClick={startWave}>⚔ Send Them In</button>

// What Vite compiles it to
const button = React.createElement('button', { onClick: startWave }, '⚔ Send Them In')
```

Inside JSX, `{}` means "evaluate this JavaScript expression":

```jsx
<span style={{ color: gold > 0 ? '#c9a02a' : '#8b1a1a' }}>
  {gold}g
</span>
```

### Props: how components talk to each other

Props are arguments to a component function:

```jsx
function StatCard({ value, label, color }) {
  return (
    <div>
      <div style={{ color }}>{value}</div>
      <div>{label}</div>
    </div>
  )
}

// Used as:
<StatCard value={heroesKilled} label="Heroes Slain" color="var(--bone)" />
```

### The component tree

Our entire game UI is a tree of nested components:

```
App
└─ MainMenu  (when phase === 'menu')
└─ GameScreen  (when phase === 'plan' or 'wave')
   ├─ HUD  (top bar)
   ├─ ToolPalette  (left sidebar — plan phase)
   │   └─ tool buttons
   ├─ DungeonGrid  (centre — the canvas)
   ├─ BattleLog  (right sidebar — wave phase)
   └─ WavePanel
└─ ResultsScreen  (when phase === 'results')
```

`App.jsx` is the router — it reads `phase` from the store and renders the appropriate screen.

---

## Part 6 — The Fixed Path System

### Why not A* pathfinding?

The original design used A* pathfinding — heroes would find their own shortest route through the dungeon. While algorithmically interesting, it made the game feel less like a tower defense and more like a puzzle. In classic tower defense games, enemies follow a **predetermined path** and you place towers beside it.

We switched to a **fixed waypoint path**. This is simpler, more predictable, and gives better gameplay feel.

### Waypoints and PATH_TILES

The path is defined as an array of corner coordinates called `PATH_WAYPOINTS`:

```js
const PATH_WAYPOINTS = [
  { col: 0,  row: 6  },  // entrance
  { col: 3,  row: 6  },
  { col: 3,  row: 2  },  // turn up
  { col: 17, row: 2  },  // go right
  { col: 17, row: 6  },  // turn down
  { col: 19, row: 6  },  // TREASURE
  { col: 19, row: 10 },  // turn down
  { col: 0,  row: 10 },  // go left
  { col: 0,  row: 6  },  // back to entrance = escape
]
```

`buildCenterline()` fills in all the intermediate tiles between each pair of waypoints:

```js
// Waypoints [A, B] where A.row === B.row (horizontal segment)
const step = B.col > A.col ? 1 : -1  // going right or left?
for (let c = A.col; c !== B.col; c += step) {
  tiles.push({ col: c, row: A.row })
}
```

The result is `PATH_TILES` — an ordered array of every tile the heroes walk through, from index 0 (entrance) to index 54 (back at entrance). Heroes simply advance through this array.

### Variable-width path: PATH_EXTRA

Aesthetically, a single-tile-wide path looks thin and boring. We add "extra" tiles beside some segments to widen them visually without making them walkable:

```js
// Add row 1 above the top horizontal (row 2) for a wider corridor feel
for (let c = 4; c <= 16; c++) PATH_EXTRA.push({ col: c, row: 1 })
```

These extra tiles are marked `TILE.PATH` in the grid (so players can't build towers there), but they're not in `PATH_TILES` (heroes don't walk on them). `PATH_CENTER_SET` tracks only the walkable centerline, so on-path traps can only be placed on tiles heroes actually step on.

### Hero movement: lerping between waypoints

"Lerp" stands for **linear interpolation** — smoothly moving between two values over time.

Each hero has a `pathIndex` pointing to their current position in `PATH_TILES`. On each tick:

1. Get the *next* waypoint: `nextTile = PATH_TILES[hero.pathIndex + 1]`
2. Compute the pixel coordinates of its centre: `targetX = nextTile.col * 48 + 24`
3. Calculate the distance from the hero's current pixel position to the target
4. Move toward it by `speed * deltaMs / 1000` pixels
5. If they've arrived (distance ≤ moveSpeed), snap to the waypoint and increment `pathIndex`

```js
const dx = targetX - hero.x
const dy = targetY - hero.y
const dist = Math.sqrt(dx * dx + dy * dy)

if (dist <= moveSpeed) {
  // Arrived — move to next waypoint
  hero.x = targetX
  hero.y = targetY
  hero.pathIndex++
} else {
  // Still moving — take a step toward it
  hero.x += (dx / dist) * moveSpeed  // normalized direction × speed
  hero.y += (dy / dist) * moveSpeed
}
```

`(dx / dist)` normalises the direction vector to length 1. Multiplying by `moveSpeed` gives a step of exactly the right length regardless of the direction.

---

## Part 7 — The Simulation Tick

### Separating logic from rendering

A key architectural decision: **game logic lives in `simulation.js` (pure JavaScript), completely separate from React and the canvas renderer**.

`simulation.js` exports one function:

```js
export function simulationTick(heroes, grid, deltaMs, trapTimers) {
  // ... process everything ...
  return { heroes: updatedHeroes, events, treasureDamage, goldEarned, trapTimers }
}
```

It takes the current state, processes one time step, and returns a new state. It has no knowledge of React, canvas, or the DOM — it's just data in, data out. This makes it easy to test in isolation (as we did during development by running it in Node.js).

### The event system

Instead of mutating shared state directly, the simulation emits **events** — plain objects describing what happened:

```js
events.push({ type: 'hero_killed', hero: hero.id, label: 'Knight', gold: 30 })
events.push({ type: 'treasure_reached', hero: hero.id, label: 'Thief' })
events.push({ type: 'trap_triggered', trapKey: '5,6', trap: 'spike', label: 'Knight' })
events.push({ type: 'tower_attack', col: 4, row: 3, towerType: 'dart', fromX: ..., toX: ... })
```

The gameStore RAF loop reads these events each tick and uses them to:
- Build battle log messages ("⚔️ Knight slain while fleeing! (+55g)")
- Create attack flash animations for the renderer
- Destroy one-shot boulders from the grid
- Add gold to the bank

This pattern (emit events, consume them separately) is the same idea as event-driven architecture in backend systems — except here it happens 60 times per second.

### Two-pass hero processing

The simulation tick runs in two passes:

**Pass 1** — process every hero:
- Apply status effects (poison DoT, lava DoT, slow timer countdown)
- Move along the path
- Check for gold pickup at treasure tile
- Check for on-path traps (spike, boulder)
- Check for death

**Pass 2** — process every off-path tower:
- For each tile in the grid that is a tower (has a `range` property)
- Find the closest hero within range
- If the tower's cooldown has elapsed, deal damage and emit a `tower_attack` event

The two passes are separate because tower attacks need to see the *final positions* of heroes after they've moved. If we mixed them, a hero might dodge into a tower's range and be attacked before it had a chance to move.

---

## Part 8 — Sprites: Drawing Characters Without Image Files

### The problem with image files

Most games use sprite sheets — large image files containing all character animations, loaded at startup. This works great but means you need actual art assets. Our sprites are drawn **programmatically** using the Canvas 2D API — no image files at all.

### Every sprite is a function

Each entity has a dedicated drawing function in `sprites.js`:

```js
export function drawKnight(ctx, cx, cy, t, hero = {}) {
  // ctx: the canvas context to draw on
  // cx, cy: centre pixel position
  // t: current time in milliseconds (from performance.now())
  // hero: the hero object (for status like poisoned, hasGold)
}
```

To draw the Knight, you call `drawKnight(ctx, hero.x, hero.y, t, hero)`. The function draws a complete animated character at that position using `fillRect`, `arc`, and `save/restore` calls.

### Time-based animation: Math.sin()

The core of all sprite animation is `Math.sin(t * speed)`. The sine function produces a smooth wave between -1 and +1:

```js
const bob = Math.sin(t * 0.007) * 1.5  // oscillates ±1.5 pixels, ~1.8 times per second
```

By passing `t` (time in ms) into `Math.sin`, the animation runs continuously. The `speed` constant controls frequency:
- `0.004` → slow pulse (about once every 1.6 seconds)
- `0.012` → faster oscillation (about 5 times per second)

Useful variants:

```js
// Oscillates 0 → 1 → 0 → 1 (always positive)
const pulse = (Math.sin(t * 0.004) + 1) / 2

// Bounces: 0 → 1 → 0 (like a ball bouncing)
const bounce = Math.abs(Math.sin(t * 0.006))

// Walk frame: alternates 0 and 1 (for leg animation)
const walkFrame = Math.floor(t * 0.006) % 2
```

### How the walk cycle works

For the Knight, legs alternate positions based on the walk frame:

```js
const lLeg = swing(t, 0.009) * 6   // -6 to +6 pixel offset
const rLeg = -lLeg                  // opposite phase

// Draw left leg at y + 8 + lLeg, right leg at y + 8 + rLeg
ctx.fillRect(-7, 8 + lLeg * 0.4, 6, 9)
ctx.fillRect( 1, 8 + rLeg * 0.4, 6, 9)
```

When lLeg is positive (leg back), rLeg is negative (leg forward) — exactly like a walking stride.

### Tile sprites vs hero sprites

**Hero sprites** are drawn at the hero's pixel position (which changes every frame as the hero moves).

**Tile sprites** are drawn at the tile's fixed grid position, but they *animate in place*. A spike plate extends and retracts; a fire vent breathes flame; a slime squishes and bounces. All of this uses the same `Math.sin(t * speed)` approach, just applied to the geometry being drawn rather than a position.

The wraith is special — it also *roams* around its tile using a drift offset derived from its tile position as a seed (so each wraith has a unique but deterministic drift pattern):

```js
const seed  = tx * 0.017 + ty * 0.013  // unique number per tile
const roamX = Math.sin(t * 0.0009 + seed) * 10  // drifts ±10px in X
const roamY = Math.cos(t * 0.0007 + seed * 1.3) * 8  // drifts ±8px in Y
```

---

## Part 9 — Attack Animations: Projectiles and the Wraith Rush

### The flash system

When a tower fires, the simulation emits a `tower_attack` event. The gameStore converts this into an **attack flash** — a small object stored in the Zustand store:

```js
{
  fromX: 192, fromY: 144,    // tower's pixel centre
  toX:   384, toY:   312,    // hero's pixel position at attack time
  towerType: 'dart',
  tileCol: 4, tileRow: 3,    // grid coordinates (for wraith position tracking)
  t: 1703254923.4,           // timestamp when the attack fired
}
```

Flashes are kept alive long enough for the longest animation (the wraith rush at 700ms). Every frame, the canvas renderer looks at all active flashes and draws the appropriate effect.

### Projectile animation: lerping from A to B

For a dart:

```js
const age      = now - flash.t                    // ms since it fired
const duration = 230                              // dart travels in 230ms
const progress = age / duration                   // 0.0 → 1.0

// Eased progress (starts fast, slows at end)
const p  = 1 - (1 - progress) * (1 - progress)   // easeOut quadratic

// Current position: lerp from tower to hero
const cx = fromX + (toX - fromX) * p
const cy = fromY + (toY - fromY) * p
```

Then we draw the dart at `(cx, cy)`, rotated to face the direction of travel:

```js
const angle = Math.atan2(toY - fromY, toX - fromX)  // direction angle in radians
ctx.translate(cx, cy)
ctx.rotate(angle)
// Draw dart shaft and tip in rotated space
ctx.fillRect(-10, -1.5, 18, 3)  // shaft
```

`Math.atan2(dy, dx)` converts a direction vector into an angle. This is how we always point a projectile in the right direction, regardless of where the tower and hero are.

### Easing: why motion feels smooth

Without easing, a dart moves at constant velocity and feels mechanical. With **ease-out**, it starts fast and slows as it reaches the target — more natural.

```js
// Linear: boring constant speed
const p = progress

// Ease-out quadratic: fast start, slow end
const p = 1 - (1 - progress) * (1 - progress)

// Ease-in quadratic: slow start, fast end
const p = progress * progress
```

Visualise it: linear is a straight diagonal line on a graph of position vs time. Ease-out is a curve that starts steep and flattens — fast movement becoming slower, like a ball decelerating.

The wraith rush uses ease-out for the outward trip (it accelerates quickly toward the target) and ease-in for the return (it starts slow then surges back home).

### The Wraith: moving the sprite itself

Every other tower fires a projectile and stays put. The Wraith physically *moves to the target*. This required a different approach.

The wraith's sprite function `drawWraithTile(ctx, tx, ty, t, rushPos)` accepts an optional `rushPos = { x, y }`. When this is provided, the wraith draws itself at those pixel coordinates instead of its tile's normal position.

Each frame, the renderer computes the wraith's current position using `wraithRushPos(flash, now)`:

```js
if (progress < 0.40) {
  // Rushing out — ease-out toward target
  const p = easeOut(progress / 0.40)
  return { x: lerp(fromX, toX, p), y: lerp(fromY, toY, p) }
} else {
  // Returning — ease-in back home
  const p = easeIn((progress - 0.40) / 0.60)
  return { x: lerp(toX, fromX, p), y: lerp(toY, fromY, p) }
}
```

The wraith is also drawn *unclipped* (most sprites are clipped to their tile's boundaries). This lets it travel freely across the screen during the rush without being cut off.

### The Skeleton: melee without moving

The skeleton stays on its tile but swings its weapon. When an attack flash exists for a skeleton tile, the renderer draws a sword arc on top of the sprite:

```js
const swingPeak = Math.sin(progress * Math.PI)  // 0 at start, peaks at midpoint, 0 at end
const gx = Math.cos(angle) * 24  // tip of the swing arc
const gy = Math.sin(angle) * 24

ctx.arc(0, 0, 24, angle - 0.72, angle + 0.72)   // arc sector toward target
ctx.stroke()

// Impact flash at the tip when swing is at its peak
if (swingPeak > 0.48) {
  ctx.fillStyle = `rgba(255,248,200,${(swingPeak - 0.48) * 0.72})`
  ctx.arc(gx, gy, 7, 0, Math.PI * 2)  // bright circle at impact point
  ctx.fill()
}
```

`Math.sin(progress * Math.PI)` produces a value that starts at 0, peaks at 1 when `progress = 0.5`, and returns to 0 at `progress = 1`. This is exactly the shape of a swing: nothing → full extension → nothing.

---

## Part 10 — The Status Effect System

### How DoT works

Poison deals 3 HP per second as a "damage over time" (DoT) effect. The hero carries a `poisoned: boolean` flag. Each tick:

```js
if (hero.poisoned) {
  hero.hp -= 3 * (deltaMs / 1000)
  // At 16ms delta: 3 * 0.016 = 0.048 HP per frame
  // Over 1 second (60 frames): ~3 HP total — exactly 3 HP/s
}
```

Multiplying by `(deltaMs / 1000)` converts "per second" into "per tick", the same pattern as movement.

### How slow works

The Ice Shard applies a 2-second slow. Heroes carry `slowed: boolean` and `slowTimer: number` (ms remaining):

```js
// When ice tower hits:
hero.slowed = true
hero.slowTimer = 2000  // ms

// Each tick:
if (hero.slowed) {
  hero.slowTimer -= deltaMs
  if (hero.slowTimer <= 0) {
    hero.slowed = false  // expired
  }
}

// Applied to movement:
const slowMult = hero.slowed ? 0.5 : 1.0
const moveSpeed = hero.speed * TILE_SIZE * (deltaMs / 1000) * slowMult
```

Multiple speed modifiers stack multiplicatively. A slowed Mage carrying gold would have:
- Base speed: 1.0 tiles/s
- × 0.72 (carrying gold as a Mage)
- × 0.5 (slowed)
- = 0.36 tiles/s — barely moving

This is the Ice + Poison combo the game rewards.

---

## Part 11 — The Canvas Rendering Pipeline

Rendering happens in a specific order each frame. The order matters because later draws paint over earlier ones (like layers in Photoshop):

```
1. Clear canvas (wipe everything from last frame)
2. Draw tile bases — background colour + border for every tile
3. Draw tile sprites — the animated sprite for each trap/tower/monster
   2b. Wraith drawn unclipped, in a separate pass
4. Draw range preview — gold highlight showing selected tower's attack radius
5. Draw hover highlight — yellow outline on the tile the mouse is over
6. Draw attack animations — projectiles, sword arcs, effects
7. Draw heroes — the animated hero sprites with HP bars above them
```

If we drew heroes first and then tile bases, heroes would disappear under the tiles. The order encodes the visual z-depth of every element.

### Clipping

Most tile sprites clip their drawing to the tile's bounding box using `ctx.clip()`:

```js
ctx.save()
ctx.beginPath()
ctx.rect(x, y, TILE_SIZE, TILE_SIZE)  // define clipping region
ctx.clip()                              // all subsequent draws are masked to this rect
drawFn(ctx, x, y, t)
ctx.restore()                           // restores clip region
```

This prevents an animated sprite (like a bouncing slime) from bleeding visually onto adjacent tiles. The wraith is explicitly excluded from this because its idle roam and attack rush both take it outside its tile.

### useCallback and stable function references

The `draw` function in `DungeonGrid.jsx` is wrapped in `useCallback`:

```js
const draw = useCallback(() => {
  // draw everything...
  animFrame.current = requestAnimationFrame(draw)
}, [phase, selectedTool, selectedToolDef])
```

`useCallback` memoizes the function — it only creates a new function object when its dependencies change. If the function were recreated on every render (which happens dozens of times per second during a wave), the `useEffect` would restart the RAF loop constantly, causing flickering or frame drops.

By keeping `heroes`, `grid`, and `attackFlashes` out of the dependency array (reading them through refs instead), the draw loop only restarts when genuinely necessary — like switching between plan and wave phases.

---

## Part 12 — The Game as a State Machine

### State machine concept

A state machine is a system that can be in exactly one of a fixed set of states, and moves between them through explicit transitions. Our game has four states:

```
MENU → (start game) → PLAN
PLAN → (send them in) → WAVE
WAVE → (all heroes resolved) → RESULTS
RESULTS → (pick upgrade card) → PLAN
```

The `phase` field in the Zustand store holds the current state. `App.jsx` renders a completely different screen for each:

```jsx
{phase === PHASE.MENU    && <MainMenu />}
{phase === PHASE.PLAN || phase === PHASE.WAVE && <GameScreen />}
{phase === PHASE.RESULTS && <ResultsScreen />}
```

This is the same pattern as a backend API's request lifecycle or a workflow engine — the system is always in a well-defined state, and transitions happen through specific actions.

### Hero state machine

Each hero is also a state machine:

```
spawning → (spawnDelay elapsed) → moving
moving   → (hp <= 0)           → dead
moving   → (pathIndex reaches end) → escaped
```

The simulation checks for state transitions each tick. Once a hero is `dead` or `escaped`, it's skipped in all subsequent processing.

---

## Part 13 — How Everything Connects: A Full Trace

Here's what happens when a Knight steps on a Spike Plate that kills it:

1. **Simulation Pass 1** (in `simulation.js`): Hero arrives at the spike tile. `handleOnPathTrap` returns `{ hero: { ...hero, hp: hero.hp - 25 } }`. HP reaches 0. The hero's state becomes `'dead'`. `goldEarned += hero.goldValue`.

2. **Simulation returns** a result object including the `hero_killed` event.

3. **gameStore RAF loop** receives the result. It calls `set({ heroes: ..., bank: bank + goldEarned, ... })`. The battle log array gets a new entry: `"⚔️ Knight defeated (+30g)"`. The attack flash array may also get new entries from tower attacks this tick.

4. **Zustand notifies subscribers**: Any React component that read `heroes`, `bank`, or `battleLog` from the store is re-rendered.

5. **BattleLog component re-renders**: The Knight's row now shows "☠ Slain" in red. The SLAIN counter increments.

6. **HUD component re-renders**: The gold display updates to reflect the new bank value.

7. **Canvas draw loop** (already running independently): On the next animation frame, it reads `heroesRef.current` (which now contains the dead Knight with `state: 'dead'`). The draw code checks `if (!hero.spawned || hero.state === 'dead') continue` — the dead Knight is skipped. Its sprite disappears from the canvas.

The same knight went from alive to dead and that change propagated through the simulation, the state store, two React components, and the canvas renderer — all within about 16 milliseconds.

---

## Appendix: Key JavaScript Concepts Used Throughout

### ES Modules

Every file uses `import` / `export` rather than `require`. This is the modern standard:

```js
// Named exports
export const TILE = { ... }
export function buildCenterline() { ... }

// Named imports
import { TILE, buildCenterline } from './constants.js'

// Default export (one per file)
export default function HUD() { ... }

// Default import
import HUD from './components/HUD.jsx'
```

### Spread operator

`{ ...obj, key: newValue }` creates a new object that copies all properties of `obj` and then overwrites `key`. This is how we update hero state immutably (without mutating the original):

```js
hero = { ...hero, hp: hero.hp - 25, poisoned: true }
// hero is now a NEW object with all original fields + updated hp and poisoned
```

### Array methods

```js
heroes.filter(h => h.state === 'moving')  // returns new array with only moving heroes
heroes.map(h => ({ ...h, poisoned: true }))  // returns new array with all heroes poisoned
heroes.every(h => h.state === 'dead')  // true if all heroes are dead
heroes.find(t => t.id === selectedTool)  // first tool with matching id
```

### Destructuring

```js
// Object destructuring (pull fields out by name)
const { fromX, fromY, toX, toY } = flash
// Same as: const fromX = flash.fromX; const fromY = flash.fromY; ...

// Array destructuring
const [c, r] = trapKey.split(',').map(Number)
// Split "5,6" into ["5","6"], convert to [5, 6], assign c=5 and r=6
```

### Optional chaining

```js
const slow = DUNGEON_TOOLS.find(t => t.id === TILE.DOOR)?.slow ?? 1
// If find() returns undefined, ?.slow returns undefined instead of throwing
// ?? 1 provides a fallback of 1 if the result is null or undefined
```

### Template literals

```js
const key = `tower_${col},${row}`  // same as "tower_" + col + "," + row
const rgb = `rgba(255,${red},0,${alpha})`
```

These appear constantly in the sprite and simulation code for building lookup keys and CSS colour strings.

---

*This project started as a sketch in a conversation about portfolio projects. Everything in it — the simulation, the sprites, the path system, the attack animations — was built iteratively, one concept at a time.*
