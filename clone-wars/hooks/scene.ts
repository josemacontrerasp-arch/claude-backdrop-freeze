// A pixel-art space battle for the desktop app's backdrop: one SVG, animated with CSS alone. No script.
// Pure string building: no DOM, no imports, the same output on every call.
//
// THE SCREEN is 320 by 200 art pixels: one unit is one pixel, and every shape is a <rect> on that grid. It is
// WRITTEN OUT FIVE TIMES AS LARGE, as a document of 1600 by 1000: `enlarged` at the foot multiplies every length
// by five, and writes each rect a hair wider and taller than its cells so that neighbours overlap and no seam
// shows between them, since the picture may not ask for hard pixel edges (see below). The screen is the root's
// viewBox, scaled to fill the window and centred, so a window of another shape than 16 by 10 loses a strip at two
// of its edges. The sky and the four corners of the battle are plain groups on that one screen.
//
// MOTION: the ships, fighters and bolts move by transform and fade by fill-opacity, in loops of 20 to 60 seconds.
// They glide: a part is written here as going so many pixels in a stretch, and `track` writes that stretch out as a
// smooth one. Only what must change at once holds and jumps (step-end): which way a fighter faces, which frame of
// an explosion shows, when a bolt appears. The three star layers drift without a pause, the bright stars twinkle,
// the planet's glow swells and sinks.
//
// WHAT A SCENE MUST NOT CONTAIN. Measured on 2026-11-15 in the Windows desktop app (build 5.11492.5.0), by showing
// test pictures behind the chat and reading how hard the app worked: a scene with any of these, anywhere in it,
// shows its first picture and no other, though the same scene runs in a browser:
//   - a length in a unit that depends on the viewport or on a container (vw, vh, vi, vb, vmin, vmax, their sv*,
//     lv* and dv* kin, and cqw to cqmax), in any rule, used or not, or in a media query;
//   - a class selector spelled like such a unit, even an empty `.vb{}` (an id, an element or a keyframes rule of
//     that name does nothing);
//   - shape-rendering set to anything but auto (crispEdges, geometricPrecision, optimizeSpeed), as an attribute or
//     in any rule, used or not;
//   - vector-effect non-scaling-stroke.
// This battle stood still for a day because the volley of its bottom left corner was named `vb`, and before that
// because it asked for crispEdges. Hence the volleys' names (guna to gund), and a test that reads every scene of
// this mod for all of the above. Why the app does this is not known.
//
// EVERY MOVING PART RESTS IN A COMPOSED POSE: its transform and fill-opacity attributes hold one frame of the battle,
// and a running animation overrides them. With motion off, that frame is the picture.
//
// Every id starts "cw-": the app's scrub drops an id that is also the name of a DOM property.

// ---------------------------------------------------------------------------------------------- palette

/** The sprites' colors, one letter each: a map row is a row of these letters, "." for nothing. */
const PAL: Record<string, string> = {
  // the left fleet: white hulls, red markings, blue light
  W: '#f4f6fb',
  w: '#d5dbe8',
  v: '#a9b2c6',
  g: '#7b859e',
  d: '#4a536e',
  k: '#1f2539',
  R: '#d9363e',
  r: '#8e1f2c',
  c: '#9be7ff',
  B: '#3d9bff',
  b: '#1f55c4',
  // the right fleet: tan and rust, amber light
  T: '#e6c892',
  t: '#bd935b',
  n: '#7d5c3d',
  m: '#48332a',
  U: '#b8542f',
  u: '#7a3321',
  A: '#ffb84a',
  e: '#ff5a3c',
  E: '#ffd9c4',
  f: '#a3161f',
  // fire and smoke
  Y: '#ffe36e',
  O: '#ff9a2e',
  F: '#e2511d',
  D: '#7d2414',
  S: '#8a90a3',
  s: '#565c72',
  q: '#33384d',
}

/** Black at the top to indigo at the foot, in flat bands with a dithered row between each pair. */
const SKY = ['#020308', '#03050e', '#050714', '#070a1c', '#0a0d26', '#0c1130', '#0f153a', '#121945']
const NEBULA = ['#080c26', '#0e1138', '#17164c']
const PLANET = { edge: '#3d9bff', lit: '#1f55c4', mid: '#173f94', dim: '#102c6b', dark: '#0b1d49', rim: '#9be7ff' }

// ---------------------------------------------------------------------------------------------- pixels

type Grid = string[][]

function grid(rows: readonly string[]): Grid {
  const width = Math.max(...rows.map(row => row.length))

  return rows.map(row => [...row.padEnd(width, '.')])
}

/** One rect. A width or a height of 1 is left out: the stylesheet gives every rect that default. */
function rect(x: number, y: number, w = 1, h = 1): string {
  return `<rect${x === 0 ? '' : ` x="${x}"`}${y === 0 ? '' : ` y="${y}"`}${w === 1 ? '' : ` width="${w}"`}${h === 1 ? '' : ` height="${h}"`}/>`
}

/**
 * A grid as rects, grouped by color: each row's runs of one color, and a run that repeats exactly on the row
 * below grows downward instead of starting a new rect. `fill` paints every cell one color; `scale` draws each
 * cell that many pixels on a side.
 */
function rectsOf(cells: Grid, fill?: string, scale = 1): string {
  const byColor = new Map<string, string[]>()
  const open = new Map<string, { x: number; y: number; w: number; h: number }>()

  for (let y = 0; y <= cells.length; y += 1) {
    const row = cells[y] ?? []
    const seen = new Set<string>()

    for (let x = 0; x < row.length; ) {
      const color = row[x] ?? '.'

      if (color === '.') {
        x += 1
        continue
      }

      let w = 1

      while (row[x + w] === color) w += 1

      const key = `${color}${x},${w}`
      const run = open.get(key)

      seen.add(key)
      if (run === undefined) open.set(key, { x, y, w, h: 1 })
      else run.h += 1
      x += w
    }

    for (const [key, run] of [...open]) {
      if (seen.has(key)) continue

      const color = key.charAt(0)
      const list = byColor.get(color) ?? []

      list.push(rect(run.x * scale, run.y * scale, run.w * scale, run.h * scale))
      byColor.set(color, list)
      open.delete(key)
    }
  }

  let out = ''

  for (const [color, list] of byColor) out += `<g fill="${fill ?? PAL[color] ?? '#f0f'}">${list.join('')}</g>`

  return out
}

function symbol(id: string, rows: readonly string[] | Grid): string {
  const cells = typeof rows[0] === 'string' ? grid(rows as readonly string[]) : (rows as Grid)

  return `<symbol id="cw-${id}">${rectsOf(cells)}</symbol>`
}

/** A repeatable number in [0, 1) from three whole numbers: every build draws the same sky. */
function hash(x: number, y: number, salt: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 2147483647)) | 0

  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16

  return (h >>> 0) / 4294967296
}

// ---------------------------------------------------------------------------------------------- ships

/** What a hull color turns to on the side away from the light: the lower half of a ship is its upper half, shaded. */
const SHADE: Record<string, string> = { W: 'g', w: 'v', v: 'g', g: 'd', d: 'k', R: 'r', T: 't', t: 'n', n: 'm', U: 'u' }

