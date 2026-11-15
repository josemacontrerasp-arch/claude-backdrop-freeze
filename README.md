# Why an animated backdrop stands still in the Claude desktop app

A mod for the Claude Code desktop app can draw an animated SVG behind the chat. Some scenes show their first frame and never move, although the same SVG animates in a browser.

This repository lists what was found to cause that, with the measurements, a mod that reproduces it in one command, and a script that checks a scene for it.

Measured on one machine, on build 5.11492.5.0 of the app for Windows, on 2026-11-15. The cause inside the app is not known. Reported to Anthropic as [anthropics/claude-code#110262](https://github.com/anthropics/claude-code/issues/110262).

## What stops a scene

A backdrop drawn as `<Svg isInteractive …>` stops animating if the SVG contains any one of these, anywhere in it:

| | Example that is enough |
|---|---|
| A length in a viewport or container unit: `vw`, `vh`, `vi`, `vb`, `vmin`, `vmax`, the `sv`, `lv`, `dv` forms, `cqw` to `cqmax` | `.unused{stroke-width:1vh}` or `@media (min-width:10vw){…}` |
| A class selector spelled like one of those units | `.vb{}` with no element of that class |
| `shape-rendering` set to anything but `auto` | `shape-rendering="crispEdges"` on the root, or in any rule |
| `vector-effect: non-scaling-stroke` | `.unused{vector-effect:non-scaling-stroke}` |

The rule does not have to match anything. An empty rule for a class named `vb` is enough.

These were measured and do no harm:

- the same name as an id, an element selector, an attribute selector, a keyframes name or an `animation` value: `#vb`, `vb{}`, `[class~=vb]`, `@keyframes vb`
- a prefixed class: `.cw-vb`
- class names spelled like other units: `ch`, `em`, `px`, `ms` and so on
- lengths in `px`, `em`, `rem`, `%`
- media queries on a width in `px`, or on the color scheme
- `image-rendering: pixelated`
- `steps()` timing, a small `viewBox`, `<use>` and `<symbol>`, patterns, clip paths, negative delays, large documents

## What to do about it

- Give generated class names a prefix. A scene that names its animations `a`, `b`, `va`, `vb` will hit this.
- For hard pixel edges, do not ask for `crispEdges`. Draw each rect a little larger than its cell so neighbours overlap. The mod in `clone-wars` writes every rect 0.6 units wider and taller on a grid of 5.
- Size things with `px` or `%` and the root's `viewBox`, not with `vw` or `vh`.
- Check a scene before you look at it:

```bash
node tools/check-scene.mjs your-scene.svg
```

## See it happen

```
/plugin install backdrop-freeze-repro --marketplace josemacontrerasp-arch/claude-backdrop-freeze
/freeze-repro ok
/freeze-repro class
```

The first picture moves. The second is the same picture with `.vb{}` added to its stylesheet, and it stands still. The other cases are listed in [backdrop-freeze-repro/README.md](backdrop-freeze-repro/README.md).

## What is here

| Path | What it is |
|---|---|
| [docs/measurements.md](docs/measurements.md) | every test picture and its reading |
| [docs/how-it-was-measured.md](docs/how-it-was-measured.md) | how to tell whether a backdrop moves without watching it |
| [docs/report-for-anthropic.md](docs/report-for-anthropic.md) | the same findings written as a bug report |
| [tools/check-scene.mjs](tools/check-scene.mjs) | reads an SVG and lists what in it is known to stop it |
| [tools/bench.ps1](tools/bench.ps1), [tools/bench-hook.md](tools/bench-hook.md) | show test pictures in the real window from a script and measure each |
| [backdrop-freeze-repro](backdrop-freeze-repro) | a mod that shows one picture with or without each trigger |
| [clone-wars](clone-wars) | the mod this was found in: three animated pixel-art backdrops, and a test that guards against all of the above |

## The mod this came from

`clone-wars` draws one of three scenes behind the chat: a pixel-art space battle, the Claude mascot asleep until a firework goes off, or a little process plant run by the mascot in a lab coat.

```
/plugin install clone-wars --marketplace josemacontrerasp-arch/claude-backdrop-freeze
/clone-wars battle
/clone-wars fireworks
/clone-wars plant
```

Its battle stood still for a day. Early builds asked for `crispEdges`; every build named one of its volleys `vb`. Renaming four animation classes fixed it.

An animated full-window scene is not free. On the machine this was measured on, the battle kept the app's main process at about one full processor core while the window was visible, and the fireworks scene at about half that.

The plant is built round that cost. It hooks `turn.start` and `turn.complete` and shows one of three pictures: at rest nothing moves, during a reply the pumps turn and drops fall into the reactor's window like a titration, and when the answer is done the liquid turns pink once and everything stops. Only the running picture has an animation that repeats.

## Limits

- One machine: Windows 11, Intel Arc 140T graphics, display at 150% scale. One build of the app.
- "Moves" and "stands still" were read from how busy the app's renderer process was, and checked by eye on the scenes that mattered. See [docs/how-it-was-measured.md](docs/how-it-was-measured.md).
- Two readings in about seventy went the other way, so a trigger may not stop a scene on every single load.
- Why the app does this is not known. Nothing in its page bundle or in the CLI looks for these units or keywords, and the same document runs in a browser and in the app's own built-in browser.
