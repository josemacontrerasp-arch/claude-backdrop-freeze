// A second backdrop for the same mod: the Claude mascot asleep on a hill at night. A firework drops in beside it,
// it wakes, lights it, and it bursts into "PEPE USE MORE TOKENS"; then it nods off again.
// One SVG, animated with CSS alone. No script. Pure string building: the same output on every call.
//
// Pixel art: every shape is a rect on a 320 by 200 grid. THE MASCOT is drawn exactly as its logo is: a body eight
// units wide and six tall, an eye one unit square in its second row, an arm two units square at each side, and
// four legs two units tall. Only what the story needs is added: its eyes shut to a line while it sleeps.
//
// BUILT THE PLAIN WAY: one root <svg> with a viewBox, plain groups and rects with their sizes in attributes. No
// <use>, no <symbol>, no pattern, no clip, no <svg> inside the <svg>.
//
// THE STORY is one loop of 32 seconds and every part of it keeps to that loop with keyframes of its own, so the
// parts stay in step. At rest (reduced motion, or the app holding scenes still) the picture is the sleeper and its Zs.
// Beside the story the stars drift, shimmer and twinkle, and the sleeper breathes.
//
// WRITTEN OUT FIVE TIMES AS LARGE: the art is drawn on the 320 by 200 grid and then every length is multiplied by
// five, so the document is 1600 by 1000. Each rect is written a hair wider and taller than its cells so that
// neighbours overlap and no seam shows between them: the picture may not ask for hard pixel edges. What a scene
// must not contain to run in the desktop app (crispEdges, viewport units, a class named like one) is listed at the
// top of scene.ts, and a test reads this scene for all of it.

const LOOP = 32
// The art is drawn on a 320 by 200 grid and written out this many times as large.
export const ENLARGE = 5

// The story's moments, in seconds into the loop.
const DROP = 5 // the firework falls in beside the mascot
const LAND = 5.6
const WAKE = 5.3
const LIGHT = 6.2 // the fuse is lit
const LAUNCH = 8.2
const BURST = 9.5
const WORDS = 9.8 // the first line shows; the others follow
const FADE = 17 // the words begin to go
const GONE = 18
const NOD = 19 // its eyes close again

// Where things stand on the 320 by 200 screen.
const GROUND = 176
const UNIT = 5 // the mascot is twelve units wide and eight tall
const HERO = { x: 226, y: GROUND - 8 * UNIT }
const ROCKET = { x: 210, y: GROUND - 16 }
const SKY_BURST = { x: 196, y: 62 } // where the firework goes off, and the middle of the words

export const MASCOT = '#c77f5f'
export const EYE = '#0d0b0a'

const INK: Record<string, string> = {
  w: '#f4f6fb',
  r: '#d9363e',
  Y: '#ffe36e',
  F: '#ff9a2e',
  z: '#cfe0ff',
}

export type Cells = string[][]

export function blank(width: number, height: number): Cells {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => '.'))
}

export function fill(cells: Cells, x: number, y: number, width: number, height: number, ink: string): void {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      const line = cells[row]

      if (line !== undefined && column >= 0 && column < line.length) line[column] = ink
    }
  }
}

export function cellsOf(rows: readonly string[]): Cells {
  return rows.map(row => [...row])
}

/** A drawing as rects, one group for each ink: runs along a row are one rect, and equal runs in rows one under another are one taller rect. */
export function rectsOf(cells: Cells, scale: number, dx: number, dy: number, inks: Record<string, string> = INK): string {
  const byInk = new Map<string, { x: number; y: number; width: number; height: number }[]>()

  cells.forEach((row, y) => {
    let x = 0

    while (x < row.length) {
      const ink = row[x] ?? '.'

      if (ink === '.') {
        x += 1
        continue
      }

      let width = 1

      while (row[x + width] === ink) width += 1

      const runs = byInk.get(ink) ?? []
      const above = runs.find(run => run.x === x && run.width === width && run.y + run.height === y)

      byInk.set(ink, runs)
      if (above === undefined) runs.push({ x, y, width, height: 1 })
      else above.height += 1
      x += width
    }
  })

  let out = ''

  for (const [ink, runs] of byInk) {
    out += `<g fill="${inks[ink] ?? ink}">${runs
      .map(run => `<rect x="${dx + run.x * scale}" y="${dy + run.y * scale}" width="${run.width * scale}" height="${run.height * scale}"/>`)
      .join('')}</g>`
  }

  return out
}

