import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { battleSvg, checkSvg } from './scene'
import { sleepySvg } from './sleepy'

/** The scenes a person can choose between: the space battle, or the Claude mascot asleep until its firework goes off. */
type Scene = 'battle' | 'fireworks'
/** What is drawn: one of the scenes, or a test card that shows which kinds of animation run in this window. */
type Card = Scene | 'check'
/**
 * How the scene is handed to the app. `frame`: the app puts the SVG in a sandboxed frame, as Anthropic's
 * theme-examples does. `image`: the app draws it as a plain image inside its own page.
 */
type Draw = 'image' | 'frame'
/** How the app frosts its panels over the battle: `blur` in points, 0 to 64, and how opaque the navy tint is, 0 to 1. */
type Glass = { blur: number; opacity: number }

// A scene's name says both what it is and how it is drawn, so a change of either is a new scene to the app and is
// drawn afresh. The Backdrop hook draws only where it reads one of these names.
const SCENES: Record<string, { card: Card; draw: Draw }> = {
  'clone-wars-battle': { card: 'battle', draw: 'frame' },
  'clone-wars-battle-image': { card: 'battle', draw: 'image' },
  'clone-wars-fireworks': { card: 'fireworks', draw: 'frame' },
  'clone-wars-fireworks-image': { card: 'fireworks', draw: 'image' },
  'clone-wars-check': { card: 'check', draw: 'frame' },
  'clone-wars-check-image': { card: 'check', draw: 'image' },
}

// Holds 'off' where the person turned the backdrop off; absent, it is on. One key for every session and project.
const OFF_KEY = 'backdrop'
// Holds the frost the person chose with /clone-wars glass; absent, DEFAULT_GLASS.
const GLASS_KEY = 'glass'
// Holds 'image' or 'frame' where the person chose with /clone-wars draw; absent, DEFAULT_DRAW.
const DRAW_KEY = 'draw'
// Holds 'battle' or 'fireworks' where the person chose with /clone-wars battle or /clone-wars fireworks; absent,
// DEFAULT_SCENE. An earlier build called the second scene 'claude', and that word is still read as 'fireworks'.
const SCENE_KEY = 'scene'
const DEFAULT_SCENE: Scene = 'battle'
const TINT = '#0a1030'

// The app lays its glass over nearly the whole window: the sidebar, and a veil under the whole transcript. So the
// blur decides how much of the battle is left to see: at 12 the fighters, bolts and stars smear away, at 2 the
// pixels soften, at 0 they stay hard. The tint is what keeps the chat readable, so it stays strong.
const DEFAULT_GLASS: Glass = { blur: 2, opacity: 0.6 }

// As a frame by default: what Anthropic's theme-examples uses. An image is the other way the app can draw a scene;
// it costs more, since each change repaints the whole picture.
const DEFAULT_DRAW: Draw = 'frame'

const GLASS_USAGE =
  'Type /clone-wars glass <blur 0-64> <opacity 0-1>: for example /clone-wars glass 0 0.6 for hard pixels, /clone-wars glass 12 0.6 for heavy frost, or /clone-wars glass reset.'
const CHECK_USAGE = 'Type /clone-wars check, /clone-wars check frame or /clone-wars check image.'
const USAGE = 'Type /clone-wars on, off, battle, fireworks, check, glass <blur> <opacity>, or draw image|frame.'

// The module's own variables start over on a reload, and `session.start` runs again then, so all are learnt anew.
/** Whether this mod's backdrop is the one the session shows, as far as this load has seen. */
let isStanding = false
/** Whether a theme another mod set is the one that stands: its set begins that, and any clear ends it. */
let isAnothers = false
/** How many of this mod's own theme calls are in flight: the hooks below tell them from another mod's by it. */
let ownCalls = 0
function isGlass(value: unknown): value is Glass {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const { blur, opacity } = value as { blur?: unknown; opacity?: unknown }

  // A NaN fails every comparison, so a word that is no number is refused here too.
  return typeof blur === 'number' && blur >= 0 && blur <= 64 && typeof opacity === 'number' && opacity >= 0 && opacity <= 1
}

