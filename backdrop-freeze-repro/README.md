# backdrop-freeze-repro

A small mod for the Claude Code desktop app that shows one animated picture behind the chat, with or without one thing that stops it.

```
/plugin install backdrop-freeze-repro --marketplace josemacontrerasp-arch/claude-backdrop-freeze
```

## Use

`/freeze-repro <case>` shows a case. `/freeze-repro off` clears the backdrop.

| Case | What it adds to the plain picture | In the desktop app |
|---|---|---|
| `ok` | nothing | moves |
| `class` | an empty rule for a class named after a viewport unit: `.vb{}` | stands still |
| `unit` | an unused rule with a viewport unit: `.unused{stroke-width:1vh}` | stands still |
| `container` | an unused rule with a container unit: `.unused{stroke-width:1cqw}` | stands still |
| `crisp` | `shape-rendering="crispEdges"` on the root | stands still |
| `geometric` | `shape-rendering="geometricPrecision"` on the root | stands still |
| `speed` | `shape-rendering="optimizeSpeed"` on the root | stands still |
| `stroke` | an unused rule: `.unused{vector-effect:non-scaling-stroke}` | stands still |
| `names` | the name `vb` everywhere but in a class selector: `@keyframes vb`, `#vb{}`, `vb{}`, `[class~=vb]{}` | moves |

The picture has rows of squares that slide, a disc that pulses and a field of dots that drifts. Its label says which case it is and whether it should move, and never spells out what the case adds, so two pictures differ in nothing but the case.

The right-hand column was measured on build 5.11492.5.0 of the desktop app for Windows. Every case runs in a browser.

## Checks

`claude plugin test <this folder>` runs two tests: the command shows and clears the cases, and every case is the plain picture with exactly one thing added.