/** A number between 0 and 1 that is always the same for the same two numbers. */
function hash(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453

  return value - Math.floor(value)
}

// ---------------------------------------------------------------------------------------------- keyframes

/** A moment of the loop as a keyframe's place. */
function at(seconds: number): string {
  return `${Number(((seconds / LOOP) * 100).toFixed(3))}%`
}

/**
 * A class that shows its part only inside the given stretches of the loop, changing at once. `rest` is how the
 * part stands when nothing is animated: 1 shown, 0 hidden.
 */
function shownIn(name: string, stretches: readonly (readonly [number, number])[], rest: 0 | 1): string {
  const inside = (time: number): boolean => stretches.some(([from, to]) => time >= from && time < to)
  const moments = [...new Set(stretches.flat())].filter(moment => moment > 0 && moment < LOOP).sort((one, other) => one - other)
  const frames = [`0%{opacity:${inside(0) ? 1 : 0}}`, ...moments.map(moment => `${at(moment)}{opacity:${inside(moment) ? 1 : 0}}`), `to{opacity:${inside(0) ? 1 : 0}}`]

  return `.${name}{opacity:${rest};animation:${name} ${LOOP}s step-end infinite}@keyframes ${name}{${frames.join('')}}`
}

// ---------------------------------------------------------------------------------------------- the night

const SKY = ['#05060f', '#070917', '#0a0d20', '#0d1129', '#111633', '#151b3d', '#1a2147', '#1f2751']

function sky(): string {
  const band = 200 / SKY.length

  return SKY.map((color, index) => `<rect y="${index * band}" width="320" height="${band}" fill="${color}"/>`).join('')
}

/** A crescent: the pixels of one disc that are not in a second disc set a little aside. */
function moon(cx: number, cy: number, radius: number): string {
  const cells = blank(radius * 2 + 1, radius * 2 + 1)

  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      const isInDisc = x * x + y * y <= radius * radius + 1
      const isInBite = (x - 5) * (x - 5) + (y + 3) * (y + 3) <= (radius - 1) * (radius - 1)

      if (isInDisc && !isInBite) fill(cells, x + radius, y + radius, 1, 1, 'M')
    }
  }

  return rectsOf(cells, 1, cx - radius, cy - radius, { M: '#f3e9c2' })
}

/**
 * Stars as single pixels in two layers that drift sideways for ever at two speeds, and a few crosses that twinkle,
 * each on a clock of its own. A layer is one screen of stars drawn twice, side by side, and slid one screen's width.
 */
function stars(): { drifting: string; rules: string; twinkling: string } {
  let far = ''
  let near = ''
  let twinkling = ''
  let rules = ''

  for (const shift of [0, 320]) {
    for (let index = 0; index < 90; index += 1) {
      const x = Math.floor(hash(index, 1) * 320) + shift
      const y = Math.floor(hash(index, 2) * 160)
      const star = `<rect x="${x}" y="${y}" width="1" height="1"/>`

      if (hash(index, 3) < 0.7) far += star
      else near += star
    }
  }

  for (let index = 0; index < 9; index += 1) {
    const x = 8 + Math.floor(hash(index, 4) * 300)
    const y = 6 + Math.floor(hash(index, 5) * 120)

    rules += `.b${index}{animation:twinkle ${(2.3 + index * 0.37).toFixed(2)}s ease-in-out infinite alternate}`
    twinkling += `<g class="b${index}"><rect x="${x}" y="${y - 1}" width="1" height="3"/><rect x="${x - 1}" y="${y}" width="3" height="1"/></g>`
  }

  rules +=
    '@keyframes twinkle{from{opacity:1}to{opacity:.15}}' +
    '.d1{animation:drift 260s linear infinite}.d2{animation:drift 150s linear infinite}' +
    '@keyframes drift{from{transform:translate(0px,0px)}to{transform:translate(-320px,0px)}}'

  return {
    drifting: `<g class="d1" fill="#5a6388">${far}</g><g class="d2" fill="#c9d3f2"><g class="shim">${near}</g></g>`,
    rules,
    twinkling: `<g fill="#f4f6fb">${twinkling}</g>`,
  }
}

