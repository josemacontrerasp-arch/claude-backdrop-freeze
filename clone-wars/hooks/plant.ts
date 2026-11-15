// A third backdrop for the same mod: a little process plant drawn like a blueprint, run by the Claude mascot in a
// lab coat and safety goggles. TOKENS are pumped into a reactor named CLAUDE, CODE comes out, and the excess burns
// at the flare. The reactor has a window, and what is behind it is a titration: while Claude is working, drops fall
// into the purple liquid and each one blooms pink and is stirred away; when the answer is done, the whole batch turns
// pink, the end point.
//
// THREE PICTURES, one for each state of the session, because the plant runs only while Claude does:
//   idle: nothing moves. Purple liquid, pumps at rest, a pilot flame.
//   run:  everything moves, and goes on moving until the turn ends.
//   done: the liquid turns pink once, the product tank fills a little, the mascot cheers, and then nothing moves.
// An idle or a done picture has no animation that repeats, so it costs the machine nothing: a scene that never
// stops was measured at about a whole processor core in the desktop app.
//
// One SVG each, animated with CSS alone. No script. Pure string building: the same output on every call.
// Drawn on the fireworks scene's 320 by 200 grid and written out five times as large, with its helpers. What a scene
// must not contain to run in the desktop app (viewport units, a class named like one, shape-rendering, non-scaling
// strokes) is listed at the top of scene.ts, and a test reads these pictures for all of it.

import { blank, cellsOf, enlarged, enlargedRules, ENLARGE, EYE, fill, FONT, MASCOT, rectsOf } from './sleepy'

export type PlantState = 'idle' | 'run' | 'done'

// The blueprint's inks.
const PAPER = '#0c1c3a'
const GRID = '#12284f'
const LINE = '#a9c7ff' // equipment
const PIPE = '#4f7fc4'
const DARK = '#081428' // inside a vessel
const TEXT = '#cfe0ff'
const TOKEN = '#ffe36e'
const PURPLE = '#5b4fa3' // the liquid before the end point
const PINK = '#ff7ac8' // and at it
const COAT = '#f4f6fb'
const TRIM = '#c3c8d4'
const FRAME = '#565a66'

// The letters the fireworks scene does not have.
const LETTERS: Record<string, readonly string[]> = {
  ...FONT,
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
}

function box(x: number, y: number, width: number, height: number, ink: string, more = ''): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${ink}"${more}/>`
}

/** A rectangle's outline, one pixel thick, over a filling of its own. */
function vessel(x: number, y: number, width: number, height: number, inside = DARK): string {
  return (
    box(x + 1, y + 1, width - 2, height - 2, inside) +
    box(x + 1, y, width - 2, 1, LINE) +
    box(x + 1, y + height - 1, width - 2, 1, LINE) +
    box(x, y + 1, 1, height - 2, LINE) +
    box(x + width - 1, y + 1, 1, height - 2, LINE)
  )
}

/** A word in the 5 by 7 letters, its middle at `cx`. */
function label(text: string, cx: number, y: number, ink = TEXT): string {
  const cells = blank(text.length * 6 - 1, 7)

  ;[...text].forEach((letter, index) => {
    ;(LETTERS[letter] ?? []).forEach((row, rowIndex) => {
      ;[...row].forEach((mark, column) => {
        if (mark === '#') fill(cells, index * 6 + column, rowIndex, 1, 1, '#')
      })
    })
  })

  return rectsOf(cells, 1, Math.round(cx - (text.length * 6 - 1) / 2), y, { '#': ink })
}

// ---------------------------------------------------------------------------------------------- the plant

/** The paper: a blueprint's grid, and the floor the mascot stands on. */
function paper(): string {
  let lines = ''

  for (let x = 20; x < 320; x += 20) lines += box(x, 0, 1, 176, GRID)
  for (let y = 20; y < 176; y += 20) lines += box(0, y, 320, 1, GRID)

  return box(0, 0, 320, 200, PAPER) + lines + box(0, 177, 320, 23, '#091530') + box(0, 176, 320, 1, '#2c4f8a')
}

