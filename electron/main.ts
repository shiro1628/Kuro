import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { spawn as spawnChild, type ChildProcess } from 'child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { createServer, type Server } from 'http'
import * as nodePty from 'node-pty'

const KURO_PORT = 7890
const CDP_PORT = 9222
let httpServer: Server | null = null
let browserProc: ChildProcess | null = null
let browserCdpEndpoint: string | null = null

// Find Chrome or Edge on Windows
function findBrowser(): string | null {
  const candidates = [
    join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
    join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
  ]
  return candidates.find(p => existsSync(p)) ?? null
}

let mainWindow: BrowserWindow | null = null
const ptys = new Map<string, nodePty.IPty>()

function createWindow() {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'icon.ico')
    : join(app.getAppPath(), 'resources', 'icon.ico')

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f0f0f',
    icon: existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f0f',
      symbolColor: '#888888',
      height: 32,
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── PTY ────────────────────────────────────────────────────────────────────

ipcMain.handle('pty:spawn', async (_, { id, cwd, command, args }: {
  id: string; cwd: string; command: string; args?: string[]
}) => {
  if (ptys.has(id)) {
    try { ptys.get(id)!.kill() } catch {}
    ptys.delete(id)
  }
  try {
    const npmGlobalBin = join(process.env.APPDATA ?? '', 'npm')
    const currentPath = process.env.PATH ?? ''
    const extendedPath = currentPath.includes(npmGlobalBin)
      ? currentPath
      : `${npmGlobalBin};${currentPath}`

    const pty = nodePty.spawn(command, args ?? [], {
      name: 'xterm-256color',
      cwd,
      env: {
        ...process.env,
        PATH: extendedPath,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      } as Record<string, string>,
      cols: 120,
      rows: 40,
    })
    pty.onData(data => mainWindow?.webContents.send('pty:data', { id, data }))
    pty.onExit(({ exitCode }) => {
      mainWindow?.webContents.send('pty:exit', { id, exitCode })
      ptys.delete(id)
    })
    ptys.set(id, pty)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.on('pty:write', (_, { id, data }: { id: string; data: string }) => {
  ptys.get(id)?.write(data)
})

ipcMain.handle('pty:resize', async (_, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
  try { ptys.get(id)?.resize(cols, rows) } catch {}
})

ipcMain.handle('pty:kill', async (_, { id }: { id: string }) => {
  const pty = ptys.get(id)
  if (pty) {
    // Windows: kill entire process tree so child servers release their ports
    try {
      spawnChild('taskkill', ['/F', '/T', '/PID', String(pty.pid)], { stdio: 'ignore' })
    } catch {}
    try { pty.kill() } catch {}
    ptys.delete(id)
  }
})

// ─── Cursor IDE ─────────────────────────────────────────────────────────────

ipcMain.handle('cursor:open', async (_, { projectPath }: { projectPath: string }) => {
  try {
    spawnChild('cursor', [projectPath], { stdio: 'ignore', detached: true, shell: true }).unref()
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('cursor:running', async () => {
  return new Promise<boolean>(resolve => {
    const child = spawnChild('tasklist', ['/FI', 'IMAGENAME eq Cursor.exe', '/NH', '/FO', 'CSV'], { stdio: 'pipe' })
    let out = ''
    child.stdout?.on('data', (d: Buffer) => { out += d.toString() })
    child.on('close', () => resolve(out.toLowerCase().includes('cursor.exe')))
    child.on('error', () => resolve(false))
  })
})

// ─── Clipboard ──────────────────────────────────────────────────────────────

ipcMain.handle('clipboard:read', () => {
  const { clipboard } = require('electron')
  return clipboard.readText()
})

ipcMain.handle('clipboard:write', (_, text: string) => {
  const { clipboard } = require('electron')
  clipboard.writeText(text)
})

// ─── Dialog ─────────────────────────────────────────────────────────────────

ipcMain.handle('dialog:openFolder', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '프로젝트 폴더 선택',
  })
  return result.canceled ? null : result.filePaths[0]
})

// ─── MCP injection ───────────────────────────────────────────────────────────

function injectMcp(projectPath: string) {
  // Write to top-level mcpServers in ~/.claude.json — no path-matching issues
  const claudeJsonPath = join(homedir(), '.claude.json')

  let root: Record<string, any> = {}
  if (existsSync(claudeJsonPath)) {
    try { root = JSON.parse(readFileSync(claudeJsonPath, 'utf-8')) } catch {}
  }

  if (!root.mcpServers) root.mcpServers = {}

  // Windows: use "cmd /c npx" so Claude Code can find npx regardless of PATH
  const playwrightArgs = browserCdpEndpoint
    ? ['/c', 'npx', '-y', '@playwright/mcp@latest', '--cdp-endpoint', browserCdpEndpoint]
    : ['/c', 'npx', '-y', '@playwright/mcp@latest']

  root.mcpServers.playwright = {
    command: 'cmd',
    args: playwrightArgs,
    disabled: false,
  }

  writeFileSync(claudeJsonPath, JSON.stringify(root, null, 2), 'utf-8')
  console.log('[mcp:inject] playwright →', playwrightArgs.join(' '))
}

ipcMain.handle('mcp:inject', async (_, { projectPath }: { projectPath: string }) => {
  try {
    injectMcp(projectPath)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// ─── Shared browser (CDP) ────────────────────────────────────────────────────

// Check if a CDP endpoint is already reachable
ipcMain.handle('browser:detect', async () => {
  try {
    const { request } = await import('http')
    const reachable = await new Promise<boolean>(resolve => {
      const req = request({ host: '127.0.0.1', port: CDP_PORT, path: '/json/version', timeout: 800 }, res => {
        resolve(res.statusCode === 200)
      })
      req.on('error', () => resolve(false))
      req.on('timeout', () => { req.destroy(); resolve(false) })
      req.end()
    })
    return { running: reachable, endpoint: reachable ? `http://localhost:${CDP_PORT}` : null }
  } catch {
    return { running: false, endpoint: null }
  }
})

ipcMain.handle('browser:connect', async (_, { projectPath, endpoint }: { projectPath: string; endpoint: string }) => {
  // Connect Playwright MCP to an already-running browser (user-launched)
  browserCdpEndpoint = endpoint
  if (projectPath) {
    try { injectMcp(projectPath) } catch {}
  }
  mainWindow?.webContents.send('browser:launched', { port: CDP_PORT, url: '', connected: true })
  return { success: true }
})

ipcMain.handle('browser:launch', async (_, { projectPath, url }: { projectPath: string; url?: string }) => {
  // Kill existing browser if any
  if (browserProc) {
    try { browserProc.kill() } catch {}
    browserProc = null
    browserCdpEndpoint = null
  }

  const exe = findBrowser()
  if (!exe) return { success: false, error: 'Chrome / Edge를 찾을 수 없습니다' }

  const userDataDir = join(app.getPath('userData'), 'kuro-browser-profile')
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions-except=',
    url ?? 'about:blank',
  ]

  browserProc = spawnChild(exe, args, { detached: false, stdio: 'ignore' })
  browserCdpEndpoint = `http://localhost:${CDP_PORT}`

  browserProc.on('exit', () => {
    browserProc = null
    browserCdpEndpoint = null
    mainWindow?.webContents.send('browser:stopped')
  })

  // Re-inject MCP with CDP endpoint so Claude connects to this browser
  if (projectPath) {
    try { injectMcp(projectPath) } catch {}
  }

  // Small delay for Chrome to start the CDP server
  await new Promise(r => setTimeout(r, 800))
  mainWindow?.webContents.send('browser:launched', { port: CDP_PORT, url: url ?? '' })

  return { success: true, port: CDP_PORT }
})

ipcMain.handle('browser:stop', async (_, { projectPath }: { projectPath: string }) => {
  if (browserProc) {
    try { browserProc.kill() } catch {}
    browserProc = null
    browserCdpEndpoint = null
  }
  // Re-inject MCP without CDP so it falls back to standalone headed mode
  if (projectPath) {
    try { injectMcp(projectPath) } catch {}
  }
  return { success: true }
})

ipcMain.handle('browser:status', async () => ({
  running: !!browserProc,
  port: browserCdpEndpoint ? CDP_PORT : null,
}))

// ─── Git diff ────────────────────────────────────────────────────────────────

ipcMain.handle('git:diff', async (_, { projectPath }: { projectPath: string }) => {
  return new Promise<{ diff: string; empty: boolean }>(resolve => {
    // Try uncommitted changes first (staged + unstaged)
    const child = spawnChild('git', ['diff', 'HEAD'], { cwd: projectPath, stdio: 'pipe' })
    let out = ''
    child.stdout?.on('data', (d: Buffer) => { out += d.toString() })
    child.on('close', code => {
      if (out.trim()) return resolve({ diff: out, empty: false })
      // No uncommitted changes — fall back to last commit
      const child2 = spawnChild('git', ['show', 'HEAD', '--format=commit %H%n%s%n', '-p'], { cwd: projectPath, stdio: 'pipe' })
      let out2 = ''
      child2.stdout?.on('data', (d: Buffer) => { out2 += d.toString() })
      child2.on('close', () => resolve({ diff: out2, empty: !out2.trim() }))
      child2.on('error', () => resolve({ diff: '', empty: true }))
    })
    child.on('error', () => resolve({ diff: '', empty: true }))
  })
})

// ─── Dev server detection ────────────────────────────────────────────────────

ipcMain.handle('devserver:detect', async (_, { projectPath }: { projectPath: string }) => {
  try {
    const pkgPath = join(projectPath, 'package.json')
    if (!existsSync(pkgPath)) return null
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const scripts: Record<string, string> = pkg.scripts ?? {}
    for (const name of ['dev', 'start', 'serve', 'preview']) {
      if (scripts[name]) return { name, script: `npm run ${name}` }
    }
    return null
  } catch {
    return null
  }
})

// ─── Gemini invoke ───────────────────────────────────────────────────────────

ipcMain.handle('gemini:invoke', async (_, { mode, input, context }: {
  mode: 'review' | 'research'; input: string; context?: string
}) => {
  return new Promise<{ success: boolean; output: string; error: string }>((resolve) => {
    const isDev = !app.isPackaged
    const scriptPath = isDev
      ? join(app.getAppPath(), 'scripts', 'ask-gemini.ps1')
      : join(process.resourcesPath, 'scripts', 'ask-gemini.ps1')

    const child = spawnChild('powershell.exe', [
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
    ], { stdio: ['pipe', 'pipe', 'pipe'] })

    const payload = JSON.stringify({ mode, input, context: context ?? '' })
    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stdout += text
      mainWindow?.webContents.send('gemini:stream', { chunk: text })
    })
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    child.stdin?.write(payload)
    child.stdin?.end()

    child.on('close', code => resolve({ success: code === 0, output: stdout, error: stderr }))
    child.on('error', err => resolve({ success: false, output: '', error: err.message }))
  })
})

// ─── Local HTTP server (Cursor extension → Kuro) ────────────────────────────

function startHttpServer() {
  httpServer = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method === 'POST' && req.url === '/inject') {
      let body = ''
      req.on('data', chunk => { body += chunk.toString() })
      req.on('end', () => {
        try {
          const payload = JSON.parse(body) as {
            code: string
            error?: string
            file?: string
            lines?: string
          }
          mainWindow?.webContents.send('external:inject', payload)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: true }))
        } catch {
          res.writeHead(400)
          res.end(JSON.stringify({ ok: false, error: 'invalid JSON' }))
        }
      })
      return
    }

    if (req.method === 'GET' && req.url === '/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, version: app.getVersion() }))
      return
    }

    res.writeHead(404)
    res.end()
  })

  httpServer.listen(KURO_PORT, '127.0.0.1', () => {
    mainWindow?.webContents.send('server:ready', { port: KURO_PORT })
  })

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      mainWindow?.webContents.send('server:error', `포트 ${KURO_PORT} 이미 사용 중`)
    }
  })
}

ipcMain.handle('server:getPort', () => KURO_PORT)

// ─── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()
  startHttpServer()
})

app.on('window-all-closed', () => {
  for (const [, pty] of ptys) {
    try { spawnChild('taskkill', ['/F', '/T', '/PID', String(pty.pid)], { stdio: 'ignore' }) } catch {}
    try { pty.kill() } catch {}
  }
  httpServer?.close()
  app.quit()
})
