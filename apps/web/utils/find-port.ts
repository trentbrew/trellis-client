import { createServer } from 'node:net'
import { execSync } from 'node:child_process'

/**
 * Ensure a specific port is available by killing any process using it.
 * Always returns the requested port (never increments).
 */
export async function ensurePortAvailable(port: number): Promise<number> {
  const isAvailable = await isPortAvailable(port)

  if (!isAvailable) {
    console.log(`⚠️  Port ${port} is in use. Attempting to free it...`)
    killProcessOnPort(port)

    // Verify the port is now available
    const stillInUse = !(await isPortAvailable(port))
    if (stillInUse) {
      throw new Error(`Failed to free port ${port}. Please manually kill the process using this port.`)
    }

    console.log(`✅ Port ${port} is now available`)
  }

  return port
}

/**
 * Kill any process listening on the given port.
 * Uses platform-specific commands (lsof on macOS/Linux, netstat on Windows).
 */
function killProcessOnPort(port: number): void {
  const ownPid = process.pid.toString()
  try {
    const platform = process.platform

    if (platform === 'darwin' || platform === 'linux') {
      // Find and kill process using lsof (check both listening and established states)
      try {
        // Try listening state first, then any connection to the port
        let output = ''
        try {
          output = execSync(`lsof -ti:${port} -sTCP:LISTEN`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
        } catch {
          output = execSync(`lsof -ti:${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
        }
        const pids = output
          .trim()
          .split('\n')
          .filter(Boolean)
          .filter((pid) => pid !== ownPid)

        for (const pid of pids) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
            console.log(`   Killed process ${pid} on port ${port}`)
          } catch {
            // Process may have already exited
          }
        }
      } catch {
        // No process found or lsof failed
      }
    } else if (platform === 'win32') {
      // Windows: use netstat to find PID, then taskkill
      try {
        const output = execSync(`netstat -ano | findstr :${port}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        })
        const lines = output.trim().split('\n')

        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          const pid = parts[parts.length - 1]
          if (pid && !isNaN(Number(pid))) {
            try {
              execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
              console.log(`   Killed process ${pid} on port ${port}`)
            } catch {
              // Process may have already exited
            }
          }
        }
      } catch {
        // No process found or netstat failed
      }
    }

    // Small delay to allow OS to release the port
    execSync('sleep 0.5', { stdio: 'ignore' })
  } catch (err) {
    console.error(`   Failed to kill process on port ${port}:`, err)
  }
}

/**
 * Find an available port starting from the given port number.
 * Increments by 1 until an available port is found.
 * Never falls back to port 3000.
 * @deprecated Use ensurePortAvailable for fixed port behavior
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
