# Measurements

Every number here is the share of one processor core used by the app's main renderer process while a picture was up as the backdrop, over 4 to 5 seconds, after 2.5 to 3 seconds for it to load.
How that was done, and why it is a fair reading of "does it move", is in [how-it-was-measured.md](how-it-was-measured.md).

- Machine: Windows 11, Intel Arc 140T graphics, display at 150% scale.
- App: Claude desktop, build 5.11492.5.0 (Electron 45.2.1, Chrome 156). Hardware acceleration on.
- Date: 2026-11-15. One machine, one build, one afternoon.

With no backdrop at all the same process read 5 to 9 (once 23, while the app was busy with something else).

## Three test pictures

| Picture | What it is | Moves | Stands still |
|---|---|---|---|
| A | 900 small squares in three groups that slide | 28 to 68 | 0 to 23 |
| B | 900 small squares that each fade in and out | 72 to 83 | 11 to 24 |
| C | the repro mod's picture | 42 to 100 | 6 to 21 |

The ranges come from many runs with different amounts of other activity in the app. Inside one run, a picture that moved always read well above the ones that stood still.

## What stops a picture

Each row is the plain picture with only that one thing added. Readings are listed in the order they were taken.

| Added | Picture | Readings | Verdict |
|---|---|---|---|
| nothing | A | 28, 42, 39, 39, 35, 56, 54, 55, 41, 54, 52, 68, 54, 56, 58, 52 | moves |
| nothing | B | 79, 72, 83, 75, 74 | moves |
| nothing | C | 83, 61, 51, 42, 100 | moves |
| `.vb{}` | A | 32, 8, 4, 19 | still, three times in four |
| `.vb{}` with one more empty rule for a harmless class | A | 9, 9, 8, 11, 0, 15, 10, 8, 15 | still |
| `.vb{}` | B | 12 | still |
| `.vb{}` | C | 10, 21 | still |
| `.vh{}` | A | 7, 23 | still |
| `.vw{}` | A | 6 | still |
| `.vi{}` | A | 8 | still |
| `.vmin{}` | A | 21 | still |
| `.vmax{}` | A | 18 | still |
| `.svh{}` | A | 19 | still |
| `.dvh{}` | A | 19 | still |
| `.lvb{}` | A | 18 | still |
| `.cqw{}` | A | 14 | still |
| `.zz{stroke-width:1vh}` (no element has class zz) | A | 19 | still |
| `.unused{stroke-width:1vh}` | C | 10 | still |
| `.s0{stroke-width:1vh}` (a class the picture uses) | A | 13 | still |
| `@media (min-width:10vw){.zz{fill:red}}` | A | 15 | still |
| `.zz{stroke-width:1cqw}` | A | 18 | still |
| `.unused{stroke-width:1cqw}` | C | 8 | still |
| `shape-rendering="crispEdges"` on the root | A | 14 | still |
| `shape-rendering="crispEdges"` on the root | B | 13, 19 | still |
| `shape-rendering="crispEdges"` on the root | C | 11 | still |
| `svg{shape-rendering:crispEdges}` | B | 11 | still |
| `.zz{shape-rendering:crispEdges}` (unused rule) | B | 13 | still |
| `shape-rendering="geometricPrecision"` on the root | B | 11 | still |
| `shape-rendering="geometricPrecision"` on the root | C | 13 | still |
| `shape-rendering="optimizeSpeed"` on the root | B | 52, 15, 13, 24 | still, three times in four |
| `shape-rendering="optimizeSpeed"` on the root | C | 10, 6, 8 | still |
| `rect{vector-effect:non-scaling-stroke}` | B | 11 | still |
| `.unused{vector-effect:non-scaling-stroke}` | C | 13 | still |

Two readings on this list went the other way: the very first `.vb{}` on picture A (32) and the first `optimizeSpeed` on picture B (52). Every repeat of both stood still. So on each load the effect is very likely but perhaps not certain.

## Ways of writing the class named `vb`

The base here is a larger picture (a pixel-art scene of about 59,000 characters). It read 55 to 105 when it moved.

| Added | Reading | Verdict |
|---|---|---|
| `.vb{}` | 3 | still |
| `.vb{fill:red}` | 6 | still |
| `.VB{fill:red}` | 24 | still |
| `.v\62 {fill:red}` (the same class, with the b written as an escape) | 4 | still |
| `g.vb{fill:red}` | 3 | still |
| `.zz,.vb{fill:red}` | 4 | still |
| `.vb .zz{fill:red}` | 3 | still |
| `.vb{animation:vb 39s step-end infinite}` | 4 | still |
| the rule and its keyframes at the very start of the stylesheet | 10 | still |
| the rule and its keyframes at the very end of the stylesheet | 6 | still |
| `[class~=vb]{fill:red}` | 62 | moves |
| `vb{fill:red}` (an element selector) | 69 | moves |
| `#vb{fill:red}` | 79 | moves |
| `@keyframes vb{…}` alone | 72, 64 | moves |
| `.zz{animation:vb 39s step-end infinite}` | 84 | moves |
| `.vbx{…}` with `@keyframes vbx` | 82 | moves |
| `.xvb{…}` with `@keyframes xvb` | 91 | moves |
| `.wb{…}` with `@keyframes wb` | 69 | moves |
| `.va{…}`, `.vc{…}`, `.vd{…}`, each with its keyframes, one at a time | 93, 83, 94 | moves |

## What does not stop a picture

| Added | Picture | Reading |
|---|---|---|
| every two-letter class name starting with `a` to `u` or `w` to `z`, as empty rules, in groups of 26 or 52 | A | 51 to 75 |
| the class names `vj` to `vq` | A | 79 |
| `.cw-vb{}` | A | 55 |
| `@keyframes vb`, `#vb{}`, `vb{}`, `[class~=vb]{}` together | A, C | 54, 60 |
| class names that are other units: `ch`, `ic`, `em`, `ex`, `rem`, `lh`, `cap`, `px`, `cm`, `ms`, `deg`, `fr` | A | 48 |
| forty unused empty class rules | A | 32 |
| class names a web app would use: `flex`, `hidden`, `relative`, `block`, `grid`, and ten more | A | 54 |
| `svg{image-rendering:pixelated}` | B | 79 |
| `.zz{width:50%}` | B | 82 |
| `.zz{font-size:2em;stroke-width:1rem}` | B | 84 |
| `@media (min-width:100px){.zz{fill:red}}` | B | 61 |
| `@media (prefers-color-scheme:dark){.zz{fill:red}}` | B | 76 |
| a `viewBox` of 320 by 200 with every length a fifth as large | A | 64 |
| `steps(60)` as the timing of every animation | A | 54 |

Not known either way: the class names `ve`, `vf`, `vg`, `vr` to `vv` and `vx` to `vz`. They were only tested in groups that also held `vh`, `vi` or `vw`.

Also seen to run, by eye, in the same window: scenes with `<use>` and `<symbol>`, pattern fills, clip paths, negative animation delays, resting poses written as attributes, `opacity` animations, and documents of 74,000 characters.

## A whole scene

The scene that started this is a pixel-art space battle of about 74,000 characters with some 90 animated parts.

| Build | Readings | By eye |
|---|---|---|
| with one of its animation classes named `vb` | 17 | "frozen", for a whole day, through every other change tried |
| the same file with that class named `gunb` | 101, 117, 108, 114 | "it moves" |

The two files differ in nothing but four class names (`va` to `vd` became `guna` to `gund`), and of those only `vb` matters.
