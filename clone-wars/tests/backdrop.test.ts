import { expect, mock, test } from 'claude-code/testing'
import type { CommandRunInput, On, PromptSubmitInput } from 'claude-code'
import type { Plugin } from 'claude-code/testing'

// The battle as it is drawn by default: in a frame.
const OURS = 'clone-wars-battle'
const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const
const TINT = '#0a1030'

/** A slash command as the person typing it raises it. A test holds the engine's own handle, which passes the whole input. */
function typed(command: string, args = ''): CommandRunInput {
  return { command, args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } }
}

/** A prompt as the person typing it raises it. */
function said(text: string): PromptSubmitInput {
  return { text, wait: false, origin: { kind: 'composer' } }
}

// Stands for another backdrop mod, such as theme-examples: a short show of its own that ends on a clear (its
// fireworks, a preview), and a theme the person applies and keeps.
const other: Plugin = {
  name: 'other-theme',
  register(on) {
    on('command.run', { command: 'other-show' }, async $ => {
      await $.theme.set({ backdrop: { scene: 'fireworks' } })
      await $.theme.clear()

      return { text: 'shown' }
    })
    on('command.run', { command: 'other-apply' }, async $ => {
      await $.theme.set({ backdrop: { scene: 'reef' } })

      return { text: 'applied' }
    })
    on('command.run', { command: 'other-off' }, async $ => {
      await $.theme.clear()

      return { text: 'off' }
    })
  },
}