/** Every pipe, two pixels thick: feed to pump to reactor, reactor to product, and the vent up to the flare. */
function pipes(): string {
  return (
    box(60, 111, 45, 2, PIPE) + // out of the feed tank, through the pump
    box(103, 61, 2, 52, PIPE) + // up
    box(103, 61, 48, 2, PIPE) + // across, into the reactor, to the nozzle over the liquid
    box(192, 109, 58, 2, PIPE) + // reactor to product tank
    box(183, 29, 2, 26, PIPE) + // the vent, up from the reactor
    box(183, 29, 119, 2, PIPE) + // and across to the flare
    box(299, 25, 4, 6, LINE) // the flare's tip
  )
}

/** The feed tank on its legs, most of the way full of tokens. */
function feed(): string {
  return vessel(24, 60, 36, 64) + box(26, 84, 32, 38, '#7d6a1e') + box(26, 84, 32, 1, TOKEN) + box(28, 124, 2, 6, LINE) + box(54, 124, 2, 6, LINE) + label('TOKENS', 42, 134)
}

/** The pump: a square housing on the feed line. Its rotor is drawn by `rotor`. */
function pump(): string {
  return vessel(77, 107, 11, 11, '#10264a')
}

/** The rotor as a plus, and as a cross: one of the two shows at a time while the pump runs. */
function rotor(isRunning: boolean): string {
  const plus = box(82, 109, 1, 7, TOKEN) + box(79, 112, 7, 1, TOKEN)
  const cross = [0, 1, 2, 3, 4].map(step => box(80 + step, 110 + step, 1, 1, TOKEN) + box(84 - step, 110 + step, 1, 1, TOKEN)).join('')

  return isRunning ? `<g class="spin-a">${plus}</g><g class="spin-b">${cross}</g>` : `<g fill-opacity=".55">${plus}</g>`
}

/** The reactor: its shell, the motor on top, the window, and the name over it. What is behind the window is `batch`. */
function reactor(): string {
  return (
    vessel(128, 54, 64, 80, '#10264a') +
    box(128, 54, 1, 1, PAPER) + box(191, 54, 1, 1, PAPER) + box(128, 133, 1, 1, PAPER) + box(191, 133, 1, 1, PAPER) + // rounded corners
    vessel(152, 46, 15, 9, '#1b3766') + // the stirrer's motor
    box(140, 134, 3, 8, LINE) + box(177, 134, 3, 8, LINE) + // legs
    label('CLAUDE', 160, 34)
  )
}

/** The window's frame, drawn over the batch. */
function windowFrame(): string {
  return box(139, 59, 42, 1, LINE) + box(139, 122, 42, 1, LINE) + box(139, 60, 1, 62, LINE) + box(180, 60, 1, 62, LINE) + box(141, 61, 3, 1, '#dfeaff') + box(141, 62, 1, 3, '#dfeaff')
}

/**
 * What the window shows: the dark head space with the nozzle in it, and the liquid under it. While the plant runs,
 * a drop falls from the nozzle every beat and blooms pink where it lands; the paddle turns, bubbles rise, and the
 * purple shifts. When the turn is done the liquid turns pink, once, and stays.
 */
function batch(state: PlantState): string {
  const glass = box(140, 60, 40, 62, '#0a1730')
  const nozzle = box(148, 61, 5, 2, PIPE) + box(149, 63, 3, 2, LINE)
  const shaft = box(159, 55, 2, 52, LINE)
  const liquid = box(140, 86, 40, 36, state === 'done' ? PINK : PURPLE, state === 'idle' ? '' : ` class="${state === 'run' ? 'liquid' : 'turned'}"`)
  const surface = box(140, 86, 40, 1, state === 'done' ? '#ffc1e6' : '#8f84d6', state === 'done' ? ' class="shown"' : '')
  const wide = box(151, 106, 18, 2, LINE)
  const narrow = box(157, 106, 6, 2, LINE)

  if (state !== 'run') return glass + liquid + surface + nozzle + shaft + wide

  let bubbles = ''

  ;[144, 150, 166, 172, 176].forEach((x, index) => {
    bubbles += box(x, 116, index % 2 === 0 ? 2 : 1, index % 2 === 0 ? 2 : 1, '#b9b0f0', ` class="bubble" style="animation-duration:${(1.9 + index * 0.45).toFixed(2)}s;animation-delay:-${(index * 0.7).toFixed(1)}s"`)
  })

  return (
    glass +
    liquid +
    surface +
    // The pink where a drop has just landed: it spreads along the surface and is stirred away.
    `<g class="bloom">${box(147, 87, 7, 3, PINK)}${box(145, 90, 4, 2, PINK)}${box(153, 90, 5, 2, PINK)}</g>` +
    `<g class="streak">${box(156, 93, 6, 1, PINK)}${box(162, 95, 4, 1, PINK)}</g>` +
    bubbles +
    nozzle +
    box(150, 66, 2, 2, PINK, ' class="drop"') +
    shaft +
    `<g class="stir-a">${wide}</g><g class="stir-b">${narrow}</g>`
  )
}

