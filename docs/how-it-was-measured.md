# How it was measured

The freeze only shows in the real backdrop of the desktop app. The same scene animates in Chrome, in a headless Chrome with the app's pipeline copied step by step, and in the app's own built-in browser. So the only place to test is the app's window, and the question was how to test there without a person watching every picture.

## What did not work

- **Screenshots.** Taking one makes the browser draw a frame, and any frame moves every CSS animation on to the present. Two screenshots of a scene that never draws by itself still differ.
- **Reading `animation.currentTime` from script.** It is worked out from the clock when asked, so it advances whether or not anything is drawn.
- **Asking a person.** It works, and it is how the first clues came (twenty numbered pictures, six seconds each), but it costs two minutes of someone's attention per round.

## What worked

**Drive the pictures from outside.** A mod can read files in its own folder. A few lines in a mod's hooks poll a file and show whatever SVG a script puts beside it: [../tools/bench-hook.md](../tools/bench-hook.md).

**Read the processor, not the screen.** On this machine the backdrop's frame is drawn inside the app's main renderer process, and at a display scale of 150% an SVG's CSS animations run on that process's main thread. So a scene that animates keeps that process busy, and one that stands still leaves it idle. [../tools/bench.ps1](../tools/bench.ps1) shows a picture, waits for it to load, and reads how much processor time each of the app's processes used over the next few seconds.

For one test picture the two states read like this:

| | Main renderer, share of one core |
|---|---|
| no backdrop | 5 to 9 |
| picture stands still | 0 to 24 |
| picture moves | 28 to 100 |

The ranges are across many runs. Inside one run the two never came close. About 150 pictures were measured this way in half an hour.

## What to watch for

- **The window must be on screen.** A covered or minimised window stops drawing, and every picture then reads as still.
- **Use controls in every run.** Put a picture known to move and one known to stand still beside the ones in question. The app's own activity (a reply streaming, a spinner) adds a few points to every reading.
- **Repeat anything surprising.** Two readings in about a hundred and fifty disagreed with their repeats.
- **Give the picture real work.** A single small square sliding costs too little to see. The test pictures here animate 900 rects.
- **The graphics process is no use as a signal.** Its reading swings with everything else on screen.
- **This reads the processor, not the eye.** It was checked against a person's eyes on the scenes that mattered: the battle that stood still and then moved, and twenty numbered pictures. It agreed on all of them.

## Passive signals that also work, outside the app

In a browser you control, these tell whether a document is drawing by itself without making it draw:

- Chrome DevTools Protocol, `Performance.getMetrics`: compare `RecalcStyleCount` a few seconds apart.
- `animationiteration` events on the frame's document, counted by the page that holds the frame.