function mirrored(top: Grid): Grid {
  return [...top, ...top.map(row => row.map(color => SHADE[color] ?? color)).reverse()]
}

function put(cells: Grid, x: number, y: number, color: string): void {
  const row = cells[y]

  if (row !== undefined && x >= 0 && x < row.length) row[x] = color
}

/**
 * A wedge seen from above, bow to the right: `top(x)` is how many rows the hull stands in from the edge at
 * column x, and `detail` repaints a hull pixel. Half is drawn and mirrored.
 */
function wedge(length: number, half: number, top: (x: number) => number, detail: (x: number, row: number) => string | undefined): Grid {
  const rows: Grid = []

  for (let row = 0; row < half; row += 1) {
    const cells: string[] = []

    for (let x = 0; x < length; x += 1) {
      const edge = top(x)

      cells.push(row < edge ? '.' : row === edge ? 'W' : (detail(x, row) ?? 'w'))
    }

    rows.push(cells)
  }

  return rows
}

/** A red chevron across the hull, two pixels thick, its point on the centre line at column `apex`. */
function chevron(x: number, row: number, half: number, apex: number): boolean {
  const lead = apex - (half - 1 - row) - x

  return lead === 0 || lead === 1
}

/** The big white ship: a long dagger with stub shoulders at the stern, two red chevrons, three engines. */
function cruiser(): Grid {
  const top = (x: number): number =>
    x < 3 ? 99 : x < 6 ? 3 : x === 6 ? 2 : x === 7 ? 1 : x <= 16 ? 0 : x === 17 ? 1 : x === 18 ? 2 : x <= 25 ? 3 : x <= 59 ? 4 + Math.floor((x - 26) / 5) : 11
  const turrets = new Set(['22,7', '23,7', '30,8', '31,8', '40,9', '41,9', '52,10', '53,10'])
  const rows = wedge(64, 12, top, (x, row) => {
    if (x <= 5) return x === 5 ? 'g' : 'd'
    if (x >= 9 && x <= 15 && row <= 2) return row === 1 ? 'R' : 'r'
    if (chevron(x, row, 12, 34) || chevron(x, row, 12, 48)) return 'R'
    if (row >= 9 && x >= 9 && x <= 13) return 'g'
    if (row >= 10 && x === 14) return 'c'
    if (turrets.has(`${x},${row}`)) return 'd'
    if (row === 11) return x >= 58 ? 'R' : x >= 16 ? 'v' : undefined

    return undefined
  })

  for (const row of [4, 5, 6, 10, 11]) {
    put(rows, 0, row, 'B')
    put(rows, 1, row, 'c')
    put(rows, 2, row, 'c')
  }

  for (let x = 60; x < 64; x += 1) put(rows, x, 11, 'R')

  return mirrored(rows)
}

/** The small white ship: the same family, half the length. */
function frigate(): Grid {
  const top = (x: number): number =>
    x < 2 ? 99 : x < 4 ? 2 : x === 4 ? 1 : x <= 10 ? 0 : x === 11 ? 1 : x <= 15 ? 2 : 3 + Math.floor((x - 16) / 6)
  const rows = wedge(34, 6, top, (x, row) => {
    if (x <= 3) return 'd'
    if (x >= 6 && x <= 9 && row === 1) return 'R'
    if (chevron(x, row, 6, 24)) return 'R'
    if (row === 5) return x >= 6 && x <= 8 ? 'g' : x === 9 ? 'c' : x >= 12 ? 'v' : undefined

    return undefined
  })

  for (const row of [3, 4, 5]) {
    put(rows, 0, row, 'B')
    put(rows, 1, row, 'c')
  }

  for (let x = 31; x < 34; x += 1) put(rows, x, 5, 'R')

  return mirrored(rows)
}

/**
 * A crescent seen from above, its round side to the left, toward the enemy: what lies inside one circle and
 * outside a second, set to the right of the first. Its armour is plates, tan and rust in turn, like a carapace.
 */
function crescent(radius: number, gap: number, inner: number, plate: number): Grid {
  const rows: Grid = []

  for (let y = 0; y < radius * 2; y += 1) {
    const cells: string[] = []

    for (let x = 0; x < radius + gap; x += 1) {
      const fromOuter = Math.hypot(x + 0.5 - radius, y + 0.5 - radius)
      const fromInner = Math.hypot(x + 0.5 - radius - gap, y + 0.5 - radius)

      if (fromOuter > radius || fromInner <= inner) {
        cells.push('.')
        continue
      }

      // 0 at the middle of the leading edge, 90 at the lower horn, -90 at the upper.
      const angle = (Math.atan2(y + 0.5 - radius, radius - x - 0.5) * 180) / Math.PI
      const along = (angle + 90) / plate
      const isSeam = along - Math.floor(along) < 0.14
      const body = fromOuter > radius - 1.3 ? 'T' : fromInner < inner + 1.2 ? 'm' : isSeam ? 'n' : Math.floor(along) % 3 === 1 ? 'U' : 't'

      cells.push(y < radius ? body : (SHADE[body] ?? body))
    }

    rows.push(cells)
  }

  return rows
}

/** The big rust ship: a crescent with an engine block in its hollow and amber lights along its edge. */
function crescentCruiser(): Grid {
  const radius = 28
  const rows = crescent(radius, 11, 25.5, 15)

  for (let y = radius - 4; y < radius + 4; y += 1) {
    for (let x = 13; x <= 23; x += 1) put(rows, x, y, y === radius - 4 ? 'T' : y < radius ? 't' : y === radius + 3 ? 'm' : 'n')
    if (y >= radius - 2 && y < radius + 2) {
      put(rows, 24, y, 'm')
      put(rows, 25, y, 'm')
      put(rows, 26, y, 'A')
      put(rows, 27, y, 'O')
    }
  }

  for (const angle of [-72, -50, -25, 25, 50, 72]) {
    const turn = (angle * Math.PI) / 180

    put(rows, Math.round(radius - 24 * Math.cos(turn)), Math.round(radius + 24 * Math.sin(turn)), 'A')
  }

  put(rows, 1, radius - 1, 'e')
  put(rows, 2, radius - 1, 'e')
  put(rows, 1, radius, 'e')
  put(rows, 2, radius, 'e')

  return trimmed(rows)
}

/** The small rust ship: a sickle, the same family. */
function sickle(): Grid {
  const radius = 13
  const rows = crescent(radius, 5, 11.5, 30)

  for (const y of [radius - 1, radius]) {
    for (let x = 7; x <= 9; x += 1) put(rows, x, y, y < radius ? 't' : 'n')
    put(rows, 10, y, 'A')
  }

  put(rows, 1, radius - 1, 'e')
  put(rows, 1, radius, 'e')

  return trimmed(rows)
}

/** Drops the empty columns on the right. */
function trimmed(cells: Grid): Grid {
  let width = 0

  for (const row of cells) width = Math.max(width, row.lastIndexOf(row.findLast(color => color !== '.') ?? '.') + 1)

  return cells.map(row => row.slice(0, width))
}