/** A low hill with its top under the sleeper, one rect to a row. */
function hill(): string {
  const middle = HERO.x + 6 * UNIT
  let rows = ''

  for (let y = GROUND; y < GROUND + 5; y += 1) {
    const reach = Math.round(170 * Math.sqrt((y - GROUND + 0.6) / 4.6))
    const from = Math.max(0, middle - reach)
    const to = Math.min(320, middle + reach)

    rows += `<rect x="${from}" y="${y}" width="${to - from}" height="1"/>`
  }

  return `<g fill="#0b0e1c">${rows}<rect y="${GROUND + 5}" width="320" height="${200 - GROUND - 5}"/></g><g fill="#1a2040"><rect x="${middle - 46}" y="${GROUND}" width="92" height="1"/></g>`
}

// ---------------------------------------------------------------------------------------------- the mascot

/** A block of the mascot, in its own units from its top left corner. */
function block(unitX: number, unitY: number, unitsWide: number, unitsTall: number): string {
  return `<rect x="${HERO.x + unitX * UNIT}" y="${HERO.y + unitY * UNIT}" width="${unitsWide * UNIT}" height="${unitsTall * UNIT}"/>`
}

/**
 * The Claude mascot, exactly as its logo: body, two arms, four legs, two square eyes. In parts, because its body
 * breathes on its legs, its arms go up when it cheers, and its eyes are a line while it sleeps.
 */
function hero(): string {
  const legs = [2, 4, 7, 9].map(unitX => block(unitX, 6, 1, 2)).join('')
  const body = block(2, 0, 8, 6)
  const arms = block(0, 2, 2, 2) + block(10, 2, 2, 2)
  const open = block(3, 1, 1, 1) + block(8, 1, 1, 1)
  const shut = [3, 8].map(unitX => `<rect x="${HERO.x + unitX * UNIT}" y="${HERO.y + UNIT + 3}" width="${UNIT}" height="1"/>`).join('')

  return (
    `<g class="hop" fill="${MASCOT}">${legs}<g class="nod"><g class="arm">${arms}</g>${body}` +
    `<g class="eo" fill="${EYE}">${open}</g><g class="ec" fill="${EYE}">${shut}</g></g></g>`
  )
}

/** Three Zs of three sizes that rise from the mascot and fade, one after another, while it sleeps. */
function snore(): string {
  const letters: readonly (readonly string[])[] = [
    ['####', '..#.', '.#..', '####'],
    ['#####', '...#.', '..#..', '.#...', '#####'],
    ['#######', '.....#.', '....#..', '...#...', '..#....', '.#.....', '#######'],
  ]
  const spots = [
    [HERO.x + 52, HERO.y - 8],
    [HERO.x + 59, HERO.y - 19],
    [HERO.x + 67, HERO.y - 33],
  ] as const

  return `<g class="zz">${letters
    .map((rows, index) => {
      const [x, y] = spots[index] ?? [0, 0]

      return `<g class="z z${index}">${rectsOf(cellsOf(rows), 1, x, y, { '#': INK.z ?? '#fff' })}</g>`
    })
    .join('')}</g>`
}

// ---------------------------------------------------------------------------------------------- the firework

