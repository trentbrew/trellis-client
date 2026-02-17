import { createServer } from 'node:net'

/**
 * Find an available port starting from the given port number.
 * Increments by 1 until an available port is found.
 * Never falls back to port 3000.
 */
export async function findAvailablePort(startPort: number, maxAttempts = 100): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    const isAvailable = await isPortAvailable(port)
    if (isAvailable) {
      return port
    }
  }
  throw new Error(`No available port found after ${maxAttempts} attempts starting from ${startPort}`)
}

/**
 * Check if a port is available by attempting to bind to it.
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false)
      } else {
        resolve(false)
      }
    })
    
    server.once('listening', () => {
      server.close(() => {
        resolve(true)
      })
    })
    
    server.listen(port, '127.0.0.1')
  })
}
