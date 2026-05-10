import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useAppStore } from '../../store/useAppStore'
import TermContextMenu from '../TermContextMenu'

interface TabInfo {
  id: string
  label: string
  ptyId: string
}

let _counter = 0
function newTab(label: string): TabInfo {
  const n = ++_counter
  return { id: `t${n}`, label, ptyId: `devserver-${n}` }
}

// ── per-tab terminal component ───────────────────────────────────────────────

interface TermProps {
  tab: TabInfo
  active: boolean
  projectPath: string
  autoCommand: string | null
}

function TerminalPane({ tab, active, projectPath, autoCommand }: TermProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)
  const { log } = useAppStore()

  // init terminal & PTY once on mount
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const term = new Terminal({
      theme: { background: '#0f0f0f', foreground: '#d4d4d4', cursor: '#4ade80' },
      fontFamily: 'Cascadia Code, Consolas, monospace',
      fontSize: 12,
      lineHeight: 1.4,
      cursorBlink: true,
      scrollback: 5000,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(el)
    termRef.current = term
    fitRef.current = fit

    requestAnimationFrame(() => {
      fit.fit()
      window.kuro.ptyResize(tab.ptyId, term.cols, term.rows)
      if (active) term.focus()
    })

    const offData = window.kuro.onPtyData((id, data) => {
      if (id === tab.ptyId) term.write(data)
    })
    const offExit = window.kuro.onPtyExit((id, code) => {
      if (id === tab.ptyId) {
        term.write(`\r\n\x1b[90m[exited: ${code}]\x1b[0m\r\n`)
        log('warn', `[${tab.label}] exited (code ${code})`)
      }
    })
    term.onData(data => window.kuro.ptyWrite(tab.ptyId, data))

    const observer = new ResizeObserver(() => {
      fit.fit()
      window.kuro.ptyResize(tab.ptyId, term.cols, term.rows)
    })
    observer.observe(el)

    const args = autoCommand
      ? ['-NoLogo', '-NoExit', '-Command', autoCommand]
      : ['-NoLogo']

    window.kuro.ptySpawn({ id: tab.ptyId, cwd: projectPath, command: 'powershell.exe', args })
      .then(r => {
        if (r.success) {
          log('success', `[${tab.label}] started`)
        } else {
          term.write(`\x1b[31mFailed: ${r.error}\x1b[0m\r\n`)
          log('error', `[${tab.label}] spawn failed: ${r.error}`)
        }
      })

    return () => {
      offData()
      offExit()
      observer.disconnect()
      window.kuro.ptyKill(tab.ptyId)
      term.dispose()
    }
  }, [])

  // re-fit & focus when tab becomes active
  useEffect(() => {
    if (!active) return
    requestAnimationFrame(() => {
      fitRef.current?.fit()
      if (fitRef.current && termRef.current) {
        window.kuro.ptyResize(tab.ptyId, termRef.current.cols, termRef.current.rows)
      }
      termRef.current?.focus()
    })
  }, [active])

  return (
    <>
      <div
        ref={containerRef}
        className="xterm-container"
        style={{ display: active ? 'block' : 'none' }}
        onClick={() => termRef.current?.focus()}
        onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }) }}
      />
      {ctxMenu && termRef.current && active && (
        <TermContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          term={termRef.current} ptyId={tab.ptyId}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  )
}

// ── panel ────────────────────────────────────────────────────────────────────

export default function DevServerPanel() {
  const { project, devServerCommand, log } = useAppStore()

  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [activeId, setActiveId] = useState<string>('')

  // create initial tab when project opens
  useEffect(() => {
    if (!project) return
    _counter = 0
    const first = newTab(devServerCommand?.name ?? 'terminal')
    setTabs([first])
    setActiveId(first.id)
  }, [project?.path])

  const addTab = () => {
    const tab = newTab('terminal')
    setTabs(prev => [...prev, tab])
    setActiveId(tab.id)
  }

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id)
      if (activeId === id) setActiveId(next[next.length - 1]?.id ?? '')
      return next
    })
  }

  if (!project || tabs.length === 0) return null

  return (
    <div className="panel h-full">
      {/* Tab bar */}
      <div
        className="flex items-stretch bg-surface-1 border-b border-surface-border flex-shrink-0 overflow-x-auto"
        style={{ height: 30, minHeight: 30 }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveId(tab.id)}
            className={`flex items-center gap-1.5 px-3 h-full text-xs whitespace-nowrap border-r border-surface-border flex-shrink-0 transition-colors ${
              tab.id === activeId
                ? 'bg-surface text-gray-300'
                : 'text-gray-600 hover:text-gray-400 hover:bg-surface-2'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
              tab.id === activeId ? 'bg-accent' : 'bg-gray-700'
            }`} />
            {tab.label}
            {tabs.length > 1 && (
              <span
                onClick={e => closeTab(e, tab.id)}
                className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity leading-none text-sm"
              >×</span>
            )}
          </button>
        ))}

        <button
          onClick={addTab}
          className="px-2.5 h-full text-gray-600 hover:text-accent hover:bg-surface-2 transition-colors text-base flex-shrink-0"
          title="새 터미널 (terminal)"
        >+</button>

        <div className="flex-1" />

        <button
          className="px-3 h-full text-gray-700 hover:text-accent transition-colors text-xs flex-shrink-0"
          title="현재 탭 재시작"
          onClick={() => {
            const tab = tabs.find(t => t.id === activeId)
            if (!tab) return
            // kill and remove then re-add to force remount
            setTabs(prev => {
              const idx = prev.findIndex(t => t.id === activeId)
              const fresh = newTab(tab.label)
              const next = [...prev]
              next[idx] = fresh
              setActiveId(fresh.id)
              return next
            })
          }}
        >
          restart
        </button>
      </div>

      {/* Terminal panes */}
      <div className="panel-body">
        {tabs.map(tab => (
          <TerminalPane
            key={tab.id}
            tab={tab}
            active={tab.id === activeId}
            projectPath={project.path}
            autoCommand={
              tab.label === (devServerCommand?.name ?? '') && tabs.indexOf(tab) === 0
                ? devServerCommand?.script ?? null
                : null
            }
          />
        ))}
      </div>
    </div>
  )
}