// Fighters live in a 9 by 9 cell and turn about its middle pixel. Two drawings each: heading east, and heading
// north-east. The other six headings are those two, turned by quarter turns, which keeps every pixel on the grid.
const FIGHTERS: Record<string, readonly string[]> = {
  // A white dart with swept wings, red wing tips and a red band.
  wE: ['.........', '..R......', '..WW.....', '.gWWWW...', 'cgWRRdWWW', '.gvvvv...', '..vv.....', '..r......', '.........'],
  wD: ['.........', '......WW.', '.....WWv.', 'RWWWWdv..', '..WWRv...', '..WRvv...', '..gWvv...', '.c...v...', '.....r...'],
  // A droid like a beetle: pincers ahead, a rust abdomen, two blades swept back.
  dE: ['.........', 't........', '.tt......', '..UTT..T.', '.mUTTeT..', '..utt..t.', '.nn......', 'n........', '.........'],
  dD: ['.........', '......T..', '......Tt.', '....Te...', 'tttUTt...', '...Uu....', '..m.n....', '....n....', '....n....'],
}

const BOLTS: Record<string, readonly string[]> = {
  lb: ['BccB'],
  lr: ['eEEe'],
  hb: ['.bBBBBBb.', 'bBcccccBb', '.bBBBBBb.'],
  hr: ['.feeeeef.', 'feEEEEEef', '.feeeeef.'],
  // Where a heavy bolt lands on a hull.
  sb: ['..W..', '.WcW.', 'WcWcW', '.WcW.', '..W..'],
  sr: ['..Y..', '.YWY.', 'YWWWY', '.YWY.', '..Y..'],
}

/** A fighter's end, frame by frame: a white flash, a fireball that breaks up, then smoke that thins to nothing. */
const BOOM: readonly (readonly string[])[] = [
  ['', '', '', '......W', '.....WWW', '....WWWWW', '...WWWWWWW', '....WWWWW', '.....WWW', '......W'],
  ['', '', '....OOOOO', '...OYYYYYO', '..OYYWWWYYO', '..OYWWWWWYO', '..OYWWWWWYO', '..OYWWWWWYO', '..OYYWWWYYO', '...OYYYYYO', '....OOOOO'],
  [
    '....FFFF',
    '..FFOOOOFF',
    '.FOOOYYOOOF',
    '.FOYYYYYYOF.F',
    'FOOYYWWYYOOF',
    'FOYYWWWWYYOF',
    'FOYYWWWWYYOF',
    'FOOYYWWYYOOF',
    '.FOYYYYYOOF',
    '.FOOOYYOOFF',
    '..FFOOOOFF',
    'F...FFFF',
  ],
  [
    '...sFFs...F',
    '..FFOOFs.FOF',
    '.sFOYOOFs.F',
    'sFOOYYOFDs',
    'FFOYYYOOFs.s',
    'sFOOYOOFDssSs',
    '.sFFOOFDs.sS',
    '..sDFFDss',
    '.FF.sDss..F',
    'FOOF.ss..FOF',
    '.FF.......F',
  ],
  [
    '....sSSs',
    '...sSSSSs',
    '...SSSSSSs.s',
    '...sSSSSs.sSs',
    '.ss.sSSs.sSSS',
    'sSSs.....sSSs',
    'SSSSs..ss.ss',
    'sSSSs.sSSs',
    '.sSs.sSSSSs',
    '.....sSSSSs',
    '......sSSs',
  ],
  ['.....sSs', '....sSsSs', '....SsqsS..s', '....sSsSs.sqs', '.s...sSs..sSs', 'sqs........s', 'sSs....s', '.s....sSs', '.....sSqSs', '......sSs', '.......s'],
  ['......s', '.....sqs', '......s', '...........q', '..........qsq', '.q.........q', 'qsq', '.q.....q', '......qsq', '.......q'],
]

/** What is left of a fighter: three bits of its own colors. */
const BITS: Record<string, readonly (readonly string[])[]> = {
  w: [['Wv'], ['g', 'd'], ['R']],
  d: [['Tn'], ['U', 'm'], ['t']],
}

/** A fighter's eight headings side by side, 12 apart, east first and then clockwise: a hook shows one at a time. */
function headings(id: string): string {
  let uses = ''

  for (let heading = 0; heading < 8; heading += 1) {
    const isStraight = heading % 2 === 0
    const turn = isStraight ? heading * 45 : ((heading + 1) * 45) % 360
    const x = heading * 12

    uses += `<use href="#cw-${id}${isStraight ? 'E' : 'D'}" x="${x}"${turn === 0 ? '' : ` transform="rotate(${turn} ${x + 4.5} 4.5)"`}/>`
  }

  return `<symbol id="cw-${id}">${uses}</symbol>`
}

/** The explosion's frames side by side, 16 apart. */
function boomStrip(): string {
  return `<symbol id="cw-boom">${BOOM.map((frame, index) => `<g transform="translate(${index * 16})">${rectsOf(grid(frame))}</g>`).join('')}</symbol>`
}

// ---------------------------------------------------------------------------------------------- the sky

/** A two-pixel checker of one color: the dither between two flat tones. */
function checker(id: string, color: string): string {
  return `<pattern id="cw-${id}" width="2" height="2" patternUnits="userSpaceOnUse"><rect fill="${color}"/><rect x="1" y="1" fill="${color}"/></pattern>`
}

function sky(): { defs: string; body: string } {
  const band = 200 / SKY.length
  let defs = ''
  let body = ''

  SKY.forEach((color, index) => {
    const y = Math.round(index * band)

    body += `<rect y="${y}" width="320" height="${Math.round(band) + 1}" fill="${color}"/>`
    if (index > 0) {
      defs += checker(`sky${index}`, color)
      body += `<rect y="${y - 2}" width="320" height="2" fill="url(#cw-sky${index})"/>`
    }
  })

  return { defs, body }
}

function smooth(low: number, high: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)))

  return t * t * (3 - 2 * t)
}

function noise(x: number, y: number, scale: number, salt: number): number {
  const gx = Math.floor(x / scale)
  const gy = Math.floor(y / scale)
  const fx = smooth(0, 1, x / scale - gx)
  const fy = smooth(0, 1, y / scale - gy)
  const upper = hash(gx, gy, salt) * (1 - fx) + hash(gx + 1, gy, salt) * fx
  const lower = hash(gx, gy + 1, salt) * (1 - fx) + hash(gx + 1, gy + 1, salt) * fx

  return upper * (1 - fy) + lower * fy
}

/** How much the picture's middle is spared: 1 at the edges, 0 where the words sit. */
function atEdge(x: number, y: number): number {
  return 1 - smooth(60, 96, x) * (1 - smooth(226, 262, x)) * smooth(10, 26, y) * (1 - smooth(170, 186, y))
}

/**
 * A faint cloud, blue to violet, in the upper right, thinning toward the middle. Three flat tones on blocks of
 * four pixels, each tone ringed by a dither of itself.
 */
