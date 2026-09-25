import { spawn } from 'node:child_process'
import { createServer, request as proxyRequest } from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextBin = require.resolve('next/dist/bin/next')
const publicPort = Number(process.env.PORT)
const nextPort = publicPort + 1
let nextReady = false

// The workspace provides the public anon key as SUPABASE_ANON_KEY. Next.js
// needs the NEXT_PUBLIC name when it starts so the browser and server use the
// same project. Never substitute a service-role key here.
const previewEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  PORT: String(nextPort),
}

if (!Number.isInteger(publicPort) || publicPort <= 0 || publicPort >= 65535) {
  throw new Error('PORT must be an integer between 1 and 65534')
}

const next = spawn(
  process.execPath,
  [nextBin, 'dev', '-p', String(nextPort), '-H', '127.0.0.1'],
  { env: previewEnv, stdio: 'inherit' },
)

const startingPage = Buffer.from(
  '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="1"><title>Starting Post Round Coach</title></head><body>Starting Post Round Coach…</body></html>',
)

function sendStartingPage(response) {
  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-length': startingPage.length,
    'content-type': 'text/html; charset=utf-8',
  })
  response.end(startingPage)
}

function proxy(request, response) {
  const upstream = proxyRequest(
    {
      hostname: '127.0.0.1',
      port: nextPort,
      method: request.method,
      path: request.url,
      headers: request.headers,
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers)
      upstreamResponse.pipe(response)
    },
  )
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(503, { 'retry-after': '1' })
    response.end('Preview is starting')
  })
  request.pipe(upstream)
}

const server = createServer((request, response) => {
  if (!nextReady && request.method === 'GET' && request.url === '/') {
    sendStartingPage(response)
    return
  }
  proxy(request, response)
})

server.on('upgrade', (request, socket, head) => {
  const upstream = proxyRequest({
    hostname: '127.0.0.1',
    port: nextPort,
    method: request.method,
    path: request.url,
    headers: request.headers,
  })
  upstream.on('upgrade', (response, upstreamSocket, upstreamHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers)
        .map(([name, value]) => `${name}: ${value}`)
        .join('\r\n')}\r\n\r\n`,
    )
    if (upstreamHead.length) socket.write(upstreamHead)
    if (head.length) upstreamSocket.write(head)
    upstreamSocket.pipe(socket).pipe(upstreamSocket)
  })
  upstream.on('error', () => socket.destroy())
  upstream.end()
})

server.listen(publicPort, '0.0.0.0', () => {
  console.log(`Preview startup proxy listening on port ${publicPort}`)
})

async function warmRoot() {
  while (!nextReady && next.exitCode === null) {
    try {
      const response = await fetch(`http://127.0.0.1:${nextPort}/`)
      if (response.ok) {
        await response.arrayBuffer()
        nextReady = true
        console.log('Next.js root is compiled and ready')
        return
      }
    } catch {
      // Next.js has not opened its internal port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}

void warmRoot()

function shutdown(signal) {
  server.close()
  next.kill(signal)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
next.on('exit', (code, signal) => {
  server.close(() => process.exit(code ?? (signal ? 1 : 0)))
})