/** The rocket, its fuse's spark while it is lit, and its flame while it flies. */
function rocket(): string {
  const body = cellsOf(['.Y.', 'YYY', 'rrr', 'rrr', 'www', 'rrr', 'rrr', 'r.r'])
  const flame = cellsOf(['.Y.', 'FYF', '.F.'])
  const spark = cellsOf(['.Y.', 'YFY', '.Y.'])

  return (
    `<g class="rk">${rectsOf(body, 2, ROCKET.x, ROCKET.y)}<g class="fire"><g class="flick">${rectsOf(flame, 2, ROCKET.x, ROCKET.y + 16)}</g></g></g>` +
    `<g class="fuse"><g class="flick">${rectsOf(spark, 1, ROCKET.x + 7, ROCKET.y + 12)}</g></g>`
  )
}

const SPARK_INKS = ['#ffe36e', '#ff9a2e', '#ff6bcb', '#6de0ff', '#f4f6fb']

/** The burst: a white flash, and sparks thrown out all round that slow, sink and fade. */
function burst(): { body: string; rules: string } {
  const flash = blank(21, 21)
  let body = ''
  let rules = ''

  for (let y = -10; y <= 10; y += 1) {
    for (let x = -10; x <= 10; x += 1) {
      if (x * x + y * y <= 100) fill(flash, x + 10, y + 10, 1, 1, 'w')
    }
  }

  body += `<g class="flash">${rectsOf(flash, 1, SKY_BURST.x - 10, SKY_BURST.y - 10)}</g>`
  rules +=
    `.flash{opacity:0;animation:flash ${LOOP}s step-end infinite}` +
    `@keyframes flash{0%{opacity:0}${at(BURST)}{opacity:1;animation-timing-function:ease-out}${at(BURST + 0.45)}{opacity:0}to{opacity:0}}`

  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2 + 0.2
    const far = index % 2 === 0 ? 58 : 38
    const dx = Math.round(Math.cos(angle) * far * 1.5)
    const dy = Math.round(Math.sin(angle) * far)
    const size = index % 2 === 0 ? 2 : 3

    body += `<rect class="s${index}" x="${SKY_BURST.x - 1}" y="${SKY_BURST.y - 1}" width="${size}" height="${size}" fill="${SPARK_INKS[index % SPARK_INKS.length]}"/>`
    rules +=
      `.s${index}{opacity:0;animation:s${index} ${LOOP}s step-end infinite}` +
      `@keyframes s${index}{0%{opacity:0;transform:translate(0px,0px)}` +
      `${at(BURST)}{opacity:1;transform:translate(0px,0px);animation-timing-function:ease-out}` +
      `${at(BURST + 0.9)}{opacity:1;transform:translate(${dx}px,${dy}px);animation-timing-function:ease-in}` +
      `${at(BURST + 1.7)}{opacity:0;transform:translate(${dx}px,${dy + 8}px)}to{opacity:0;transform:translate(0px,0px)}}`
  }

  return { body, rules }
}

// ---------------------------------------------------------------------------------------------- the words

export const FONT: Record<string, readonly string[]> = {
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
}

/** One line of the words in the 5 by 7 letters, each pixel `scale` wide, centred on `cx`, with a shadow under it. */
function line(text: string, cx: number, y: number, scale: number, ink: string): string {
  const advance = 6
  const widthOf = (letter: string): number => (letter === ' ' ? 4 : advance)
  const width = [...text].reduce((sum, letter) => sum + widthOf(letter), 0) - 1
  const cells = blank(width, 7)
  let x = 0

  for (const letter of text) {
    const rows = FONT[letter]

    if (rows !== undefined) {
      rows.forEach((row, rowIndex) => {
        ;[...row].forEach((mark, column) => {
          if (mark === '#') fill(cells, x + column, rowIndex, 1, 1, '#')
        })
      })
    }

    x += widthOf(letter)
  }

  const left = Math.round(cx - (width * scale) / 2)

  return rectsOf(cells, scale, left + scale, y + scale, { '#': '#7a2a14' }) + rectsOf(cells, scale, left, y, { '#': ink })
}

