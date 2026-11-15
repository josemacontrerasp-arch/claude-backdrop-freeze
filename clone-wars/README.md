# Clone Wars backdrop

Animated pixel-art scenes behind the chat in the Claude Code desktop app. There are two:

- **The space battle.** Original ship designs: long white wedges with red chevrons on the left, tan and rust crescent cruisers with swarms of beetle-like droid fighters on the right, and a blue planet in the bottom right corner.
- **Fireworks.** The Claude mascot, drawn exactly as its logo, asleep on a hill at night. A firework drops in beside it, it wakes, lights it, and it bursts into "PEPE USE MORE TOKENS". It cheers, nods off again, and it repeats every 32 seconds.

## Use

- `/clone-wars battle` and `/clone-wars fireworks` pick the scene, show it, and keep the pick.
- `/clone-wars on` shows the backdrop; `/clone-wars off` takes it away. Off stays off in later sessions until you turn it on again.
- `/clone-wars` alone says what is set.
- `/clone-wars check` swaps the scene for a test card of six lettered squares, and asks two things: which squares move, and whether the lower three keep moving once the card's bar is empty. `/clone-wars check frame` and `/clone-wars check image` draw the card one way or the other for that once. `/clone-wars on` brings your scene back.
- `/clone-wars draw frame` or `/clone-wars draw image` picks how the app draws the scene, and keeps the choice. A frame is the default and what Anthropic's theme-examples uses. An image costs more processor time, since each change repaints the whole picture.
- `/clone-wars glass <blur> <opacity>` sets the frost over the scene and keeps it: blur 0 to 64, opacity 0 to 1. `/clone-wars glass 0 0.6` gives hard pixels, `/clone-wars glass 12 0.6` heavy frost, `/clone-wars glass reset` the default (blur 2, opacity 0.6).

## What it does

- Each scene is one SVG animated with CSS: no script, nothing fetched. Every shape is a rect on a 320 by 200 pixel grid.
- In the battle the parts glide by transform and fade by `fill-opacity`. Only what must change at once holds and jumps: which way a fighter faces, which frame of an explosion shows. The stars drift and twinkle, and a glow or a shimmer swells and sinks.
- The art is drawn on a 320 by 200 grid and written out five times as large, as a document of 1600 by 1000, scaled to fill the window and centred: a window of another shape than 16 by 10 loses a strip at two of its edges. Each rect is written a hair larger than its cells so that no seam shows, since a scene may not ask for hard pixel edges (see the next section).
- With reduced motion on, a scene rests in one picture: a composed frame of the battle, or Claude asleep with his Zs.
- The app's panels are frosted with a dark navy tint so the chat stays readable.
- The app holds every backdrop still when it draws without graphics acceleration, or when the system asks for reduced motion. That is the app's rule, not a fault in the scene.
- A session has one backdrop at a time. When another mod ends a short show of its own on a bare window (theme-examples after its fireworks or a preview), this one sets itself again. A theme you apply from another mod is left standing until that mod takes it away, or until you pick a scene here or type `/clone-wars on`.

## What a scene must not contain

Measured in the Windows desktop app (build 5.11492.5.0) on 2026-11-15: a scene with any of these in it shows its first picture and no other there, although the same scene runs in a browser. Why the app does this is not known.

- A length in a unit that depends on the viewport or on a container: `vw`, `vh`, `vi`, `vb`, `vmin`, `vmax`, their `sv`, `lv` and `dv` kin, and `cqw` to `cqmax`. In any rule, used or not, and in a media query.
- A class selector spelled like one of those units, even an empty `.vb{}`. An id, an element or a keyframes rule of that name does nothing.
- `shape-rendering` set to anything but `auto` (`crispEdges`, `geometricPrecision`, `optimizeSpeed`), as an attribute or in any rule, used or not.
- `vector-effect: non-scaling-stroke`.

Lengths in `px`, `em`, `rem` and `%`, media queries on width in `px` or on the color scheme, and `image-rendering` are all fine. The battle stood still for a day because one of its animations was named `vb`, and before that because it asked for `crispEdges`. A test in `tests/` reads every scene for all of the above.

Animating a scene costs about one processor core for as long as the window shows it, the battle more than fireworks.

## Changing the art

- The battle is in `hooks/scene.ts`: the palette at the top, the fighters, bolts and explosion frames as rows of letters, the capital ships as short functions, the four corners of the battle, and the test card at the bottom.
- Fireworks is in `hooks/sleepy.ts`: the story's moments in seconds at the top, then the night, the mascot in parts (twelve units wide, eight tall), the firework and the words. It is built the plain way on purpose: plain groups and rects, with no `<use>`, `<symbol>`, pattern, clip or inner `<svg>`.

`claude plugin test <this folder>` runs the tests in `tests/`.

The mod is installed from this folder and read from it, so an edit here reaches a session after `/reload-plugins`.

A screenshot is no proof that a scene runs on its own: taking one makes the browser draw a new frame, and every new frame moves each animation on to the present.
