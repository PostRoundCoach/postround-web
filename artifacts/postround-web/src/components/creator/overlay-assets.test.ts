import assert from 'node:assert/strict'
import test from 'node:test'
import { highlightsSvg, playerNoteSvg, OVERLAY_SIZE } from './overlay-assets.ts'
import type { RoundHighlights } from '../../lib/creator-stories/contracts.ts'

const originalDocument = globalThis.document
test('overlays use stored content and nullable data without eager canvas work or opaque backgrounds', () => {
  // Importing the module and inspecting the template dimensions never invokes an encoder.
  assert.deepEqual(OVERLAY_SIZE, { width: 1080, height: 480 })
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        font: '',
        measureText(text: string) { return { width: text.length * Number(this.font.match(/(\d+)px/)?.[1] ?? 16) * .55 } },
      }),
    }),
  } as unknown as Document
  try {
    const svg = highlightsSvg('The & comeback <story>', {
      played_at: '2026-09-09', course_name: null, tees: null, player_display_name: null,
    }, { total_score: null, course_par: null, score_to_par: null, total_putts: 0,
      birdies: null } as RoundHighlights)
    assert.match(svg, /width="1080" height="480"/)
    assert.match(svg, /Post Round/)
    assert.match(svg, /Play\. Learn\. Share\./)
    assert.match(svg, /The &amp; comeback &lt;story&gt;/)
    assert.match(svg, /0 putts/)
    assert.doesNotMatch(svg, /Score [0-9]|To par|Unknown|undefined|null/)
    // The frame starts at x=40/y=40; corners are unpainted and retain PNG alpha.
    assert.doesNotMatch(svg, /<rect x="0" y="0"/)

    const exact = 'Just missed the fairway left, nice approach shot, hit the green, beautiful long putt. 25 feet for Birdie.\n\nOne pot.'
    const note = playerNoteSvg(7, 'BirdieDog', exact)
    assert.match(note, /PLAYER NOTE  •  HOLE 7/)
    assert.match(note, /In the words of BirdieDog:/)
    assert.match(note, /Just missed the fairway left/)
    assert.match(note, /25 feet for Birdie\./)
    assert.match(note, /<tspan x="82" dy="[^"]*"><\/tspan><tspan x="82"/)
    assert.match(note, /One pot\./)
    assert.doesNotMatch(note, /assistant message|ROUND BUDDY/)
    assert.match(note, /Play\. Learn\. Share\./)
    assert.doesNotMatch(note, /<rect x="0" y="0"/)
    const longText = 'Stay with the shot. '.repeat(22)
    assert.ok(playerNoteSvg(1, 'Another Player', longText).includes('Stay with the shot.'))
    assert.throws(() => playerNoteSvg(4, 'BirdieDog', 'Very long. '.repeat(5000)),
      /too long to fit legibly/)
    assert.throws(() => playerNoteSvg(4, '', exact), /Player name/)
  } finally {
    globalThis.document = originalDocument
  }
})