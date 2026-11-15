# Report for Anthropic

Text for an issue on Claude Code. It stands on its own.

---

**Title:** Desktop app: an animated `Svg` backdrop stops animating if its CSS mentions a viewport unit, has a class named like one (`.vb`), or sets `shape-rendering`

**What happens**

In the desktop app, a mod's `Backdrop` drawn as `<Svg isInteractive …>` with CSS animations shows its first frame and never moves if the SVG contains any one of these, anywhere:

1. A length in a viewport or container unit (`vw`, `vh`, `vi`, `vb`, `vmin`, `vmax`, the `sv*`/`lv*`/`dv*` forms, `cqw` to `cqmax`). An unused rule is enough: `.unused{stroke-width:1vh}`. So is a media query: `@media (min-width:10vw)`.
2. A class selector spelled like one of those units. An empty rule is enough: `.vb{}`. Also `.VB`, `g.vb`, `.a,.vb`, `.vb .a`, and the escaped `.v\62 `. No element needs to have the class.
3. `shape-rendering` set to `crispEdges`, `geometricPrecision` or `optimizeSpeed`, as an attribute on the root or in any rule, used or not.
4. `vector-effect: non-scaling-stroke`, in any rule.

Not affected: the same name as an id (`#vb`), an element selector (`vb{}`), an attribute selector (`[class~=vb]`), a keyframes name (`@keyframes vb`) or an `animation` value; a prefixed class (`.cw-vb`); lengths in `px`, `em`, `rem`, `%`; `@media (min-width:100px)`; `image-rendering`.

The same SVG animates in Chrome, in headless Chrome with the app's pipeline copied (the bundled DOMPurify settings, the `font-family` and `color` attributes the app adds to the root, the `srcdoc` wrapper with its CSP, `sandbox=""`, `loading="lazy"`), and in the app's own built-in browser pane (there with the frame left readable by its page, `sandbox="allow-same-origin"`). It only stands still as the backdrop.

**Why it matters**

Item 2 is easy to hit by accident and very hard to find. A mod with about 90 animated parts stood still for a day because one generated animation class happened to be named `vb`. Item 3 rules out the usual way of asking for hard edges in pixel art.

**How to reproduce**

A minimal mod is at https://github.com/josemacontrerasp-arch/claude-backdrop-freeze, in `backdrop-freeze-repro`.

```
/plugin install backdrop-freeze-repro --marketplace josemacontrerasp-arch/claude-backdrop-freeze
/freeze-repro ok        the picture moves
/freeze-repro class     the same picture plus `.vb{}`: it stands still
/freeze-repro unit      plus `.unused{stroke-width:1vh}`: still
/freeze-repro crisp     plus shape-rendering="crispEdges" on the root: still
/freeze-repro names     plus @keyframes vb, #vb{}, vb{}, [class~=vb]{}: moves
/freeze-repro off
```

Each case is the plain picture with exactly one thing added; the mod's test checks that.

**Expected**

The picture animates in every case, as it does in a browser.

**Environment**

- Claude desktop for Windows, build 5.11492.5.0 (Electron 45.2.1, Chrome 156), hardware acceleration on
- Claude Code 2.1.325
- Windows 11, Intel Arc 140T, display scale 150%
- System reduced motion off; other animated backdrops (theme-examples) run

**What was checked**

- About 150 test pictures were shown as the backdrop and the app's main renderer process was measured for each: a moving picture keeps it at 30 to 100% of a core, a still one at 0 to 24%. The table is in `docs/measurements.md` of the repository above. The scene that started this was also checked by eye: still with a class named `vb`, moving with that class renamed and nothing else changed.
- The bundled scrub leaves the `<style>` text byte for byte as it was, and gives the same output on every call.
- Neither the app's page bundle nor the CLI has code that looks for these units or keywords, as far as a text search shows.
- The frame's document, built the same way in a plain browser, parses the stylesheet fully and runs every animation.

**Not known**

Why. Everything on the list makes an SVG's rendering depend on the size or resolution it is drawn at, and the false match on a class named `.vb` suggests something is recognising unit names in the stylesheet rather than resolved lengths. That is a guess.

Two readings in about seventy went the other way (a listed trigger, and the picture moved once), so the effect may not be certain on every load.

Measured on one machine and one build.
