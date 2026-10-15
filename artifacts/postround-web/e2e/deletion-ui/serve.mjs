// Bundle the real component with test-only SDK/router adapters. No fixture switch
// is shipped in application code, and the server listens only on loopback.
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.resolve(here, '../../../api-server/package.json'))
const { build } = require('esbuild')
const result = await build({
  entryPoints: [path.join(here, 'entry.tsx')],
  absWorkingDir: path.resolve(here, '../..'),
  bundle: true,
  write: false,
  platform: 'browser',
  jsx: 'automatic',
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.NEXT_PUBLIC_POSTROUND_API_BASE_URL': '"http://127.0.0.1:54321"',
    'process.env.NEXT_PUBLIC_POSTROUND_ALLOW_LOCAL_API': '"true"',
  },
  plugins: [{
    name: 'offline-deletion-adapters',
    setup(builder) {
      builder.onResolve({ filter: /^(next\/navigation|next\/link|@\/lib\/supabase\/client)$/ },
        () => ({ path: path.join(here, 'adapters.tsx') }))
    },
  }],
})
http.createServer((req, res) => {
  if (req.url === '/component.js') {
    res.writeHead(200, { 'content-type': 'application/javascript' })
    res.end(result.outputFiles[0].contents)
    return
  }
  res.writeHead(200, { 'content-type': 'text/html' })
  res.end('<!doctype html><html><body><div id="root"></div><script src="/component.js"></script></body></html>')
}).listen(3101, '127.0.0.1')