/** The three lines, each dropping into place a moment after the one above, held, then faded together; and sparkles round them. */
function words(): { body: string; rules: string } {
  const lines: readonly (readonly [string, string])[] = [
    ['PEPE', '#6de0ff'],
    ['USE MORE', '#ffe36e'],
    ['TOKENS', '#ffe36e'],
  ]
  const top = SKY_BURST.y - 28
  let body = ''
  let rules = ''

  lines.forEach(([text, ink], index) => {
    const showAt = WORDS + index * 0.22

    body += `<g class="t${index}">${line(text, SKY_BURST.x, top + index * 20, 2, ink)}</g>`
    rules +=
      `.t${index}{opacity:0;animation:t${index} ${LOOP}s step-end infinite}` +
      `@keyframes t${index}{0%{opacity:0;transform:translate(0px,-6px)}` +
      `${at(showAt)}{opacity:0;transform:translate(0px,-6px);animation-timing-function:ease-out}` +
      `${at(showAt + 0.3)}{opacity:1;transform:translate(0px,0px)}` +
      `${at(FADE)}{opacity:1;transform:translate(0px,0px);animation-timing-function:linear}` +
      `${at(GONE)}{opacity:0;transform:translate(0px,0px)}to{opacity:0;transform:translate(0px,-6px)}}`
  })

  const spots = [
    [-70, -30],
    [66, -24],
    [-78, 8],
    [74, 14],
    [-52, 38],
    [50, 40],
    [0, -40],
  ] as const
  let sparkles = ''

  spots.forEach(([dx, dy], index) => {
    const x = SKY_BURST.x + dx
    const y = SKY_BURST.y + dy

    sparkles += `<g class="k${index}"><rect x="${x}" y="${y - 2}" width="1" height="5"/><rect x="${x - 2}" y="${y}" width="5" height="1"/></g>`
    rules += `.k${index}{animation:glint ${(0.7 + index * 0.13).toFixed(2)}s ease-in-out infinite alternate}`
  })

  body += `<g class="glints" fill="#f4f6fb">${sparkles}</g>`
  rules += '@keyframes glint{from{opacity:1}to{opacity:.1}}' + shownIn('glints', [[WORDS + 0.6, FADE + 0.4]], 0)

  return { body, rules }
}

// ---------------------------------------------------------------------------------------------- the scene

/** Its body sinks and rises a pixel on its legs as it breathes, asleep or awake, without a pause. */
function breathing(): string {
  return '.nod{animation:nod 2.6s ease-in-out infinite alternate}@keyframes nod{from{transform:translate(0px,0px)}to{transform:translate(0px,1px)}}'
}

/** It throws its arms up a unit at the launch and lets them down when the words have gone. */
function cheering(): string {
  return (
    `.arm{animation:arm ${LOOP}s linear infinite}` +
    `@keyframes arm{0%{transform:translate(0px,0px)}${at(LAUNCH)}{transform:translate(0px,0px)}${at(LAUNCH + 0.25)}{transform:translate(0px,-${UNIT}px)}` +
    `${at(GONE)}{transform:translate(0px,-${UNIT}px)}${at(GONE + 0.4)}{transform:translate(0px,0px)}to{transform:translate(0px,0px)}}`
  )
}

/** It hops for joy while the words are up. */
function hopping(): string {
  let frames = `0%{transform:translate(0px,0px)}${at(BURST)}{transform:translate(0px,0px)}`
  let isUp = true

  for (let time = BURST + 0.3; time < FADE; time += 0.3) {
    frames += `${at(time)}{transform:translate(0px,${isUp ? -4 : 0}px)}`
    isUp = !isUp
  }

  return `.hop{animation:hop ${LOOP}s ease-in-out infinite}@keyframes hop{${frames}${at(FADE + 0.3)}{transform:translate(0px,0px)}to{transform:translate(0px,0px)}}`
}

