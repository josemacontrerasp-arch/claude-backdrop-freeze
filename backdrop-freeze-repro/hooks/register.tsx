import type { Register } from 'claude-code'

// A small animated picture for the desktop app's backdrop, drawn with or without ONE thing that stops every CSS
// animation in it there. `/freeze-repro ok` moves; `/freeze-repro class` is the same picture with one empty rule
// added, and stands still. What each case adds is in CASES. Pure string building, no script in the picture.

type Case = {
  /** What the case adds to the plain picture, in words. */
  adds: string
  /** Attributes it puts on the root <svg>. */
  root?: string
  /** Rules it appends to the stylesheet. No element of the picture is matched by any of them. */
  css?: string
  /** Whether the picture still moves in the desktop app with it (measured on build 5.11492.5.0). */
  runs: boolean
}

export const CASES: Record<string, Case> = {
  ok: { adds: 'nothing', runs: true },
  class: { adds: 'an empty rule for a class named after a viewport unit: .vb{}', css: '.vb{}', runs: false },
  unit: { adds: 'an unused rule with a viewport unit: .unused{stroke-width:1vh}', css: '.unused{stroke-width:1vh}', runs: false },
  container: { adds: 'an unused rule with a container unit: .unused{stroke-width:1cqw}', css: '.unused{stroke-width:1cqw}', runs: false },
  crisp: { adds: 'shape-rendering="crispEdges" on the root', root: ' shape-rendering="crispEdges"', runs: false },
  geometric: { adds: 'shape-rendering="geometricPrecision" on the root', root: ' shape-rendering="geometricPrecision"', runs: false },
  stroke: { adds: 'an unused rule: .unused{vector-effect:non-scaling-stroke}', css: '.unused{vector-effect:non-scaling-stroke}', runs: false },
  speed: { adds: 'shape-rendering="optimizeSpeed" on the root', root: ' shape-rendering="optimizeSpeed"', runs: false },
  names: {
    adds: 'the name vb everywhere but in a class selector (a control): a keyframes rule, an id, an element, an attribute selector',
    css: '@keyframes vb{from{fill-opacity:1}to{fill-opacity:1}}#vb{}vb{}[class~=vb]{}',
    runs: true,
  },
}

const SCENE = /^freeze-repro-([a-z]+)$/

/**
 * The picture for a case: rows of squares that slide, a disc that pulses and a field of dots that drifts, under a
 * label that names the case. The label never spells out what the case adds, so nothing but the case itself differs
 * between two pictures.
 */
export function pictureOf(name: string): string {
  const found = CASES[name] ?? { adds: 'nothing', runs: true }
  let dots = ''
  let squares = ''

  for (let index = 0; index < 600; index += 1) {
    dots += `<rect x="${(index * 37) % 1790}" y="${(index * 53) % 990}" width="6" height="6"/>`
  }

  for (let row = 0; row < 5; row += 1) {
    squares +=
      `<rect x="420" y="${470 + row * 90}" width="700" height="60" fill="#1b2550"/>` +
      `<g transform="translate(420,${470 + row * 90})"><rect class="sl" style="animation-duration:${1.6 + row * 0.4}s" width="60" height="60" fill="#58a6ff"/></g>`
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"${found.root ?? ''}>` +
    '<style>' +
    '.sl{animation:sl 2s linear infinite alternate}@keyframes sl{from{transform:translate(0px,0px)}to{transform:translate(640px,0px)}}' +
    '.pu{animation:pu 1s ease-in-out infinite alternate}@keyframes pu{from{fill-opacity:1}to{fill-opacity:.15}}' +
    '.dr{animation:dr 12s linear infinite alternate}@keyframes dr{from{transform:translate(0px,0px)}to{transform:translate(-190px,0px)}}' +
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}}' +
    (found.css ?? '') +
    '</style>' +
    '<rect width="1600" height="1000" fill="#0b1020"/>' +
    `<g class="dr" fill="#2a3a78">${dots}</g>` +
    '<rect x="380" y="150" width="1180" height="800" fill="#060818" fill-opacity=".86"/>' +
    `<text x="420" y="260" font-family="ui-monospace,Consolas,monospace" font-weight="700" font-size="76" fill="#ffffff">freeze-repro: ${name}</text>` +
    `<text x="420" y="330" font-family="ui-monospace,Consolas,monospace" font-size="30" fill="#c9d3f2">here the picture should ${found.runs ? 'MOVE' : 'STAND STILL'}</text>` +
    '<text x="420" y="380" font-family="ui-monospace,Consolas,monospace" font-size="30" fill="#c9d3f2">squares slide, the disc pulses, the dots drift</text>' +
    '<circle class="pu" cx="1330" cy="300" r="70" fill="#ffb84a"/>' +
    squares +
    '</svg>'
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: 'freeze-repro',
        description: 'Shows a small animated backdrop in the desktop app, with or without one thing that stops it: /freeze-repro ok moves, /freeze-repro class stands still. /freeze-repro off clears it.',
        argumentHint: `${Object.keys(CASES).join('|')}|off`,
        immediate: true,
      })
    } catch (error) {
      void $.ui.toast(`backdrop-freeze-repro: /freeze-repro is not available (${String(error)})`)
    }

    return next(e)
  })

  on('command.run', { command: 'freeze-repro' }, async ($, e) => {
    const word = e.args.trim().toLowerCase()

    if (word === 'off') {
      await $.theme.clear()

      return { text: 'Backdrop cleared.' }
    }

    const found = CASES[word]

    if (found === undefined) {
      return { text: `Type /freeze-repro and one of: ${Object.keys(CASES).join(', ')}, or off.` }
    }

    const set = await $.theme.set({ backdrop: { scene: `freeze-repro-${word}` }, overrideColorScheme: 'dark' })

    return {
      text: set.isDrawn
        ? `Showing "${word}". It adds ${found.adds}. In the desktop app the picture should ${found.runs ? 'move' : 'stand still'}.`
        : `Set, but nothing here draws it: ${set.reason}`,
    }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const name = SCENE.exec(e.props.scene)?.[1]

    // Every mod's hook hears every backdrop, and only a window has room behind the chat.
    if (name === undefined || CASES[name] === undefined || e.surface !== 'desktop') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    // `isInteractive` is what asks for the sandboxed frame, where CSS animation runs; without it the app draws an image.
    return <Svg isInteractive alt={`A test picture of sliding squares for the case ${name}`} source={pictureOf(name)} />
  })
}