function nebula(): { defs: string; body: string } {
  const block = 4
  const levels = [0.34, 0.52, 0.7]
  let defs = ''
  let body = ''

  NEBULA.forEach((color, level) => {
    const solid: Grid = []
    const soft: Grid = []

    for (let y = 0; y < 200 / block; y += 1) {
      const solidRow: string[] = []
      const softRow: string[] = []

      for (let x = 0; x < 320 / block; x += 1) {
        const px = (x + 0.5) * block
        const py = (y + 0.5) * block
        const main = 1 - ((px - 252) / 92) ** 2 - ((py - 44) / 50) ** 2
        const wisp = 0.7 * (1 - ((px - 176) / 70) ** 2 - ((py - 16) / 20) ** 2)
        const cloud = Math.max(0, main, wisp) * (0.5 + 0.55 * noise(px, py, 34, 3) + 0.4 * noise(px, py, 13, 4)) * (0.4 + 0.6 * atEdge(px, py))
        const threshold = levels[level] ?? 1

        solidRow.push(cloud > threshold ? '#' : '.')
        softRow.push(cloud > threshold - 0.08 ? '#' : '.')
      }

      solid.push(solidRow)
      soft.push(softRow)
    }

    defs += checker(`neb${level}`, color)
    body += rectsOf(soft, `url(#cw-neb${level})`, block) + rectsOf(solid, color, block)
  })

  return { defs, body }
}

/**
 * One layer of stars as single pixels, fewer in the rows across the middle. A layer drifts sideways for ever, so it
 * is one screen of stars drawn twice, side by side: `shift` is 0 for the first and 320 for the second.
 */
function stars(count: number, salt: number, color: string, shift: number): string {
  let out = ''

  for (let index = 0; index < count; index += 1) {
    const x = Math.floor(hash(index, 1, salt) * 320)
    const y = Math.floor(hash(index, 2, salt) * 216) - 8

    // Thinned by its row alone: a layer that slides sideways has no middle column to spare.
    if (hash(index, 3, salt) > 0.3 + 0.7 * atEdge(160, y)) continue

    out += rect(x + shift, y)
  }

  return `<g fill="${color}">${out}</g>`
}

/** The bright stars of the near layer, at a shift: a few crosses that stay lit, and a few whose arms swell and fade. */
function brightStars(shift: number): string {
  const steady = [
    [22, 9],
    [301, 71],
    [12, 112],
    [205, 6],
    [286, 186],
    [96, 192],
  ]
  const twinkling = [
    [58, 4, 23],
    [141, 11, 29],
    [248, 3, 31],
    [312, 34, 37],
    [8, 100, 41],
    [226, 190, 43],
    [72, 180, 47],
    [176, 188, 53],
    [4, 44, 59],
  ]
  let out = ''

  for (const [x = 0, y = 0] of steady) out += `<use href="#cw-star" x="${x + shift}" y="${y}"/>`
  for (const [x = 0, y = 0, seconds = 29] of twinkling) {
    const isLit = seconds === 31 || seconds === 47

    out += `${rect(x + shift + 1, y + 1)}<use href="#cw-arms" x="${x + shift}" y="${y}" class="tw" style="animation-duration:${(seconds / 10).toFixed(1)}s;animation-delay:-${(seconds * 0.037).toFixed(2)}s" fill-opacity="${isLit ? 1 : 0.3}"/>`
  }

  return `<g fill="${PAL.W}">${out}</g>`
}

/**
 * A big planet in the bottom right corner, lit from the upper left. Its disc is one clip of pixel rows; every band
 * of its shading is that same disc, moved down and to the right, so the bands are crescents. A glow stands off its
 * lit edge.
 */
function planet(cx: number, cy: number, radius: number): { defs: string; body: string } {
  let rows = ''

  for (let y = Math.max(0, cy - radius); y < 200; y += 1) {
    const half = Math.round(Math.sqrt(radius * radius - (y + 0.5 - cy) ** 2))

    if (half > 0) rows += rect(cx - half, y, half * 2)
  }

  const box = `<rect x="${cx - radius - 12}" y="${cy - radius - 12}" width="${radius * 2 + 24}" height="${radius * 2 + 24}"`
  const disc = (fill: string, dx: number, dy: number): string =>
    `<g clip-path="url(#cw-disc)"${dx === 0 && dy === 0 ? '' : ` transform="translate(${dx},${dy})"`}>${box} fill="${fill}"/></g>`
  const stripe = (y: number, height: number): string => `<rect x="${cx - radius}" y="${y}" width="${radius * 2}" height="${height}" fill="url(#cw-pl-dim)"/>`
  const defs =
    `<clipPath id="cw-disc">${rows}</clipPath>` +
    checker('pl-glow', PLANET.lit) +
    checker('pl-lit', PLANET.lit) +
    checker('pl-mid', PLANET.mid) +
    checker('pl-dim', PLANET.dim) +
    checker('pl-dark', PLANET.dark)
  const body =
    `<g class="glow">${disc('url(#cw-pl-glow)', -5, -5)}${disc(PLANET.lit, -3, -3)}</g>` +
    disc(PLANET.rim, -1, -1) +
    `<g clip-path="url(#cw-disc)">${box} fill="${PLANET.edge}"/>` +
    disc('url(#cw-pl-lit)', 2, 2) +
    disc(PLANET.lit, 4, 4) +
    disc('url(#cw-pl-mid)', 10, 11) +
    disc(PLANET.mid, 14, 16) +
    stripe(cy - radius + 14, 2) +
    stripe(cy - radius + 25, 3) +
    disc('url(#cw-pl-dim)', 24, 28) +
    disc(PLANET.dim, 29, 34) +
    stripe(cy - radius + 39, 2) +
    disc('url(#cw-pl-dark)', 42, 49) +
    disc(PLANET.dark, 48, 56) +
    '</g>'

  return { defs, body }
}

// ---------------------------------------------------------------------------------------------- motion

type Key = { t: number; x?: number; y?: number; o?: number; f?: string }
type Pose = { x: number; y: number; o: number }
type Track = { name: string; seconds: number; at: (time: number) => Pose; moves: boolean; fades: boolean }

/** Every rule the scene's parts ask for, collected while they are built. */
let sheet: string[] = []

function percent(part: number): string {
  return `${Number((part * 100).toFixed(2))}%`
}

/**
 * One looping animation from keys in seconds: a key's x, y and opacity carry on until a later key changes them, and
 * its `f` is how the stretch after it runs (`steps(n)`, or `step-end` to hold and then jump). It writes the
 * keyframes and a class of the same name, and answers where the part stands at any moment, for its resting pose.
 * The name is a class: it must not be spelled like a viewport or container unit (see the top of this file).
 */