/** The valve on the product line (a bow tie), the product tank with its level, and its name. */
function product(state: PlantState): string {
  const valve = [0, 1, 2, 3].map(step => box(217 + step, 106 + step, 1, 8 - step * 2, LINE) + box(225 - step, 106 + step, 1, 8 - step * 2, LINE)).join('')
  // The level stands a little higher once a batch is done.
  const fresh = state === 'done' ? box(252, 96, 42, 6, PINK, ' class="shown"') : ''

  return valve + vessel(250, 66, 46, 60) + box(252, 102, 42, 22, '#2d7a57') + box(252, 102, 42, 1, '#5fe08a') + fresh + box(254, 126, 2, 6, LINE) + box(290, 126, 2, 6, LINE) + label('CODE', 273, 136)
}

/** The flare: a pilot light at rest, a flame in two shapes that take turns while the plant runs. */
function flare(isRunning: boolean): string {
  const pilot = box(300, 22, 2, 3, '#ff9a2e')
  const tall = rectsOf(cellsOf(['..Y..', '.YY..', '.YFY.', 'YFFY.', 'YFFFY', '.FFF.']), 2, 296, 13, { Y: TOKEN, F: '#ff9a2e' })
  const wide = rectsOf(cellsOf(['.....', '...Y.', '.YYY.', '.YFFY', 'YFFFY', '.FFF.']), 2, 296, 13, { Y: TOKEN, F: '#ff9a2e' })

  return (isRunning ? `<g class="flame-a">${tall}</g><g class="flame-b">${wide}</g>` : pilot) + label('FLARE', 270, 36)
}

/** The tokens on their way: small squares that travel each stretch of pipe, a few to a stretch. */
function flow(): string {
  const stretch = (name: string, x: number, y: number, count: number, seconds: number): string =>
    Array.from({ length: count }, (_unused, index) => box(x, y, 2, 2, TOKEN, ` class="${name}" style="animation-delay:-${((seconds * index) / count).toFixed(2)}s"`)).join('')

  return (
    stretch('flow-feed', 60, 111, 3, 1.8) +
    stretch('flow-rise', 103, 109, 3, 2) +
    stretch('flow-in', 105, 61, 2, 1.2) +
    stretch('flow-out', 192, 109, 3, 2.2) +
    stretch('flow-vent', 183, 51, 2, 1.4) +
    stretch('flow-flare', 185, 29, 5, 4.4)
  )
}

/** The board that says what the plant is doing. */
function board(state: PlantState): string {
  const word = state === 'idle' ? 'IDLE' : state === 'run' ? 'RUN' : 'DONE'
  const ink = state === 'idle' ? '#6f8fc9' : state === 'run' ? '#ffb84a' : '#5fe08a'

  return vessel(24, 148, 46, 17, '#10264a') + box(28, 154, 4, 4, ink, state === 'run' ? ' class="lamp"' : '') + `<g${state === 'run' ? ' class="lamp"' : ''}>${label(word, 52, 153, ink)}</g>`
}

// ---------------------------------------------------------------------------------------------- the mascot

const HERO = { x: 186, y: 136 }

/**
 * The Claude mascot as the plant's chemist: the same body, arms, legs and square eyes as its logo, in safety goggles
 * and a white coat, with a flask in its hand. The flask holds what the reactor holds. While the plant runs it
 * breathes and swirls the flask; when the batch is done its arms go up.
 */