/** The glass the person chose. A store that cannot be read, or holds something else, counts as no choice. */
async function glassOf($: EngineInterface): Promise<Glass> {
  try {
    const kept = await $.store.get(GLASS_KEY)

    if (isGlass(kept)) {
      return { blur: kept.blur, opacity: kept.opacity }
    }
  } catch {
    // The default serves.
  }

  return DEFAULT_GLASS
}

/** How the person chose to have the scene drawn; any other stored value counts as no choice. */
async function drawOf($: EngineInterface): Promise<Draw> {
  try {
    const kept = await $.store.get(DRAW_KEY)

    if (kept === 'image' || kept === 'frame') {
      return kept
    }
  } catch {
    // The default serves.
  }

  return DEFAULT_DRAW
}

/** The scene the person chose; any other stored value counts as no choice. */
async function pickedOf($: EngineInterface): Promise<Scene> {
  try {
    const kept = await $.store.get(SCENE_KEY)

    if (kept === 'battle' || kept === 'fireworks') {
      return kept
    }

    if (kept === 'claude') {
      return 'fireworks'
    }
  } catch {
    // The default serves.
  }

  return DEFAULT_SCENE
}

function sceneOf(card: Card, draw: Draw): string {
  return `clone-wars-${card}${draw === 'image' ? '-image' : ''}`
}

/** On unless the person turned it off. A store that cannot be read counts as on: the mod's whole job is to show. */
async function isOn($: EngineInterface): Promise<boolean> {
  try {
    return (await $.store.get(OFF_KEY)) !== 'off'
  } catch {
    return true
  }
}

/**
 * Sets the whole theme in one call: a set names everything, so what it left out would be gone. `card` and `draw`
 * are for this one showing; left out, it is the scene the person chose, drawn the way they chose.
 */
async function show($: EngineInterface, card?: Card, draw?: Draw): Promise<Awaited<ReturnType<EngineInterface['theme']['set']>>> {
  return put($, sceneOf(card ?? (await pickedOf($)), draw ?? (await drawOf($))))
}

/** Sets the theme with the scene of this name under the person's glass, and notes that this mod's backdrop stands. */
async function put($: EngineInterface, scene: string): Promise<Awaited<ReturnType<EngineInterface['theme']['set']>>> {
  ownCalls += 1

  try {
    const glass = await glassOf($)
    const look: ThemeSetArgs = {
      backdrop: { scene, glass: { blur: glass.blur, tint: TINT, opacity: glass.opacity } },
      overrideColorScheme: 'dark',
    }
    const set = await $.theme.set(look)

    isStanding = true
    isAnothers = false

    return set
  } finally {
    ownCalls -= 1
  }
}

/**
 * Puts the backdrop back where it is on and the window is bare. Asks the engine nothing while it stands (a set
 * starts the scene over), and nothing while another mod's theme stands: that one is the person's choice.
 */
async function bringBack($: EngineInterface): Promise<void> {
  if (!isStanding && !isAnothers && (await isOn($))) {
    await show($)
  }
}

/** Runs a step nobody asked for by name: its fault must never cost the person their start, their prompt or another mod's call. */
async function quietly($: EngineInterface, step: () => Promise<void>): Promise<void> {
  try {
    await step()
  } catch (error) {
    try {
      await $.ui.log(`the backdrop could not be set (${error instanceof Error ? error.message : String(error)})`, { to: 'debug' })
    } catch {
      // Nothing more to tell.
    }
  }
}

