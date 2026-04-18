const { app, BrowserWindow, shell } = require('electron')
const { spawn } = require('node:child_process')
const http = require('node:http')
const net = require('node:net')
const path = require('node:path')

let mainWindow = null
let serverProcess = null

const isDev = Boolean(process.env.ELECTRON_START_URL)

function getProjectRoot() {
  return path.resolve(__dirname, '..')
}

function getPackagedServerEntry() {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      '.output',
      'server',
      'index.mjs',
    )
  }

  return path.join(getProjectRoot(), '.output', 'server', 'index.mjs')
}

function getLessonsDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'lessons')
  }

  return path.join(getProjectRoot(), 'lessons')
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port)
        } else {
          reject(new Error('Could not allocate a localhost port.'))
        }
      })
    })
  })
}

function waitForHttp(url, timeoutMs = 15000) {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    function tryRequest() {
      const request = http.get(url, (response) => {
        response.resume()
        resolve()
      })

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`))
          return
        }

        setTimeout(tryRequest, 150)
      })

      request.setTimeout(1000, () => {
        request.destroy()
      })
    }

    tryRequest()
  })
}

async function startBundledServer() {
  const port = await getAvailablePort()
  const serverEntry = getPackagedServerEntry()

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: app.isPackaged ? process.resourcesPath : getProjectRoot(),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      NITRO_HOST: '127.0.0.1',
      PORT: String(port),
      NITRO_PORT: String(port),
      PYTHONIA_LESSONS_DIR: getLessonsDir(),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  serverProcess.stdout.on('data', (chunk) => {
    console.log(`[pythonia-server] ${chunk.toString().trim()}`)
  })

  serverProcess.stderr.on('data', (chunk) => {
    console.error(`[pythonia-server] ${chunk.toString().trim()}`)
  })

  serverProcess.on('exit', (code, signal) => {
    if (code !== 0 && signal !== 'SIGTERM') {
      console.error(`Pythonia server exited with code ${code ?? signal}`)
    }
  })

  const url = `http://127.0.0.1:${port}`
  await waitForHttp(url)
  return url
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'Pythonia',
    backgroundColor: '#eef2f3',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl)
    return { action: 'deny' }
  })

  mainWindow.loadURL(url)

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

async function boot() {
  const url = process.env.ELECTRON_START_URL || (await startBundledServer())
  createWindow(url)
}

app.whenReady().then(boot).catch((error) => {
  console.error(error)
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && mainWindow) {
    mainWindow.show()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill()
    serverProcess = null
  }
})
