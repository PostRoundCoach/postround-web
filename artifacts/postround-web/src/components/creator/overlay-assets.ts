import type { RoundHighlights, RoundSummary, RoundBuddyMessage } from '@/lib/creator-stories/contracts'

const WIDTH = 1080
const HEIGHT = 480
export const OVERLAY_SIZE = { width: WIDTH, height: HEIGHT }

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// Use the browser's own font metrics only when an export is requested.
function wrappedText(text: string, maxWidth: number, maxHeight: number, preferredSize: number) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Text layout is unavailable')
  for (let size = preferredSize; size >= 16; size -= 2) {
    context.font = `600 ${size}px Arial`
    const lines: string[] = []
    for (const paragraph of text.split(/\r\n|\n|\r/)) {
      let line = ''
      for (const word of paragraph.split(/(\s+)/).filter(Boolean)) {
        if (context.measureText(word).width > maxWidth) {
          if (line) { lines.push(line); line = '' }
          for (const character of Array.from(word)) {
            if (context.measureText(line + character).width > maxWidth) { lines.push(line); line = '' }
            line += character
          }
        } else if (context.measureText(line + word).width > maxWidth && line) {
          lines.push(line)
          line = word.trimStart()
        } else line += word
      }
      lines.push(line)
    }
    if (lines.length * size * 1.3 <= maxHeight) return { lines, size }
  }
  throw new Error('This text is too long to fit legibly in a 1080 × 480 image.')
}

function textBlock(text: string, x: number, y: number, width: number, height: number, size: number) {
  const layout = wrappedText(text, width, height, size)
  return `<text x="${x}" y="${y}" fill="#fff" font-family="Arial,sans-serif" font-size="${layout.size}" font-weight="600" xml:space="preserve">${layout.lines.map((line, index) =>
    `<tspan x="${x}" dy="${index === 0 ? 0 : layout.size * 1.3}">${escapeXml(line)}</tspan>`).join('')}</text>`
}

function frame(kind: string, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect x="40" y="40" width="1000" height="400" rx="28" fill="#17251f" fill-opacity=".94"/><rect x="40" y="40" width="1000" height="400" rx="28" fill="none" stroke="#74b58f" stroke-width="2"/><text x="82" y="96" fill="#a8e0b5" font-family="Arial,sans-serif" font-weight="700" font-size="22" letter-spacing="3">Post Round</text><text x="998" y="96" text-anchor="end" fill="#a8e0b5" font-family="Arial,sans-serif" font-size="18">${escapeXml(kind)}</text>${body}<text x="82" y="413" fill="#a8e0b5" font-family="Arial,sans-serif" font-size="18">Play. Learn. Share.</text></svg>`
}

export function highlightsSvg(headline: string, round: RoundSummary, stats: RoundHighlights) {
  const metadata = [round.player_display_name, round.course_name, round.tees && `${round.tees} tees`, round.played_at].filter(Boolean).join('  •  ')
  const facts = [
    stats.total_score !== null && `Score ${stats.total_score}`,
    stats.score_to_par !== null && `To par ${stats.score_to_par > 0 ? '+' : ''}${stats.score_to_par}`,
    stats.total_putts !== null && `${stats.total_putts} putts`,
    stats.birdies !== null && `${stats.birdies} birdies`,
  ].filter(Boolean).join('   •   ')
  return frame('ROUND HIGHLIGHTS', `${textBlock(headline, 82, 164, 916, 112, 43)}
    ${metadata ? textBlock(metadata, 82, 295, 916, 56, 22) : ''}
    ${facts ? textBlock(facts, 82, 360, 916, 32, 21) : ''}`)
}

export function roundBuddySvg(message: RoundBuddyMessage) {
  return frame(message.hole_number === null ? 'ROUND BUDDY' : `ROUND BUDDY  •  HOLE ${message.hole_number}`,
    textBlock(message.content, 82, 164, 916, 224, 34))
}