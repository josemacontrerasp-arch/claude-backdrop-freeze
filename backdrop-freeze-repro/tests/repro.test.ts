import { expect, mock, test } from 'claude-code/testing'
import type { CommandRunInput, On } from 'claude-code'

import { CASES, pictureOf } from '../hooks/register'

const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

/** A slash command as the person typing it raises it. */
function typed(command: string, args = ''): CommandRunInput {
  return { command, args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } }
}

/** The engine beneath the mod: it records every backdrop it is asked to show, `none` for a clear. */
function world(on: On): string[] {
  const shown: string[] = []

  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
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

test('a case is shown by its name, and off clears it', async ($, on) => {
  const shown = world(on)

  await $.session.start(START)
  // The mod shows nothing until it is asked.
  expect(shown).toEqual([])

  expect((await $.command.run(typed('freeze-repro', 'class'))).text?.includes('should stand still')).toBe(true)
  expect((await $.command.run(typed('freeze-repro', 'ok'))).text?.includes('should move')).toBe(true)
  expect((await $.command.run(typed('freeze-repro', 'nonsense'))).text?.startsWith('Type /freeze-repro and one of: ok, class,')).toBe(true)
  await $.command.run(typed('freeze-repro', 'off'))
  expect(shown).toEqual(['freeze-repro-class', 'freeze-repro-ok', 'none'])
})

test('every case is the plain picture with one thing added', async ($, on) => {
  world(on)

  await $.session.start(START)

  const plain = pictureOf('ok')
  const labelled = (name: string): string => pictureOf(name).replace(`freeze-repro: ${name}`, 'freeze-repro: ok').replace('should STAND STILL', 'should MOVE')

  for (const [name, found] of Object.entries(CASES)) {
    const ui = await $.ui.mount({ plugin: 'backdrop-freeze-repro', surface: 'desktop', component: 'Backdrop', props: { scene: `freeze-repro-${name}`, plugin: 'backdrop-freeze-repro', glass: false } })
    const svg = (await ui.find({ type: 'Svg' }))?.props
    const source = String(svg?.source)

    // Drawn in a frame, and what is drawn is what pictureOf builds.
    expect(svg?.isInteractive).toBe(true)
    expect(source).toBe(pictureOf(name))
    // Apart from its label, the picture differs from the plain one by exactly what the case adds.
    expect(labelled(name)).toBe(plain.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">', match => match.slice(0, -1) + (found.root ?? '') + '>').replace('</style>', `${found.css ?? ''}</style>`))
    // No element is matched by what a case adds: the picture has three classes and none of them is added.
    expect([...source.matchAll(/ class="([^"]*)"/g)].every(match => ['sl', 'pu', 'dr'].includes(match[1] ?? ''))).toBe(true)
    await ui.unmount()
  }
})
