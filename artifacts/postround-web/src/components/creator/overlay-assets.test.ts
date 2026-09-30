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
    assert.doesNotMatch(svg, /2026-09-09/)
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

test('highlights use authorized fractions only when both values exist and fit beneath the headline', () => {
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        font: '',
        measureText(text: string) { return { width: text.length * Number(this.font.match(/(\d+)px/)?.[1] ?? 16) * .55 } },
      }),
    }),
  } as unknown as Document
  const round = {
    played_at: '2042-11-29',
    player_display_name: 'BirdieDog',
    course_name: 'Fixture Golf Club',
    tees: 'White',
  }
  const stats = {
    total_score: 85, score_to_par: 13, total_putts: 31, birdies: 0,
    fairways_hit: 8, total_fairways: 14, gir_hit: 7, total_gir: 18,
  } as RoundHighlights
  try {
    const full = highlightsSvg('A comeback worth sharing', round, stats)
    const fullText = full.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    for (const expected of ['BirdieDog', 'Fixture Golf Club', 'White tees', 'Score 85', 'To par +13',
      '31 putts', '0 birdies', 'Fairways 8/14', 'GIR 7/18']) assert.ok(fullText.includes(expected), expected)
    assert.doesNotMatch(full, /2042-11-29/)
    assert.doesNotMatch(playerNoteSvg(7, 'BirdieDog', 'A good recovery.'), /2042-11-29/)

    const partial = highlightsSvg('Progress', round, { ...stats, fairways_hit: 0, total_fairways: 9, gir_hit: null })
    assert.match(partial, /Fairways 0\/9/)
    assert.doesNotMatch(partial, /GIR|7\/18/)
    const missing = highlightsSvg('Progress', round, {
      ...stats, fairways_hit: null, total_fairways: 14, gir_hit: 7, total_gir: null,
    })
    assert.doesNotMatch(missing, /Fairways|GIR|Unknown|undefined|null/)

    const long = highlightsSvg(
      'A determined back-nine recovery after a very difficult start at the longest course on the tour',
      { ...round, player_display_name: 'Alexandra BirdieDog Montague',
        course_name: 'The Very Long Championship Golf Course at the Far Eastern Links',
        tees: 'Championship Black and Gold' },
      stats,
    )
    assert.doesNotMatch(long, /2042-11-29/)
    const blocks = [...long.matchAll(/<text x="82" y="(155|253|332)"[^>]*font-size="(\d+)"[^>]*>([\s\S]*?)<\/text>/g)]
    assert.equal(blocks.length, 3)
    assert.deepEqual(blocks.map((block) => Number(block[1])), [155, 253, 332])
    assert.ok(Number(blocks[0][2]) > Number(blocks[1][2]))
    assert.ok(Number(blocks[0][2]) > Number(blocks[2][2]))
    for (const block of blocks) {
      const baselines = [...block[3].matchAll(/<tspan x="82" dy="([\d.]+)">/g)]
      assert.ok(baselines.length > 1, 'long content wraps rather than overflowing horizontally')
      const finalBaseline = Number(block[1]) + baselines.reduce((total, line) => total + Number(line[1]), 0)
      const nextTop = block[1] === '155' ? 253 - 26 : block[1] === '253' ? 332 - 24 : 395
      assert.ok(finalBaseline + Number(block[2]) * .25 < nextTop, 'lines stay above the next block/footer')
    }
  } finally {
    globalThis.document = originalDocument
  }
})