function track(name: string, seconds: number, keys: readonly Key[]): Track {
  let x = 0
  let y = 0
  let o = 1
  const full = keys.map(key => {
    x = key.x ?? x
    y = key.y ?? y
    o = key.o ?? o

    return { t: key.t, x, y, o, f: key.f ?? '' }
  })
  const first = full[0] ?? { t: 0, x: 0, y: 0, o: 1, f: '' }
  const moves = full.some(key => key.x !== first.x || key.y !== first.y)
  const fades = full.some(key => key.o !== 1)
  // A stretch written as steps(n) runs smoothly (see MOTION at the top); its n still places the resting pose on a pixel.
  const eased = (f: string): string => (f === '' || f.startsWith('steps(') ? 'linear' : f)
  // The easing most stretches use goes on the class, and a key names its own only where it differs. The last key starts no stretch.
  const used = full.slice(0, -1).map(key => eased(key.f))
  const usual = [...new Set(used)].sort((one, other) => used.filter(f => f === other).length - used.filter(f => f === one).length)[0] ?? 'linear'
  const frames = full
    .map((key, index) => {
      const own = eased(key.f)
      const parts = [
        moves ? `transform:translate(${key.x === 0 ? 0 : `${key.x}px`}${key.y === 0 ? '' : `,${key.y}px`})` : '',
        fades ? `fill-opacity:${key.o}` : '',
        index === full.length - 1 || own === usual ? '' : `animation-timing-function:${own}`,
      ]

      return `${percent(key.t / seconds)}{${parts.filter(part => part !== '').join(';')}}`
    })
    .join('')

  sheet.push(`@keyframes ${name}{${frames}}.${name}{animation:${name} ${seconds}s ${usual} infinite}`)

  const at = (time: number): Pose => {
    const t = ((time % seconds) + seconds) % seconds
    let index = 0

    while (index < full.length - 2 && (full[index + 1]?.t ?? Infinity) <= t) index += 1

    const from = full[index] ?? first
    const to = full[index + 1] ?? from
    const steps = /^steps\((\d+)\)$/.exec(from.f)
    let part = to.t > from.t ? (t - from.t) / (to.t - from.t) : 0

    if (from.f === 'step-end') part = 0
    else if (steps !== null) part = Math.floor(part * Number(steps[1])) / Number(steps[1])

    return {
      x: Math.round(from.x + (to.x - from.x) * part),
      y: Math.round(from.y + (to.y - from.y) * part),
      o: Number((from.o + (to.o - from.o) * part).toFixed(2)),
    }
  }

  return { name, seconds, at, moves, fades }
}

/** A part's class, its place in its loop, and the pose it rests in: the loop's own state at `time`. */
function moving(part: Track, time: number): string {
  const local = ((time % part.seconds) + part.seconds) % part.seconds
  const pose = part.at(local)

  return (
    ` class="${part.name}" style="animation-delay:-${local.toFixed(2)}s"` +
    (part.moves ? ` transform="translate(${pose.x},${pose.y})"` : '') +
    (part.fades ? ` fill-opacity="${pose.o}"` : '')
  )
}

// East, then clockwise: the direction of each heading, in pixels.
const DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
]

type Leg = readonly [heading: number, pixels: number]
type Route = { path: Track; turn: Track; seconds: number; where: (time: number) => { x: number; y: number; heading: number } }

/**
 * A closed circuit a fighter flies at one speed: legs of whole pixels along the eight headings. One track moves the
 * fighter a pixel at a time; a second shows the drawing for the heading of the leg it is on.
 */
function route(name: string, seconds: number, start: readonly [number, number], legs: readonly Leg[]): Route {
  const lengthOf = ([heading, pixels]: Leg): number => pixels * (heading % 2 === 0 ? 1 : Math.SQRT2)
  const total = legs.reduce((sum, leg) => sum + lengthOf(leg), 0)
  const spots: { t: number; span: number; x: number; y: number; heading: number; pixels: number }[] = []
  const pathKeys: Key[] = []
  const turnKeys: Key[] = []
  let t = 0
  let [x, y] = start

  for (const leg of legs) {
    const [heading, pixels] = leg
    const span = (seconds * lengthOf(leg)) / total
    const [dx, dy] = DIRECTIONS[heading] ?? [0, 0]

    spots.push({ t, span, x, y, heading, pixels })
    pathKeys.push({ t, x, y, f: `steps(${pixels})` })
    turnKeys.push({ t, x: -12 * heading, f: 'step-end' })
    x += dx * pixels
    y += dy * pixels
    t += span
  }

  pathKeys.push({ t: seconds, x: start[0], y: start[1] })
  turnKeys.push({ t: seconds, x: -12 * (legs[0]?.[0] ?? 0) })

  const where = (time: number): { x: number; y: number; heading: number } => {
    const local = ((time % seconds) + seconds) % seconds
    let spot = spots[0] ?? { t: 0, span: 1, x: start[0], y: start[1], heading: 0, pixels: 1 }

    for (const candidate of spots) if (candidate.t <= local) spot = candidate

    const done = Math.min(spot.pixels - 1, Math.floor(((local - spot.t) / spot.span) * spot.pixels))
    const [dx, dy] = DIRECTIONS[spot.heading] ?? [0, 0]

    return { x: spot.x + dx * done, y: spot.y + dy * done, heading: spot.heading }
  }

  return { path: track(name, seconds, pathKeys), turn: track(`${name}h`, seconds, turnKeys), seconds, where }
}

/** A fighter on a route, `time` seconds into it: `w` a white fighter, `d` a droid. `hide` is a track that takes it out of sight. */
function fighter(on: Route, kind: 'w' | 'd', time: number, hide?: Track): string {
  const drawn = `<g${moving(on.path, time)}><g clip-path="url(#cw-cell)"><use href="#cw-${kind}"${moving(on.turn, time)}/></g></g>`

  return hide === undefined ? drawn : `<g${moving(hide, time)}>${drawn}</g>`
}

/**
 * A light bolt from a fighter on a straight leg, east or west. `fireAt` is in the route's own seconds, `lag` how far
 * behind the route's leader the shooter flies, `side` a pixel or two off its nose so a miss passes beside its
 * target. It flies `reach` pixels in `flight` seconds and is gone.
 */
function shot(name: string, on: Route, lag: number, fireAt: number, reach: number, flight: number, side: number, kind: 'lb' | 'lr', time: number): string {
  const from = on.where(fireAt - lag)
  const way = from.heading === 4 ? -1 : 1
  const bolt = track(name, on.seconds, [
    { t: 0, x: 0, y: 0, o: 0, f: 'step-end' },
    { t: fireAt, o: 1, f: `steps(${Math.max(1, Math.round(reach / 2))})` },
    { t: fireAt + flight, x: way * reach, f: 'step-end' },
    { t: fireAt + flight + 0.03, o: 0, f: 'step-end' },
    { t: on.seconds, x: 0, o: 0 },
  ])

  return `<use href="#cw-${kind}" x="${from.x + (way > 0 ? 9 : -4)}" y="${from.y + 4 + side}"${moving(bolt, time)}/>`
}