/** `/clone-wars glass`: alone it says what the glass is; with numbers it sets and keeps it; `reset` goes back to the default. */
async function glassCommand($: EngineInterface, words: readonly string[]): Promise<string> {
  const now = await glassOf($)
  const [first, second, ...more] = words

  if (first === undefined) {
    return `Glass is blur ${now.blur}, opacity ${now.opacity}. ${GLASS_USAGE}`
  }

  let next: Glass

  if (first === 'reset' && second === undefined) {
    await $.store.delete(GLASS_KEY)
    next = DEFAULT_GLASS
  } else {
    next = { blur: Number(first), opacity: second === undefined ? now.opacity : Number(second) }

    if (more.length > 0 || !isGlass(next)) {
      return GLASS_USAGE
    }

    await $.store.set(GLASS_KEY, next)
  }

  // A set shows the backdrop, so only where it is on: off stays off.
  if (!(await isOn($))) {
    return `Glass set to blur ${next.blur}, opacity ${next.opacity}. The backdrop is off: /clone-wars on shows it.`
  }

  await show($)

  return `Glass set to blur ${next.blur}, opacity ${next.opacity}.`
}

/** `/clone-wars draw`: alone it says how the scene is drawn; `image` or `frame` sets and keeps it. */
async function drawCommand($: EngineInterface, words: readonly string[]): Promise<string> {
  const [first, ...more] = words

  if (first === undefined) {
    return `The scene is drawn as ${(await drawOf($)) === 'image' ? 'an image' : 'a frame'}. Type /clone-wars draw image or /clone-wars draw frame.`
  }

  if ((first !== 'image' && first !== 'frame') || more.length > 0) {
    return 'Type /clone-wars draw image or /clone-wars draw frame.'
  }

  await $.store.set(DRAW_KEY, first)

  if (!(await isOn($))) {
    return `The scene will be drawn as ${first === 'image' ? 'an image' : 'a frame'}. The backdrop is off: /clone-wars on shows it.`
  }

  await show($)

  return `The scene is now drawn as ${first === 'image' ? 'an image' : 'a frame'}.`
}