function chemist(state: PlantState): string {
  const at = (x: number, y: number, width: number, height: number, ink: string, more = ''): string => box(HERO.x + x, HERO.y + y, width, height, ink, more)
  const legs = [2, 4, 7, 9].map(unit => at(unit * 5, 30, 5, 10, MASCOT)).join('')
  const body = at(10, 0, 40, 30, MASCOT) + at(10, 14, 40, 16, COAT)
  const coat =
    // lapels in a V, a row of buttons, a pocket
    at(24, 14, 4, 2, TRIM) + at(32, 14, 4, 2, TRIM) + at(26, 16, 3, 2, TRIM) + at(31, 16, 3, 2, TRIM) + at(29, 18, 2, 2, TRIM) + at(30, 20, 1, 10, TRIM) + at(15, 23, 7, 1, TRIM) + at(15, 23, 1, 5, TRIM) + at(21, 23, 1, 5, TRIM) + at(15, 27, 7, 1, TRIM)
  const goggles =
    at(7, 5, 3, 7, EYE) + at(50, 5, 3, 7, EYE) + // the strap's ends
    at(12, 3, 36, 2, FRAME) + at(12, 3, 2, 10, FRAME) + at(46, 3, 2, 10, FRAME) + at(12, 11, 14, 2, FRAME) + at(34, 11, 14, 2, FRAME) + // the frame
    at(26, 9, 2, 3, FRAME) + at(32, 9, 2, 3, FRAME) + at(28, 8, 4, 2, FRAME) + // its bridge over the nose
    at(15, 5, 5, 5, EYE) + at(40, 5, 5, 5, EYE)
  const leftArm = at(5, 12, 5, 8, COAT) + at(0, 10, 5, 8, MASCOT)
  const flaskInk = state === 'done' ? PINK : PURPLE
  const flask =
    at(50, 14, 5, 8, COAT) + at(55, 14, 5, 8, MASCOT) + // the sleeve and the hand that holds it
    at(63, 8, 1, 8, TRIM) + at(67, 8, 1, 8, TRIM) + at(62, 7, 7, 1, TRIM) + // the neck
    at(62, 16, 1, 3, TRIM) + at(68, 16, 1, 3, TRIM) + at(61, 19, 1, 3, TRIM) + at(69, 19, 1, 3, TRIM) + at(60, 22, 1, 4, TRIM) + at(70, 22, 1, 4, TRIM) + at(60, 26, 11, 1, TRIM) + // the sides and the foot
    at(62, 19, 7, 3, flaskInk, state === 'done' ? ' class="turned"' : '') + at(61, 22, 9, 4, flaskInk, state === 'done' ? ' class="turned"' : '')
  // The tick over its head when the batch is done.
  const tick = state === 'done' ? `<g class="shown">${rectsOf(cellsOf(['.......#', '......##', '#....##.', '##..##..', '.####...', '..##....']), 2, HERO.x + 22, HERO.y - 18, { '#': '#5fe08a' })}</g>` : ''

  if (state === 'run') return `${legs}<g class="nod">${body}${coat}${goggles}${leftArm}<g class="swirl">${flask}</g></g>`
  if (state === 'done') return `${legs}${body}${coat}${goggles}<g class="cheer">${leftArm}${flask}</g>${tick}`

  return legs + body + coat + goggles + leftArm + flask
}

// ---------------------------------------------------------------------------------------------- the motion

/** A stretch of pipe as an animation: a square goes this far and starts again. */
function along(name: string, dx: number, dy: number, seconds: number): string {
  return `.${name}{animation:${name} ${seconds}s linear infinite}@keyframes ${name}{from{transform:translate(0px,0px)}to{transform:translate(${dx}px,${dy}px)}}`
}

/** Two shapes that take turns: the first shows for the first half of each beat, the second for the other. */
function turns(first: string, second: string, seconds: number): string {
  return (
    `.${first}{animation:${first} ${seconds}s step-end infinite}@keyframes ${first}{0%{opacity:1}50%{opacity:0}to{opacity:1}}` +
    `.${second}{opacity:0;animation:${second} ${seconds}s step-end infinite}@keyframes ${second}{0%{opacity:0}50%{opacity:1}to{opacity:0}}`
  )
}