/** A fighter's end at a spot: the explosion's frames in turn, then three bits that drift on and fade. */
function wreck(name: string, seconds: number, x: number, y: number, hitAt: number, kind: 'w' | 'd', drift: readonly (readonly [number, number])[], time: number): string {
  const frameAt = [0, 0.08, 0.22, 0.48, 0.78, 1.38, 2.18, 3.18]
  const burst = track(`${name}x`, seconds, [
    { t: 0, x: -112, f: 'step-end' },
    ...frameAt.map((after, frame) => ({ t: hitAt + after, x: -16 * frame, f: 'step-end' })),
    { t: seconds, x: -112 },
  ])
  let out = `<g transform="translate(${x - 2},${y - 2})" clip-path="url(#cw-frame)"><use href="#cw-boom"${moving(burst, time)}/></g>`

  drift.forEach(([dx, dy], index) => {
    const far = Math.max(Math.abs(dx), Math.abs(dy))
    const bit = track(`${name}b${index}`, seconds, [
      { t: 0, x: 0, y: 0, o: 0, f: 'step-end' },
      { t: hitAt + 0.3, o: 1, f: `steps(${Math.max(1, Math.round(far * 0.6))})` },
      { t: hitAt + 7, x: Math.round(dx * 0.6), y: Math.round(dy * 0.6), o: 1, f: `steps(${Math.max(1, Math.round(far * 0.4))})` },
      { t: hitAt + 11.5, x: dx, y: dy, o: 0, f: 'step-end' },
      { t: seconds, x: 0, y: 0, o: 0 },
    ])

    out += `<use href="#cw-bit${kind}${index}" x="${x + 4}" y="${y + 4}"${moving(bit, time)}/>`
  })

  return out
}

/**
 * A capital ship's volley: heavy bolts leave the muzzles one after another, fly toward the enemy and fade out
 * before they reach the middle of the window. `way` is 1 to fly right, -1 to fly left.
 */
function volley(name: string, seconds: number, muzzles: readonly (readonly [number, number])[], way: number, kind: 'hb' | 'hr', time: number): string {
  const fireAt = 3
  const bolt = track(name, seconds, [
    { t: 0, x: 0, y: 0, o: 0, f: 'step-end' },
    { t: fireAt, o: 1, f: 'steps(15)' },
    { t: fireAt + 1, x: way * 30, f: 'steps(11)' },
    { t: fireAt + 1.75, x: way * 52, o: 0, f: 'step-end' },
    { t: seconds, x: 0, o: 0 },
  ])

  return muzzles.map(([x, y], index) => `<use href="#cw-${kind}" x="${x}" y="${y}"${moving(bolt, time - index * 0.55)}/>`).join('')
}

/**
 * The enemy's answer: heavy bolts come out of the dark from the middle's side, land on a hull and leave a spark.
 * `way` is the way they fly, and each target is where a bolt's nose lands.
 */
function incoming(name: string, seconds: number, targets: readonly (readonly [number, number])[], way: number, kind: 'hb' | 'hr', time: number): string {
  const startAt = 2
  const landAt = startAt + 1.8
  const bolt = track(name, seconds, [
    { t: 0, x: -way * 54, y: 0, o: 0, f: 'step-end' },
    { t: startAt, o: 0, f: 'steps(10)' },
    { t: startAt + 0.67, x: -way * 34, o: 1, f: 'steps(17)' },
    { t: landAt, x: 0, f: 'step-end' },
    { t: landAt + 0.03, o: 0, f: 'step-end' },
    { t: seconds, x: -way * 54, o: 0 },
  ])
  const spark = track(`${name}s`, seconds, [
    { t: 0, o: 0, f: 'step-end' },
    { t: landAt, o: 1, f: 'step-end' },
    { t: landAt + 0.14, o: 0, f: 'step-end' },
    { t: seconds, o: 0 },
  ])

  return targets
    .map(([x, y], index) => {
      const local = time - index * 0.7

      return (
        `<use href="#cw-${kind}" x="${way > 0 ? x - 9 : x}" y="${y - 1}"${moving(bolt, local)}/>` +
        `<use href="#cw-${kind === 'hb' ? 'sb' : 'sr'}" x="${x - 2}" y="${y - 2}"${moving(spark, local)}/>`
      )
    })
    .join('')
}

/** A capital ship that rides a pixel up and down on its own slow clock. */
function ship(id: string, x: number, y: number, seconds: number): string {
  return `<use href="#cw-${id}" x="${x}" y="${y}" class="bob" style="animation-duration:${seconds}s;animation-delay:-${(seconds * 0.4).toFixed(1)}s"/>`
}

/** One part of the 320 by 200 screen, as a plain group. */
function screen(content: string): string {
  return `<g>${content}</g>`
}

// ---------------------------------------------------------------------------------------------- the battle

// A racetrack: two long straights joined by tight turns, started at its outer end.
const TRACK = (run: number, way: 1 | -1): readonly Leg[] =>
  way === 1
    ? [
        [0, run],
        [1, 4],
        [2, 4],
        [3, 4],
        [4, run],
        [5, 4],
        [6, 4],
        [7, 4],
      ]
    : [
        [4, run],
        [3, 4],
        [2, 4],
        [1, 4],
        [0, run],
        [7, 4],
        [6, 4],
        [5, 4],
      ]

/** Top left: the white fleet's van. A cruiser trades volleys; behind it a droid is chased round a circuit. */
function topLeft(): string {
  const chase = route('a', 28, [38, 72], TRACK(40, 1))
  const at = 9.4

  return (
    ship('frigate', 4, 54, 34) +
    ship('cruiser', 16, 16, 24) +
    volley('guna', 31, [[81, 23], [81, 30], [76, 20]], 1, 'hb', 3.8) +
    incoming('ia', 43, [[70, 21], [54, 35]], -1, 'hr', 2.9) +
    fighter(chase, 'd', at) +
    fighter(chase, 'w', at - 5) +
    shot('sa', chase, 5, 9.2, 30, 0.5, -3, 'lb', at) +
    shot('sb', chase, 5, 23.5, 30, 0.5, 3, 'lb', at)
  )
}

/** Bottom left: the white fleet's rear. A droid comes in over the edge with a fighter on its tail, and is shot down. */
function bottomLeft(): string {
  const seconds = 47
  const run = route('b', seconds, [-14, 126], TRACK(92, 1))
  const lag = 6
  const hitAt = 15.4
  const victim = run.where(hitAt)
  const hide = track('bv', seconds, [
    { t: 0, o: 1, f: 'step-end' },
    { t: hitAt, o: 0, f: 'step-end' },
    { t: seconds, o: 0 },
  ])
  const shooter = run.where(hitAt - 0.3 - lag)
  const at = hitAt + 0.3

  return (
    ship('frigate', 42, 148, 29) +
    ship('cruiser', 10, 166, 38) +
    volley('gunb', 39, [[75, 173], [75, 180]], 1, 'hb', 1.2) +
    fighter(run, 'd', at, hide) +
    fighter(run, 'w', at - lag) +
    shot('sc', run, lag, hitAt - 2.4, 34, 0.55, -3, 'lb', at) +
    shot('sd', run, lag, hitAt - 1.3, 34, 0.55, 3, 'lb', at) +
    shot('se', run, lag, hitAt - 0.3, victim.x + 3 - shooter.x - 9, 0.3, 0, 'lb', at) +
    wreck('bw', seconds, victim.x, victim.y, hitAt, 'd', [[12, -4], [7, 6], [3, -9]], at)
  )
}

