import assert from 'node:assert/strict'
import test from 'node:test'
import { highlightsSvg, roundBuddySvg, OVERLAY_SIZE } from './overlay-assets.ts'
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

    const exact = 'Stored "assistant" message & reply.'
    const buddy = roundBuddySvg({ id: 'm1', content: exact, hole_number: 7 })
    assert.match(buddy, /ROUND BUDDY  •  HOLE 7/)
    assert.match(buddy, /Stored &quot;assistant&quot; message &amp; reply\./)
    assert.doesNotMatch(roundBuddySvg({ id: 'm2', content: exact, hole_number: null }), /HOLE/)
    const longText = 'Stay with the shot. '.repeat(40)
    assert.ok(roundBuddySvg({ id: 'm3', content: longText, hole_number: null }).includes('Stay with the shot.'))
    assert.throws(() => roundBuddySvg({ id: 'm4', content: 'Very long. '.repeat(5000), hole_number: null }),
      /too long to fit legibly/)
  } finally {
    globalThis.document = originalDocument
  }
})