/** The engine beneath the mods: it records every theme it is asked to show, in order, `none` for a clear. */
function world(on: On): string[] {
  const shown: string[] = []

  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('theme.set', (_, e) => {
    shown.push(e.backdrop?.scene ?? 'no scene')

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('theme.clear', () => {
    shown.push('none')

    return { value: { isDrawn: false, reason: 'cleared' } }
  })

  return shown
}

test('the backdrop is set at the start, under frosted glass', async ($, on) => {
  const sets: unknown[] = []

  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('theme.set', (_, e) => {
    sets.push(e)

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })

  await $.session.start(START)

  expect(sets).toEqual([{ backdrop: { scene: OURS, glass: { blur: 2, tint: TINT, opacity: 0.6 } }, overrideColorScheme: 'dark' }])
})

test('the glass is tuned by command, kept, and a bad value changes nothing', async ($, on) => {
  const glass: unknown[] = []

  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('theme.set', (_, e) => {
    glass.push(e.backdrop?.glass)

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })

  await $.session.start(START)

  // Hard pixels: no blur, a lighter veil.
  const set = await $.command.run(typed('clone-wars', 'glass 0 0.5'))

  expect(set.text).toBe('Glass set to blur 0, opacity 0.5.')
  expect(glass.at(-1)).toEqual({ blur: 0, tint: TINT, opacity: 0.5 })

  // The blur alone: the opacity stays as it was.
  await $.command.run(typed('clone-wars', 'glass 6'))
  expect(glass.at(-1)).toEqual({ blur: 6, tint: TINT, opacity: 0.5 })

  for (const bad of ['glass lots', 'glass 99', 'glass 3 2', 'glass 1 0.5 7']) {
    const before = glass.length
    const answer = await $.command.run(typed('clone-wars', bad))

    expect(answer.text?.startsWith('Type /clone-wars glass')).toBe(true)
    expect(glass.length).toBe(before)
  }

  // Kept between sessions: a new start shows the glass as it was left.
  await $.session.start(START)
  expect(glass.at(-1)).toEqual({ blur: 6, tint: TINT, opacity: 0.5 })

  await $.command.run(typed('clone-wars', 'glass reset'))
  expect(glass.at(-1)).toEqual({ blur: 2, tint: TINT, opacity: 0.6 })

  const told = await $.command.run(typed('clone-wars', 'glass'))

  expect(told.text?.startsWith('Glass is blur 2, opacity 0.6.')).toBe(true)
})

test('it comes back when another mod ends a show of its own on a bare window', { plugins: [other] }, async ($, on) => {
  const shown = world(on)

  await $.session.start(START)
  await $.command.run(typed('other-show'))

  expect(shown).toEqual([OURS, 'fireworks', 'none', OURS])
})

test('a theme the person applied from another mod is left standing, through later prompts too', { plugins: [other] }, async ($, on) => {
  const shown = world(on)

  await $.session.start(START)
  await $.command.run(typed('other-apply'))
  // The next prompt must not put the battle back over it.
  await $.prompt.submit(said('hello'))
  // Off, while another mod's theme stands: nothing of theirs is cleared.
  await $.command.run(typed('clone-wars', 'off'))
  await $.command.run(typed('clone-wars', 'on'))
  await $.command.run(typed('other-apply'))
  await $.prompt.submit(said('hello again'))

  expect(shown).toEqual([OURS, 'reef', OURS, 'reef'])

  // When the other mod takes its theme away, the window is bare and the battle returns.
  await $.command.run(typed('other-off'))
  expect(shown).toEqual([OURS, 'reef', OURS, 'reef', 'none', OURS])
})

test('off takes it away and keeps it away, on brings it back', { plugins: [other] }, async ($, on) => {
  const shown = world(on)

  await $.session.start(START)
  await $.command.run(typed('clone-wars', 'off'))
  await $.command.run(typed('other-show'))
  await $.prompt.submit(said('hello'))
  expect(shown).toEqual([OURS, 'none', 'fireworks', 'none'])

  // Off is kept between sessions: a new start sets nothing.
  await $.session.start(START)
  expect(shown.length).toBe(4)

  const answer = await $.command.run(typed('clone-wars', 'on'))

  expect(answer.text).toBe('Clone Wars backdrop on.')
  expect(shown.at(-1)).toBe(OURS)
})

test('the scene is drawn in a frame by default and as an image when asked, and the choice is kept', async ($, on) => {
  const shown = world(on)
  const glass = { blur: 2, tint: TINT, opacity: 0.6 }
  const drawn = async (scene: string): Promise<Record<string, unknown> | undefined> => {
    const ui = await $.ui.mount({ plugin: 'clone-wars', surface: 'desktop', component: 'Backdrop', props: { scene, plugin: 'clone-wars', glass } })
    const props = (await ui.find({ type: 'Svg' }))?.props

    await ui.unmount()

    return props
  }

  await $.session.start(START)
  expect(shown.at(-1)).toBe('clone-wars-battle')

  const frame = await drawn('clone-wars-battle')
  const source = String(frame?.source)

  expect(source.startsWith('<svg')).toBe(true)
  expect(source.length).toBeLessThan(131072 * 0.75)
  // No script, and nothing fetched: the scene is markup and its own stylesheet.
  expect(/<script|\son[a-z]+=|https?:\/\/(?!www\.w3\.org)/.test(source)).toBe(false)
  // One screen: the root has the viewBox, and there is no <svg> inside the <svg>. Written out at 1600 by 1000 with
  // no shape-rendering hint: at 320 by 200 with crispEdges the scene showed its first picture and no other.
  expect(source.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">')).toBe(true)
  expect(source.includes('shape-rendering')).toBe(false)
  // Nothing in the battle moves by steps(n): its parts glide, and only what must change at once holds and jumps.
  expect(/steps\(/.test(source)).toBe(false)
  expect(source.includes('step-end')).toBe(true)
  expect(source.includes('@keyframes dr{from{transform:translateX(0)}to{transform:translateX(-1600px)}}')).toBe(true)
  expect(source.includes('rect:not([width]){width:5.6px}rect:not([height]){height:5.6px}')).toBe(true)
  expect(source.indexOf('<svg', 1)).toBe(-1)
  // Something always moves smoothly: the star layers drift, the bright stars twinkle, the planet's glow swells.
  expect(source.includes('.dr1{animation:dr 59s linear infinite}')).toBe(true)
  expect(source.includes('.tw{animation:tw 2.9s ease-in-out infinite alternate}@keyframes tw{from{fill-opacity:1}to{fill-opacity:.1}}')).toBe(true)
  // The four volleys, by the names that are no unit's.
  expect(['guna', 'gunb', 'gunc', 'gund'].every(name => source.includes(`@keyframes ${name}{`) && source.includes(` class="${name}"`))).toBe(true)
  // Nothing in the battle animates `opacity`, in a keyframe or as a resting attribute: its parts fade by
  // `fill-opacity`. With the cannon fire fading by `opacity` the whole scene stood still in the desktop app.
  expect(/[{;]opacity:/.test(source)).toBe(false)
  expect(/ opacity="/.test(source)).toBe(false)
  expect(/ fill-opacity="0"/.test(source)).toBe(true)
  expect(source.includes('@keyframes glow{from{fill-opacity:1}to{fill-opacity:.45}}')).toBe(true)
  // The frame is what `isInteractive` asks the app for.
  expect(frame?.isInteractive).toBe(true)

  const answer = await $.command.run(typed('clone-wars', 'draw image'))

  expect(answer.text).toBe('The scene is now drawn as an image.')
  expect(shown.at(-1)).toBe('clone-wars-battle-image')

  const image = await drawn('clone-wars-battle-image')

  // The same scene, drawn the other way.
  expect(image?.isInteractive === true).toBe(false)
  expect(image?.source).toBe(source)

  // Kept between sessions.
  await $.session.start(START)
  expect(shown.at(-1)).toBe('clone-wars-battle-image')

  expect((await $.command.run(typed('clone-wars', 'draw sideways'))).text).toBe('Type /clone-wars draw image or /clone-wars draw frame.')
  await $.command.run(typed('clone-wars', 'draw frame'))
  expect(shown.at(-1)).toBe('clone-wars-battle')

  // Another mod's scene is not ours to draw.
  expect(await drawn('reef')).toBeUndefined()
})

test('the person picks between the battle and the fireworks scene, and the pick is kept', async ($, on) => {
  const shown = world(on)

  await $.session.start(START)
  expect(shown.at(-1)).toBe('clone-wars-battle')

  const picked = await $.command.run(typed('clone-wars', 'fireworks'))

  expect(picked.text).toBe('Fireworks is the scene now.')
  expect(shown.at(-1)).toBe('clone-wars-fireworks')

  const props = { scene: 'clone-wars-fireworks', plugin: 'clone-wars', glass: { blur: 2, tint: TINT, opacity: 0.6 } }
  const ui = await $.ui.mount({ plugin: 'clone-wars', surface: 'desktop', component: 'Backdrop', props })
  const svg = (await ui.find({ type: 'Svg' }))?.props
  const source = String(svg?.source)

  expect(svg?.isInteractive).toBe(true)
  expect(String(svg?.alt).includes('Pepe use more tokens')).toBe(true)
  // Built the plain way: a root viewBox, and none of the parts the battle leans on.
  expect(source.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">')).toBe(true)
  expect(/<use|<symbol|<pattern|<clipPath|<script|shape-rendering|\son[a-z]+=/.test(source)).toBe(false)
  expect(source.indexOf('<svg', 1)).toBe(-1)
  // Something always moves smoothly, of three kinds: the stars drift, some twinkle, the near ones shimmer.
  expect(source.includes('.d1{animation:drift 260s linear infinite}')).toBe(true)
  expect(source.includes('@keyframes drift{from{transform:translate(0px,0px)}to{transform:translate(-1600px,0px)}}')).toBe(true)
  expect(source.includes('ease-in-out infinite alternate}@keyframes twinkle{from{opacity:1}to{opacity:.15}}')).toBe(true)
  expect(source.includes('@keyframes shim{from{fill-opacity:.5}to{fill-opacity:1}}')).toBe(true)
  expect(source.length).toBeLessThan(131072 * 0.5)
  await ui.unmount()

  // Kept between sessions, and through off and on.
  await $.session.start(START)
  expect(shown.at(-1)).toBe('clone-wars-fireworks')
  await $.command.run(typed('clone-wars', 'off'))
  await $.command.run(typed('clone-wars', 'on'))
  expect(shown.at(-1)).toBe('clone-wars-fireworks')
  expect((await $.command.run(typed('clone-wars'))).text?.includes('showing fireworks')).toBe(true)

  // Picking a scene shows it, even where the backdrop was off.
  await $.command.run(typed('clone-wars', 'off'))

  const back = await $.command.run(typed('clone-wars', 'battle'))

  expect(back.text).toBe('The space battle is the scene now.')
  expect(shown.at(-1)).toBe('clone-wars-battle')

  // The word an earlier build used for this scene still picks it.
  await $.command.run(typed('clone-wars', 'claude'))
  expect(shown.at(-1)).toBe('clone-wars-fireworks')
})

test('the motion check stands in for the battle until the battle is turned on again', async ($, on) => {
  const shown = world(on)

  await $.session.start(START)

  const answer = await $.command.run(typed('clone-wars', 'check'))

  expect(answer.text?.startsWith('Motion check shown behind the chat, drawn as a frame.')).toBe(true)
  expect(shown.at(-1)).toBe('clone-wars-check')

  const props = { scene: 'clone-wars-check', plugin: 'clone-wars', glass: { blur: 2, tint: TINT, opacity: 0.6 } }
  const ui = await $.ui.mount({ plugin: 'clone-wars', surface: 'desktop', component: 'Backdrop', props })
  const source = String((await ui.find({ type: 'Svg' }))?.props.source)

  // Both verdicts are in the card: which one shows is decided where it is drawn.
  expect(source.includes('Animation allowed here: yes')).toBe(true)
  expect(source.includes('Animation allowed here: NO')).toBe(true)
  expect(source.includes('Reduced motion (system): ON')).toBe(true)
  // The smooth rows end after 20 seconds and the stepped ones never do: that is the card's whole question.
  expect(source.includes('.lin{animation:go 2.5s linear 8 alternate}')).toBe(true)
  expect(source.includes('.stp{animation:go 3s steps(13) infinite alternate}')).toBe(true)
  expect(source.length).toBeLessThan(131072)
  await ui.unmount()

  // Drawn the other way for this once: the person's choice of how the battle is drawn is not changed.
  const once = await $.command.run(typed('clone-wars', 'check image'))

  expect(once.text?.startsWith('Motion check shown behind the chat, drawn as an image.')).toBe(true)
  expect(shown.at(-1)).toBe('clone-wars-check-image')

  const before = shown.length

  expect((await $.command.run(typed('clone-wars', 'check sideways'))).text).toBe('Type /clone-wars check, /clone-wars check frame or /clone-wars check image.')
  expect(shown.length).toBe(before)

  await $.command.run(typed('clone-wars', 'on'))
  expect(shown.at(-1)).toBe(OURS)
})

// Seen and measured on 2026-11-15 in the Windows desktop app: a scene with any of these in it shows its first picture
// and no other there, though it runs in a browser. The battle stood still for a day over a class named `vb`.
const UNIT = '(?:[sld]?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max))'

function whatStopsIt(source: string): string[] {
  const found: string[] = []
  const style = [...source.matchAll(/<style>([^<]*)<\/style>/g)].map(match => match[1] ?? '').join(' ')
  const classes = new Set<string>()

  for (const match of source.matchAll(/ class="([^"]*)"/g)) for (const name of (match[1] ?? '').split(/\s+/)) classes.add(name)
  for (const match of style.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) classes.add(match[1] ?? '')
  for (const name of classes) if (new RegExp(`^${UNIT}$`, 'i').test(name)) found.push(`a class named ${name}`)
  // A number written against the unit, as in 1vh or .5cqw: the digit tells it from a class.
  for (const match of style.matchAll(new RegExp(`\\d${UNIT}\\b`, 'gi'))) found.push(`a length in ${match[0]}`)
  if (/crispEdges|geometricPrecision|optimizeSpeed/i.test(source)) found.push('shape-rendering other than auto')
  if (/non-scaling-stroke/i.test(source)) found.push('vector-effect non-scaling-stroke')

  return found
}

test('no scene holds anything that stops it in the desktop app', async ($, on) => {
  world(on)

  await $.session.start(START)

  // The check itself: it finds each of the things that stop a scene, and passes a clean one.
  expect(whatStopsIt('<svg><style>.vb{}</style></svg>')).toEqual(['a class named vb'])
  expect(whatStopsIt('<svg><style>.a{stroke-width:1vh}</style><g class="b cqw"/></svg>')).toEqual(['a class named cqw', 'a length in 1vh'])
  expect(whatStopsIt('<svg shape-rendering="crispEdges"><style>.a{vector-effect:non-scaling-stroke}</style></svg>').length).toBe(2)
  expect(whatStopsIt('<svg><style>.bv{animation:bv 47s step-end infinite}@keyframes vb{from{width:5.6px}to{width:50%}}</style><g class="bv"/></svg>')).toEqual([])

  for (const scene of [OURS, 'clone-wars-fireworks', 'clone-wars-check']) {
    const ui = await $.ui.mount({ plugin: 'clone-wars', surface: 'desktop', component: 'Backdrop', props: { scene, plugin: 'clone-wars', glass: { blur: 2, tint: TINT, opacity: 0.6 } } })
    const source = String((await ui.find({ type: 'Svg' }))?.props.source)

    expect(source.startsWith('<svg ')).toBe(true)
    expect(whatStopsIt(source)).toEqual([])
    await ui.unmount()
  }
})