/** Top right: the rust fleet's van. A crescent cruiser trades volleys behind a swarm; a white fighter is run down. */
function topRight(): string {
  const swarm = route('c', 22, [236, 3], [
    [0, 10],
    [1, 6],
    [2, 10],
    [3, 6],
    [4, 10],
    [5, 6],
    [6, 10],
    [7, 6],
  ])
  const seconds = 53
  const run = route('d', seconds, [325, 70], TRACK(84, -1))
  const lag = 6.5
  const hitAt = 15
  const victim = run.where(hitAt)
  const hide = track('dv', seconds, [
    { t: 0, o: 1, f: 'step-end' },
    { t: hitAt, o: 0, f: 'step-end' },
    { t: seconds, o: 0 },
  ])
  const shooter = run.where(hitAt - 0.3 - lag)
  const at = hitAt - 0.9

  return (
    ship('crescent', 270, 8, 32) +
    volley('gunc', 37, [[261, 44], [263, 50], [267, 56]], -1, 'hr', 4.4) +
    incoming('ic', 49, [[272, 22], [274, 46]], 1, 'hb', 30) +
    fighter(swarm, 'd', 2) +
    fighter(swarm, 'd', 9.3) +
    fighter(swarm, 'd', 16.7) +
    fighter(run, 'w', at, hide) +
    fighter(run, 'd', at - lag) +
    shot('sf', run, lag, hitAt - 2.6, 34, 0.55, 3, 'lr', at) +
    shot('sg', run, lag, hitAt - 1.2, 34, 0.55, -3, 'lr', at) +
    shot('sh', run, lag, hitAt - 0.3, shooter.x - 4 - victim.x - 5, 0.3, 0, 'lr', at) +
    wreck('dw', seconds, victim.x, victim.y, hitAt, 'w', [[-11, -3], [-6, 7], [-2, -8]], at)
  )
}

/** Bottom right: the planet, the rust fleet's rear before it, and two droids after a white fighter. */
function bottomRight(body: string): string {
  const chase = route('e', 26, [226, 128], TRACK(30, 1))
  const at = 17.5

  return (
    body +
    ship('sickle', 232, 160, 36) +
    ship('crescent', 288, 90, 41) +
    ship('sickle', 252, 96, 27) +
    volley('gund', 45, [[277, 108], [278, 124]], -1, 'hr', 30) +
    fighter(chase, 'w', at) +
    fighter(chase, 'd', at - 4) +
    fighter(chase, 'd', at - 7.5) +
    shot('si', chase, 4, 17.3, 24, 0.4, -3, 'lr', at) +
    shot('sj', chase, 7.5, 9, 24, 0.4, 3, 'lr', at)
  )
}

// The art is drawn on the 320 by 200 grid and written out this many times as large.
const ENLARGE = 5
// How much wider and taller than its cells a rect is written, so that neighbours overlap and no seam shows.
const OVERLAP = 0.6

/** Every length in the drawing's markup multiplied by ENLARGE, and each rect OVERLAP wider and taller. */
function enlarged(markup: string): string {
  const times = (value: string): number => Number(value) * ENLARGE

  return (
    markup
      .replace(/ (x|y)="(-?[\d.]+)"/g, (_whole, name: string, value: string) => ` ${name}="${times(value)}"`)
      .replace(/ (width|height)="(-?[\d.]+)"/g, (_whole, name: string, value: string) => ` ${name}="${times(value) + OVERLAP}"`)
      .replace(/translate\((-?[\d.]+)(?:,(-?[\d.]+))?\)/g, (_whole, x: string, y?: string) => `translate(${times(x)}${y === undefined ? '' : `,${times(y)}`})`)
      .replace(/rotate\((-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\)/g, (_whole, turn: string, x: string, y: string) => `rotate(${turn} ${times(x)} ${times(y)})`)
      // A dither's tile keeps its exact size: it repeats.
      .replace(/(<pattern [^>]*?) width="[\d.]+" height="[\d.]+"/g, `$1 width="${2 * ENLARGE}" height="${2 * ENLARGE}"`)
  )
}

/** Every length in the stylesheet multiplied by ENLARGE: what the keyframes move a part by, and a rect's size where its attributes leave it out. */
function enlargedRules(css: string): string {
  return css
    .replace(/(-?[\d.]+)px/g, (_whole, value: string) => `${Number(value) * ENLARGE}px`)
    .replace(`rect:not([width]){width:${ENLARGE}px}rect:not([height]){height:${ENLARGE}px}`, `rect:not([width]){width:${ENLARGE + OVERLAP}px}rect:not([height]){height:${ENLARGE + OVERLAP}px}`)
}

let built: string | undefined

/** The whole scene: built once, the same every time. */
export function battleSvg(): string {
  if (built !== undefined) return built

  sheet = []

  const ground = sky()
  const cloud = nebula()
  const world = planet(300, 218, 74)
  const symbols =
    symbol('cruiser', cruiser()) +
    symbol('frigate', frigate()) +
    symbol('crescent', crescentCruiser()) +
    symbol('sickle', sickle()) +
    Object.entries(FIGHTERS)
      .map(([id, rows]) => symbol(id, rows))
      .join('') +
    headings('w') +
    headings('d') +
    Object.entries(BOLTS)
      .map(([id, rows]) => symbol(id, rows))
      .join('') +
    boomStrip() +
    Object.entries(BITS)
      .map(([kind, bits]) => bits.map((rows, index) => symbol(`bit${kind}${index}`, rows)).join(''))
      .join('') +
    symbol('star', ['.g.', 'gWg', '.g.']) +
    symbol('arms', ['.W.', 'W.W', '.W.'])
  const clips = '<clipPath id="cw-cell"><rect width="9" height="9"/></clipPath><clipPath id="cw-frame"><rect width="13" height="13"/></clipPath>'
  // Three layers of stars slide the same way at three speeds, smoothly and for ever: that is the parallax. Each
  // layer is one screen of stars drawn twice, side by side.
  const drifting = (layer: number, screenOf: (shift: number) => string): string => `<g class="dr${layer}">${screenOf(0)}${screenOf(320)}</g>`
  const starLayers =
    drifting(1, shift => stars(150, 11, PAL.d ?? '', shift)) +
    drifting(2, shift => stars(80, 12, PAL.g ?? '', shift)) +
    drifting(3, shift => stars(34, 13, PAL.W ?? '', shift) + stars(8, 14, PAL.T ?? '', shift) + brightStars(shift))
  const backdrop = ground.body + cloud.body + starLayers
  const corners = [screen(topLeft()), screen(bottomLeft()), screen(topRight()), screen(bottomRight(world.body))]
  const drift =
    '.dr1{animation:dr 59s linear infinite}.dr2{animation:dr 43s linear infinite}.dr3{animation:dr 29s linear infinite}' +
    '@keyframes dr{from{transform:translateX(0)}to{transform:translateX(-320px)}}'
  const style =
    'symbol{overflow:visible}rect:not([width]){width:1px}rect:not([height]){height:1px}' +
    drift +
    '.tw{animation:tw 2.9s ease-in-out infinite alternate}@keyframes tw{from{fill-opacity:1}to{fill-opacity:.1}}' +
    '.bob{animation:bob 30s ease-in-out infinite alternate}@keyframes bob{from{transform:translateY(-1px)}to{transform:translateY(1px)}}' +
    '.glow{animation:glow 6s ease-in-out infinite alternate}@keyframes glow{from{fill-opacity:1}to{fill-opacity:.45}}' +
    sheet.join('') +
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}}'
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${320 * ENLARGE} ${200 * ENLARGE}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">` +
    `<style>${enlargedRules(style)}</style>` +
    enlarged(`<defs>${symbols}${clips}${ground.defs}${cloud.defs}${world.defs}</defs>` + screen(backdrop) + corners.join('')) +
    '</svg>'

  built = svg

  return svg
}