/** The rocket's whole trip: it falls in beside the mascot, stands while its fuse burns, flies up to the burst and is gone. */
function flight(): string {
  const dx = SKY_BURST.x - (ROCKET.x + 3)
  const dy = SKY_BURST.y - ROCKET.y
  const above = -(ROCKET.y + 30)

  return (
    `.rk{opacity:0;animation:rk ${LOOP}s step-end infinite}` +
    `@keyframes rk{0%{opacity:0;transform:translate(0px,${above}px)}` +
    `${at(DROP)}{opacity:1;transform:translate(0px,${above}px);animation-timing-function:ease-in}` +
    `${at(LAND)}{opacity:1;transform:translate(0px,0px)}` +
    `${at(LAUNCH)}{opacity:1;transform:translate(0px,0px);animation-timing-function:ease-in}` +
    `${at(BURST)}{opacity:1;transform:translate(${dx}px,${dy}px)}` +
    `${at(BURST + 0.03)}{opacity:0;transform:translate(${dx}px,${dy}px)}to{opacity:0;transform:translate(0px,${above}px)}}`
  )
}

/** Every length of the drawing multiplied by five, and each rect a hair wider and taller so that neighbours overlap. */
export function enlarged(markup: string): string {
  return markup
    .replace(/ (x|y)="(-?[\d.]+)"/g, (_whole, name: string, value: string) => ` ${name}="${Number(value) * ENLARGE}"`)
    .replace(/ (width|height)="(-?[\d.]+)"/g, (_whole, name: string, value: string) => ` ${name}="${Number(value) * ENLARGE + 0.6}"`)
}

/** Every distance a keyframe moves a part, multiplied by five. */
export function enlargedRules(css: string): string {
  return css.replace(/translate\((-?[\d.]+)px,(-?[\d.]+)px\)/g, (_whole, x: string, y: string) => `translate(${Number(x) * ENLARGE}px,${Number(y) * ENLARGE}px)`)
}

let built: string | undefined

/** The whole scene: built once, the same every time. */
export function sleepySvg(): string {
  if (built !== undefined) return built

  const night = stars()
  const boom = burst()
  const said = words()
  const style =
    night.rules +
    // The near stars shimmer: the one fill-opacity here, as snow-pines has its own. It is on single pixels that do
    // not touch, because a fill that is not solid shows every overlap of two rects as a stripe.
    '.shim{animation:shim 4s ease-in-out infinite alternate}@keyframes shim{from{fill-opacity:.5}to{fill-opacity:1}}' +
    // Asleep until it wakes, and again from its nod to the loop's end: the Zs and its shut eyes. Awake between.
    shownIn('zz', [[0, WAKE], [NOD + 0.6, LOOP]], 1) +
    shownIn('ec', [[0, WAKE], [NOD, LOOP]], 1) +
    shownIn('eo', [[WAKE, NOD]], 0) +
    shownIn('fuse', [[LIGHT, LAUNCH]], 0) +
    shownIn('fire', [[LAUNCH, BURST]], 0) +
    '.flick{animation:flick .24s step-end infinite}@keyframes flick{0%{opacity:1}50%{opacity:.35}to{opacity:1}}' +
    // Each Z rises and fades on a short loop of its own; the three start a beat apart.
    '.z{opacity:.9;animation:z 3.6s linear infinite}.z1{animation-delay:1.2s}.z2{animation-delay:2.4s}' +
    '@keyframes z{0%{opacity:0;transform:translate(0px,6px)}20%{opacity:1;transform:translate(2px,2px)}70%{opacity:1;transform:translate(6px,-6px)}to{opacity:0;transform:translate(9px,-12px)}}' +
    breathing() +
    cheering() +
    hopping() +
    flight() +
    boom.rules +
    said.rules
  const drawing =
    sky() +
    night.drifting +
    night.twinkling +
    moon(46, 34, 11) +
    hill() +
    rocket() +
    hero() +
    snore() +
    boom.body +
    said.body

  built =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${320 * ENLARGE} ${200 * ENLARGE}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">` +
    `<style>${enlargedRules(style)}@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>` +
    enlarged(drawing) +
    '</svg>'

  return built
}
