#!/usr/bin/env node
// Reads SVG scenes and says what in each would stop its CSS animation in the Claude desktop app's backdrop frame.
// Usage: node check-scene.mjs <file.svg> [more.svg ...]     Exit code 1 if any file has a finding.
//
// The list comes from measurements on one machine and one build (see ../docs/measurements.md). It is a list of what
// was seen to stop a scene, not a description of what the app does.
import { readFileSync } from 'node:fs'

// Units that depend on the viewport or on a container.
const UNIT = '(?:[sld]?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max))'

export function whatStopsIt(source) {
  const found = []
  const style = [...source.matchAll(/<style[^>]*>([^<]*)<\/style>/g)].map(match => match[1] ?? '').join(' ')
  const classes = new Set()

  for (const match of source.matchAll(/\sclass="([^"]*)"/g)) for (const name of (match[1] ?? '').split(/\s+/)) classes.add(name)
  // Class selectors. A CSS escape spells the same name another way and counts too: resolve the simple ones.
  const plain = style.replace(/\\([0-9a-fA-F]{1,6}) ?/g, (_whole, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))

  for (const match of plain.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) classes.add(match[1] ?? '')
  for (const name of classes) if (new RegExp(`^${UNIT}$`, 'i').test(name)) found.push(`a class named "${name}", which is spelled like a viewport or container unit`)
  // A number written against the unit, as in 1vh or .5cqw: the digit tells it from a class.
  for (const match of style.matchAll(new RegExp(`\\d${UNIT}\\b`, 'gi'))) found.push(`a length in a viewport or container unit: ${match[0]}`)
  for (const match of source.matchAll(/crispEdges|geometricPrecision|optimizeSpeed/gi)) found.push(`shape-rendering other than auto: ${match[0]}`)
  if (/non-scaling-stroke/i.test(source)) found.push('vector-effect: non-scaling-stroke')

  return [...new Set(found)]
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').at(-1))) {
  const files = process.argv.slice(2)
  let bad = 0

  if (files.length === 0) {
    console.error('usage: node check-scene.mjs <file.svg> [more.svg ...]')
    process.exit(2)
  }

  for (const file of files) {
    const found = whatStopsIt(readFileSync(file, 'utf8'))

    if (found.length === 0) {
      console.log(`${file}: nothing that is known to stop it`)
    } else {
      bad += 1
      console.log(`${file}:`)
      for (const line of found) console.log(`  - ${line}`)
    }
  }

  process.exit(bad === 0 ? 0 : 1)
}