// ---------------------------------------------------------------------------------------------- the motion check

/**
 * A test card in place of the battle, for /clone-wars check. It answers by eye what cannot be measured from outside
 * the window: which ways of animating move here, and whether stepped motion keeps going with nothing smooth beside it.
 *
 * Six lettered squares. A, B and C change on every frame and stop on purpose after 20 seconds, when the bar is
 * empty. D, E and F move in steps, the way the battle does, and never stop. So where D, E and F halt as the bar
 * empties, the window only keeps a scene running while something in it changes on every frame.
 *
 * The first line shows "yes" only while its own animation is applied, and "NO" where something has switched
 * animation off: this stylesheet's reduced-motion rule, or the app holding scenes still.
 */
export function checkSvg(): string {
  const size = 36
  const run = 520
  const left = 330
  const lane = 1000
  const square = `<rect class="s" width="${size}" height="${size}"/>`
  // As a fighter is drawn: a screen of its own, a stepped path with its resting pose in attributes, a clip, a use.
  const asBattle =
    `<svg width="${run + size}" height="${size}" viewBox="0 0 ${(run + size) / 2} ${size / 2}" preserveAspectRatio="xMidYMid slice">` +
    `<g class="hstp" transform="translate(130,0)" opacity="1"><g clip-path="url(#cw-cell)"><use class="turn" href="#cw-half"/></g></g></svg>`
  const rows: readonly (readonly [string, string])[] = [
    ['slides smoothly', `<g class="lin">${square}</g>`],
    ['fades smoothly', `<g class="fad">${square}</g>`],
    ['fades its paint smoothly', `<rect class="s fop" width="${size}" height="${size}"/>`],
    ['hops along in 13 steps', `<g class="stp">${square}</g>`],
    ['jumps between 5 places', `<g class="end">${square}</g>`],
    ['moves the way the battle does', asBattle],
  ]
  const row = ([label, mover]: readonly [string, string], index: number): string => {
    const y = (index < 3 ? 318 : 548) + (index % 3) * 54

    return (
      `<text x="${left}" y="${y + 27}">${String.fromCharCode(65 + index)}  ${label}</text>` +
      `<rect class="t" x="${lane}" y="${y}" width="${run + size}" height="${size}"/>` +
      `<g transform="translate(${lane},${y})">${mover}</g>`
    )
  }
  const style =
    'text{font-family:ui-monospace,Consolas,monospace;font-weight:700;font-size:24px;fill:#cfe0ff}' +
    '.t{fill:#1b2550}.s{fill:#58a6ff}.h{fill:#8f9bc4;font-size:22px}' +
    '.run{opacity:0;animation:run 1s step-end infinite}.halt{animation:halt 1s step-end infinite}' +
    '@keyframes run{from,to{opacity:1}}@keyframes halt{from,to{opacity:0}}' +
    `@keyframes go{from{transform:translate(0px,0px)}to{transform:translate(${run}px,0px)}}` +
    `@keyframes half{from{transform:translate(0px,0px)}to{transform:translate(${run / 2}px,0px)}}` +
    `@keyframes hop{0%{transform:translate(0px,0px)}25%{transform:translate(${run / 4}px,0px)}50%{transform:translate(${run / 2}px,0px)}75%{transform:translate(${(run * 3) / 4}px,0px)}to{transform:translate(${run}px,0px)}}` +
    '@keyframes fade{from{opacity:1}to{opacity:.15}}@keyframes fop{from{fill-opacity:1}to{fill-opacity:.15}}' +
    '@keyframes turn{0%{transform:translate(0px,0px)}50%{transform:translate(0px,-4px)}}' +
    '@keyframes drain{from{transform:scaleX(1)}to{transform:scaleX(0)}}' +
    // Twenty seconds each, and then nothing smooth is left running.
    '.lin{animation:go 2.5s linear 8 alternate}.fad{animation:fade 1.25s linear 16 alternate}.fop{animation:fop 1.25s linear 16 alternate}' +
    '.drain{animation:drain 20s linear forwards}' +
    '.stp{animation:go 3s steps(13) infinite alternate}.hstp{animation:half 3s steps(13) infinite alternate}' +
    '.end{animation:hop 3s step-end infinite}.turn{animation:turn 1s step-end infinite}' +
    '.asked{display:none}' +
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}.asked{display:inline}.free{display:none}}'

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">' +
    `<style>${style}</style>` +
    `<defs><rect id="cw-half" class="s" width="${size / 2}" height="${size / 2}"/><clipPath id="cw-cell"><rect width="${size / 2}" height="${size / 2}"/></clipPath></defs>` +
    '<rect x="-3000" y="-3000" width="7600" height="7000" fill="#060818"/>' +
    `<text x="${left}" y="120" style="font-size:38px;fill:#ffffff">Clone Wars motion check</text>` +
    `<text class="run" x="${left}" y="172" style="fill:#6dff8f">Animation allowed here: yes</text>` +
    `<text class="halt" x="${left}" y="172" style="fill:#ff6b6b">Animation allowed here: NO, scenes are held still</text>` +
    `<text class="free h" x="${left}" y="210">Reduced motion (system): off</text>` +
    `<text class="asked h" x="${left}" y="210" style="fill:#ffc857">Reduced motion (system): ON</text>` +
    `<text class="h" x="${left}" y="290">Smooth. A, B and C stop on purpose when this bar is empty (20 s):</text>` +
    `<rect class="t" x="1230" y="270" width="326" height="24"/><g transform="translate(1230,270)"><rect class="drain" width="326" height="24" fill="#ffc857"/></g>` +
    `<text class="h" x="${left}" y="520">Stepped. D, E and F should never stop:</text>` +
    rows.map(row).join('') +
    `<text x="${left}" y="770">Watch for 30 seconds, then tell Claude:</text>` +
    `<text x="${left}" y="812">1. Which letters moved while the bar was draining?</text>` +
    `<text x="${left}" y="854">2. Did D, E and F keep moving after the bar was empty?</text>` +
    `<text class="h" x="${left}" y="912">/clone-wars on brings the battle back.</text>` +
    '</svg>'
  )
}