/** `/clone-wars check`: the test card in place of the battle, drawn the way the battle is, or the way named for this once. */
async function checkCommand($: EngineInterface, words: readonly string[]): Promise<string> {
  const [first, ...more] = words

  if ((first !== undefined && first !== 'image' && first !== 'frame') || more.length > 0) {
    return CHECK_USAGE
  }

  const draw = first ?? (await drawOf($))
  const set = await show($, 'check', draw)

  return set.isDrawn
    ? `Motion check shown behind the chat, drawn as ${draw === 'image' ? 'an image' : 'a frame'}. Watch it for 30 seconds: it asks which squares move, and whether the lower three keep moving once its bar is empty. /clone-wars on brings your scene back.`
    : `Motion check set, but nothing here draws it: ${set.reason}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // A refused name must not cost the session its backdrop: go on without the command.
    try {
      await $.command.register({
        name: 'clone-wars',
        description:
          'The scene behind the chat: "on" shows it, "off" takes it away, "battle" and "fireworks" pick the space battle or the sleeping Claude with its firework, "glass <blur> <opacity>" sets the frost over it, "draw image|frame" picks how the app draws it, "check" shows a test card of which kinds of animation run here.',
        argumentHint: 'on|off|battle|fireworks|check|glass <blur> <opacity>|draw image|frame',
        immediate: true,
      })
    } catch (error) {
      void $.ui.toast(`clone-wars: /clone-wars is not available (${String(error)})`)
    }

    // A start, or a reload of the mods: nothing is known to stand, so the backdrop is set where it is on.
    isStanding = false
    isAnothers = false
    await quietly($, () => bringBack($))

    return next(e)
  })

  // A /clear ends the conversation with no new start, and a theme is display only: set it again at the next turn.
  on('session.end', ($, e, next) => {
    if (e.reason === 'clear') {
      isStanding = false
      isAnothers = false
    }

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await quietly($, () => bringBack($))

    return next(e)
  })

  // One theme stands at a time, the latest set. Another mod's set takes this one's place, and that is the person's
  // choice, so it is only noted: the backdrop is not put back over it, at the next prompt or later, until a clear.
  on('theme.set', async ($, e, next) => {
    const set = await next(e)

    if (ownCalls === 0) {
      isStanding = false
      isAnothers = true
    }

    return set
  })

  // A clear takes away whatever theme stands, whichever mod set it. Another mod that ends a short show of its own
  // with one (theme-examples after its fireworks or a preview) leaves the window bare: this is where ours comes back.
  on('theme.clear', async ($, e, next) => {
    const cleared = await next(e)

    isStanding = false
    isAnothers = false
    if (ownCalls === 0) {
      await quietly($, () => bringBack($))
    }

    return cleared
  })

  on('command.run', { command: 'clone-wars' }, async ($, e) => {
    const [word = '', ...rest] = e.args
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(part => part !== '')

    if (word === 'glass') {
      return { text: await glassCommand($, rest) }
    }

    if (word === 'draw') {
      return { text: await drawCommand($, rest) }
    }

    if (word === 'check') {
      return { text: await checkCommand($, rest) }
    }

    if (rest.length > 0) {
      return { text: USAGE }
    }

    // 'claude' is what an earlier build called the fireworks scene.
    if (word === 'battle' || word === 'fireworks' || word === 'claude') {
      const picked: Scene = word === 'battle' ? 'battle' : 'fireworks'

      await $.store.set(SCENE_KEY, picked)
      // Picking a scene is asking to see it: it also turns the backdrop on.
      await $.store.delete(OFF_KEY)

      const set = await show($)
      const name = picked === 'battle' ? 'The space battle' : 'Fireworks'

      return { text: set.isDrawn ? `${name} is the scene now.` : `${name} is the scene now, but nothing here draws it: ${set.reason}` }
    }

    if (word === 'on') {
      await $.store.delete(OFF_KEY)

      const set = await show($)

      return { text: set.isDrawn ? 'Clone Wars backdrop on.' : `Clone Wars backdrop on, but nothing here draws it: ${set.reason}` }
    }

    if (word === 'off') {
      await $.store.set(OFF_KEY, 'off')

      // Only where ours stands: a clear would take another mod's theme away too.
      if (isStanding) {
        ownCalls += 1

        try {
          await $.theme.clear()
        } finally {
          ownCalls -= 1
        }
      }

      return { text: 'Clone Wars backdrop off. /clone-wars on brings it back.' }
    }

    const glass = await glassOf($)

    return {
      text: `Clone Wars backdrop is ${(await isOn($)) ? 'on' : 'off'}, showing ${(await pickedOf($)) === 'battle' ? 'the space battle' : 'fireworks'}, drawn as ${(await drawOf($)) === 'image' ? 'an image' : 'a frame'}, glass at blur ${glass.blur}, opacity ${glass.opacity}. ${USAGE}`,
    }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const scene = SCENES[e.props.scene]

    // Every mod's hook hears every backdrop, and only a window has room behind the chat.
    if (scene === undefined || e.surface !== 'desktop') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)
    const source = scene.card === 'check' ? checkSvg() : scene.card === 'fireworks' ? sleepySvg() : battleSvg()
    const alt =
      scene.card === 'check'
        ? 'A test card of moving squares that shows which kinds of animation run in this window'
        : scene.card === 'fireworks'
          ? 'The Claude mascot asleep on a hill at night; a firework wakes it and bursts into the words: Pepe use more tokens'
          : 'A pixel-art space battle: white wedge-shaped ships on the left trade laser fire with rust-brown crescent cruisers on the right, over a blue planet'

    // `isInteractive` is what asks for the sandboxed frame; without it the app draws an image.
    return scene.draw === 'frame' ? <Svg isInteractive alt={alt} source={source} /> : <Svg alt={alt} source={source} />
  })
}