/** While the plant runs: everything here repeats for as long as the picture is up. */
function running(): string {
  return (
    turns('spin-a', 'spin-b', 0.36) +
    turns('stir-a', 'stir-b', 0.5) +
    turns('flame-a', 'flame-b', 0.3) +
    along('flow-feed', 43, 0, 1.8) +
    along('flow-rise', 0, -48, 2) +
    along('flow-in', 40, 0, 1.2) +
    along('flow-out', 56, 0, 2.2) +
    along('flow-vent', 0, -22, 1.4) +
    along('flow-flare', 113, 0, 4.4) +
    // The titration: a drop falls every beat, and where it lands the liquid shows the end point's pink for a moment.
    '.drop{animation:drop 1.6s ease-in infinite}@keyframes drop{0%{opacity:1;transform:translate(0px,0px)}40%{opacity:1;transform:translate(0px,19px)}45%{opacity:0;transform:translate(0px,19px)}to{opacity:0;transform:translate(0px,0px)}}' +
    '.bloom{opacity:0;animation:bloom 1.6s ease-out infinite}@keyframes bloom{0%{opacity:0}40%{opacity:0}46%{opacity:1}80%{opacity:0}to{opacity:0}}' +
    '.streak{opacity:0;animation:streak 1.6s linear infinite}@keyframes streak{0%{opacity:0;transform:translate(0px,0px)}50%{opacity:0;transform:translate(0px,0px)}60%{opacity:.8;transform:translate(3px,1px)}95%{opacity:0;transform:translate(12px,4px)}to{opacity:0;transform:translate(12px,4px)}}' +
    `.liquid{animation:liquid 6s ease-in-out infinite}@keyframes liquid{0%{fill:${PURPLE}}50%{fill:#7c4fb8}to{fill:${PURPLE}}}` +
    '.bubble{animation:bubble 2s linear infinite}@keyframes bubble{0%{opacity:0;transform:translate(0px,0px)}15%{opacity:1;transform:translate(0px,-4px)}85%{opacity:1;transform:translate(0px,-24px)}to{opacity:0;transform:translate(0px,-28px)}}' +
    '.lamp{animation:lamp 1s step-end infinite}@keyframes lamp{0%{opacity:1}50%{opacity:.35}to{opacity:1}}' +
    '.nod{animation:nod 2.6s ease-in-out infinite alternate}@keyframes nod{from{transform:translate(0px,0px)}to{transform:translate(0px,1px)}}' +
    '.swirl{animation:swirl .45s ease-in-out infinite alternate}@keyframes swirl{from{transform:translate(-1px,0px)}to{transform:translate(1px,0px)}}'
  )
}

/** When a batch is done: each of these plays once and stays where it ends, so nothing moves afterwards. */
function finishing(): string {
  return (
    `.turned{animation:turned 1.6s ease-in-out 1 both}@keyframes turned{0%{fill:${PURPLE}}35%{fill:${PURPLE}}to{fill:${PINK}}}` +
    '.shown{animation:shown .6s ease-out 1.3s 1 both}@keyframes shown{from{opacity:0}to{opacity:1}}' +
    '.cheer{animation:cheer .35s ease-out 1.5s 1 both}@keyframes cheer{from{transform:translate(0px,0px)}to{transform:translate(0px,-5px)}}'
  )
}

const built = new Map<PlantState, string>()

/** The plant in one of its three states: built once each, the same every time. */
export function plantSvg(state: PlantState): string {
  const kept = built.get(state)

  if (kept !== undefined) return kept

  const style = state === 'run' ? running() : state === 'done' ? finishing() : ''
  const drawing =
    paper() +
    pipes() +
    (state === 'run' ? flow() : '') +
    feed() +
    pump() +
    rotor(state === 'run') +
    reactor() +
    batch(state) +
    windowFrame() +
    product(state) +
    flare(state === 'run') +
    board(state) +
    chemist(state)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${320 * ENLARGE} ${200 * ENLARGE}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">` +
    `<style>${enlargedRules(style)}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>` +
    enlarged(drawing) +
    '</svg>'

  built.set(state, svg)

  return svg
}
