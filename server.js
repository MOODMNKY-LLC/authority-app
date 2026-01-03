// Disable TLS certificate verification for local development with self-signed certs
// This is safe for local dev only - DO NOT use in production
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

// Clear Next.js lock file if it exists (prevents "another instance running" error)
const lockPath = path.join(__dirname, '.next', 'dev', 'lock')
if (fs.existsSync(lockPath)) {
  try {
    fs.unlinkSync(lockPath)
    console.log('⚠️  Removed stale Next.js lock file')
  } catch (err) {
    console.warn('⚠️  Could not remove lock file (may be locked by another process):', err.message)
  }
}

// Next.js 16: Don't pass hostname/port to next() - those are for the HTTP server
// The custom HTTPS server handles hostname/port binding
const app = next({ dev })
const handle = app.getRequestHandler()

// Check if certificates exist
const keyPath = path.join(__dirname, 'certs', 'key.pem')
const certPath = path.join(__dirname, 'certs', 'cert.pem')

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('❌ SSL certificates not found!')
  console.error(`   Expected key: ${keyPath}`)
  console.error(`   Expected cert: ${certPath}`)
  console.error('\n📝 To generate certificates, run:')
  console.error('   mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 10.3.0.94 ::1')
  console.error('\n   Or install mkcert first: https://github.com/FiloSottile/mkcert')
  process.exit(1)
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
  // Ensure TLS 1.2+ is used
  minVersion: 'TLSv1.2',
  // Allow self-signed certificates (for client connections)
  rejectUnauthorized: false,
}

console.log('🔄 Preparing Next.js app...')
app.prepare().then(() => {
  console.log('✅ Next.js app prepared successfully')
  
  const server = createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('❌ Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use!`)
      console.error('   Please stop the process using this port or use a different port:')
      console.error(`   PORT=3001 pnpm dev:https`)
      process.exit(1)
    } else {
      console.error('❌ Server error:', err)
      console.error('   Error details:', err.message, err.code, err.stack)
      process.exit(1)
    }
  })
  
  server.on('listening', () => {
    const address = server.address()
    console.log('\n✅ HTTPS Server Started Successfully!\n')
    console.log(`🌐 Server listening on:`, address)
    console.log(`🌐 Local:    https://localhost:${port}`)
    console.log(`🌐 Network:  https://127.0.0.1:${port}`)
    console.log(`🌐 Network:  https://10.3.0.94:${port}`)
    console.log(`\n⚠️  Note: You may see a browser security warning for self-signed certificates.`)
    console.log(`   Click "Advanced" → "Proceed to localhost" to continue.\n`)
  })
  
  server.on('request', (req, res) => {
    console.log(`📥 ${req.method} ${req.url} - Connection from ${req.socket.remoteAddress}`)
  })
  
  server.on('connection', (socket) => {
    console.log(`🔌 New connection from ${socket.remoteAddress}:${socket.remotePort}`)
  })
  
  server.on('secureConnection', (tlsSocket) => {
    console.log(`🔒 Secure connection established from ${tlsSocket.remoteAddress}`)
  })
  
  server.on('tlsClientError', (err, tlsSocket) => {
    console.error('❌ TLS Client Error:', err.message)
    console.error('   Error code:', err.code)
    console.error('   From:', tlsSocket.remoteAddress)
  })
  
  server.on('clientError', (err, socket) => {
    console.error('❌ Client Error:', err.message)
    console.error('   Error code:', err.code)
    if (socket.remoteAddress) {
      console.error('   From:', socket.remoteAddress)
    }
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
  })
  
  console.log(`🔄 Starting HTTPS server on ${hostname}:${port}...`)
  server.listen(port, hostname, () => {
    // Callback fires when server starts listening
    // Actual address info is logged in 'listening' event
    console.log(`✅ Server.listen() callback fired`)
  })
}).catch((err) => {
  console.error('❌ Failed to prepare Next.js app:', err)
  console.error('   Error details:', err.message, err.stack)
  process.exit(1)
})
