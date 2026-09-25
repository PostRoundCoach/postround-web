import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const base = new URL('../../app/(admin)/admin/', import.meta.url)
const source = (path: string) => readFileSync(new URL(path, base), 'utf8')
const overview = source('creator-attribution/page.tsx')
const creator = source('creator-attribution/creators/[id]/page.tsx')
const record = source('creator-attribution/attributions/[id]/page.tsx')
const dashboard = source('page.tsx')
const shell = readFileSync(new URL('../../components/admin/AdminShell.tsx', import.meta.url), 'utf8')

test('all server-rendered attribution pages require verified admin before privileged reads', () => {
  for (const page of [dashboard, overview, creator, record]) {
    assert.match(page, /await requireAdmin\(\)/)
    assert.ok(page.indexOf('await requireAdmin()') < page.indexOf('referralService()'))
    assert.match(page, /force-dynamic/)
  }
  assert.match(shell, /href: '\/admin\/creator-attribution'/)
  assert.match(dashboard, /href="\/admin\/creator-attribution"/)
})

test('detail and inspection have drill-down, separated activity and explicit non-monetary states', () => {
  assert.match(creator, /Unclaimed \(click only\)/)
  assert.match(creator, /\/admin\/creator-attribution\/attributions\/\$\{row.id\}/)
  assert.match(record, /Event ID \(claim evidence; admin only\)/)
  assert.match(record, /a\.attribution_method/)
  assert.match(record, /a\.attribution_source/)
  for (const page of [overview, creator, dashboard]) {
    assert.match(page, /Not configured/)
    assert.doesNotMatch(page, /commission rate|payout total|\$0/i)
  }
})