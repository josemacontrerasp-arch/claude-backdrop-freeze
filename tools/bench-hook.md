# The bench hook

A temporary piece of a mod's `hooks/register.tsx` that lets a script outside the app decide which picture the backdrop shows.
With it, `bench.ps1` can flip through test pictures in the real window and measure each one, so nobody has to watch.

Take it out again when you are done: a mod should not go on polling a file.

## What it does

While the file `bench/order.txt` exists in the mod's own folder, the mod reads it every 0.7 seconds.
The file holds one line, `<id> <what>`:

- `<id> file` shows the SVG in `bench/scene.svg`. The scene name carries the id, so every order is drawn afresh.
- `<id> off` clears the backdrop.
- Add your own words for scenes your mod already has.

After showing it, the mod writes `<id> <what> <result> <time>` to `bench/ack.txt`.
The poller starts at `session.start`, which also runs at `/reload-plugins`, so one reload is all the typing it needs.

It reads nothing outside its own folder, and what it reads is only ever drawn as a backdrop, in the same script-less sandboxed frame as any scene.

## The code

```tsx
import type { EngineInterface, Register } from 'claude-code'

const BENCH_SCENE = /^bench-(\d+)$/
let benchSource = ''
let benchSeen = ''

/** One look at the bench's order: what it names is shown, if the order is new. */
async function benchTick($: EngineInterface): Promise<void> {
  const folder = `${$.plugin.root}/bench`
  const order = (await $.fs.read(`${folder}/order.txt`)).trim()

  if (order === '' || order === benchSeen) return

  benchSeen = order

  const [id = '0', what = ''] = order.split(/\s+/)
  let did = 'unknown'

  if (what === 'file') {
    benchSource = await $.fs.read(`${folder}/scene.svg`)
    did = (await $.theme.set({ backdrop: { scene: `bench-${id}` }, overrideColorScheme: 'dark' })).isDrawn ? 'drawn' : 'not-drawn'
  } else if (what === 'off') {
    await $.theme.clear()
    did = 'cleared'
  }

  await $.fs.write(`${folder}/ack.txt`, `${order} ${did} ${await $.clock.now()}`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Only while the order file stands in this mod's folder.
    if (await $.fs.exists(`${$.plugin.root}/bench/order.txt`).catch(() => false)) {
      benchSeen = ''
      $.clock.every(700, () => void benchTick($).catch(() => undefined))
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (!BENCH_SCENE.test(e.props.scene) || e.surface !== 'desktop' || benchSource === '') return next(e)

    const { Svg } = $.ui.resolve(e)

    return <Svg isInteractive alt="A test picture from the bench" source={benchSource} />
  })
}
```

## Using it

1. Put the code in a mod you have installed from a folder, create `bench/order.txt` in that folder with the text `0 none`, and run `/reload-plugins`.
2. Keep the app's window visible. A covered or minimised window stops drawing and reads as "still".
3. Run `bench.ps1` with the pictures you want to compare. Always put a picture you know moves and one you know stands still in the same run.
4. When you are done, delete the `bench` folder and the code, and reload once more.

How to read the numbers is in [../docs/how-it-was-measured.md](../docs/how-it-was-measured.md).
