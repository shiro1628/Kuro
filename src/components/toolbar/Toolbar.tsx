import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import KuroCat, { PawIcon } from '../KuroCat'

export default function Toolbar() {
  const { project, claudeRunning, devServerRunning, devServerCommand, autoSnippet, clearProject, toggleAutoSnippet, log } = useAppStore()
  const [serverPort, setServerPort] = useState<number | null>(null)
  const [browserRunning, setBrowserRunning] = useState(false)
  const [browserPort, setBrowserPort] = useState<number | null>(null)
  const [cursorOpen, setCursorOpen] = useState(false)

  useEffect(() => {
    const offReady = window.kuro.onServerReady(port => {
      setServerPort(port)
      log('success', `Kuro HTTP 서버 시작 — localhost:${port} (Cursor 확장 연결 가능)`)
    })
    const offError = window.kuro.onServerError(msg => {
      log('error', `HTTP 서버 오류: ${msg}`)
    })
    const offBrowserUp = window.kuro.onBrowserLaunched(({ port }) => {
      setBrowserRunning(true)
      setBrowserPort(port)
      log('success', `공유 브라우저 시작 — CDP :${port} / Claude Playwright MCP 연결됨`)
    })
    const offBrowserDown = window.kuro.onBrowserStopped(() => {
      setBrowserRunning(false)
      setBrowserPort(null)
      log('info', '공유 브라우저 종료')
    })
    window.kuro.getServerPort().then(setServerPort)
    window.kuro.browserStatus().then(s => { setBrowserRunning(s.running); setBrowserPort(s.port) })

    // Poll Cursor running state every 3s
    const checkCursor = () => window.kuro.cursorRunning().then(setCursorOpen)
    checkCursor()
    const timer = setInterval(checkCursor, 3000)

    return () => { offReady(); offError(); offBrowserUp(); offBrowserDown(); clearInterval(timer) }
  }, [])

  const handleChangeProject = async () => {
    if (browserRunning && project) await window.kuro.browserStop({ projectPath: project.path })
    await window.kuro.ptyKill('claude')
    await window.kuro.ptyKill('devserver')
    clearProject()
  }

  const handleBrowserToggle = async () => {
    if (!project) return
    if (browserRunning) {
      await window.kuro.browserStop({ projectPath: project.path })
      return
    }
    // 이미 실행 중인 Chrome CDP가 있으면 연결, 없으면 직접 실행
    const detected = await window.kuro.browserDetect()
    if (detected.running && detected.endpoint) {
      await window.kuro.browserConnect({ projectPath: project.path, endpoint: detected.endpoint })
      log('info', `실행 중인 Chrome에 연결 — ${detected.endpoint}`)
    } else {
      const url = devServerCommand ? 'http://localhost:3000' : 'about:blank'
      const result = await window.kuro.browserLaunch({ projectPath: project.path, url })
      if (!result.success) log('error', `브라우저 실행 실패: ${result.error}`)
    }
  }

  const handleCompact = () => {
    window.kuro.ptyWrite('claude', '/compact\r')
    log('info', '/compact 전송 → Claude 컨텍스트 압축 요청')
  }

  return (
    <div className="titlebar-drag flex items-center gap-2 px-3 h-11 bg-surface-1 border-b border-surface-border flex-shrink-0"
      style={{ borderBottomColor: '#1a1a1a' }}>

      {/* Logo */}
      <div className="titlebar-nodrag flex items-center gap-2 mr-1 select-none">
        <KuroCat size={22} animate={false} className="opacity-90" />
        <span className="text-white font-bold text-sm tracking-widest uppercase"
          style={{ letterSpacing: '0.2em', textShadow: '0 0 10px rgba(240,165,0,0.3)' }}>
          Kuro
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-surface-border opacity-50" />

      {/* Project path */}
      <div className="titlebar-nodrag flex items-center gap-1.5 bg-surface-2 rounded px-2.5 py-1 text-xs text-gray-500 max-w-xs truncate">
        <PawIcon size={11} className="text-accent opacity-60 flex-shrink-0" />
        <span className="truncate">{project?.name ?? '—'}</span>
      </div>

      {/* Change project */}
      <button
        onClick={handleChangeProject}
        className="titlebar-nodrag px-2 py-1 text-xs text-gray-600 hover:text-gray-300 hover:bg-surface-2 rounded transition-colors"
      >
        변경
      </button>

      <div className="flex-1" />

      {/* Dev server command */}
      {devServerCommand && (
        <span className="titlebar-nodrag text-xs text-gray-700 font-mono">
          {devServerCommand.script}
        </span>
      )}

      {/* Cursor server port */}
      {serverPort && (
        <span
          className="titlebar-nodrag flex items-center gap-1 text-xs font-mono cursor-default"
          style={{ color: 'rgba(240,165,0,0.4)' }}
          title={`Cursor 확장 연결: localhost:${serverPort}`}
        >
          <span className="status-dot running" style={{ width: 5, height: 5 }} />
          :{serverPort}
        </span>
      )}

      {/* Auto-snippet toggle */}
      <button
        onClick={toggleAutoSnippet}
        className={`titlebar-nodrag flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-all duration-150 ${
          autoSnippet
            ? 'text-accent border-accent/40 bg-accent/8'
            : 'text-gray-600 border-surface-border hover:text-gray-400'
        }`}
        title={autoSnippet ? '자동 snippet 래핑 켜짐' : '자동 snippet 래핑 꺼짐'}
      >
        <PawIcon size={11} />
        스니펫
      </button>

      {/* Open in Cursor */}
      <button
        onClick={() => project && window.kuro.cursorOpen({ projectPath: project.path })}
        disabled={!project}
        className={`titlebar-nodrag flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed ${
          cursorOpen
            ? 'text-accent border-accent/40 bg-accent/8'
            : 'text-gray-600 border-surface-border hover:text-gray-300 hover:border-gray-500'
        }`}
        title={cursorOpen ? 'Cursor 실행 중 — 클릭하면 프로젝트 다시 열기' : 'Cursor에서 프로젝트 열기'}
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
        Cursor
      </button>

      {/* Shared browser */}
      <button
        onClick={handleBrowserToggle}
        className={`titlebar-nodrag flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-all duration-150 ${
          browserRunning
            ? 'text-accent border-accent/40 bg-accent/8'
            : 'text-gray-600 border-surface-border hover:text-gray-400'
        }`}
        title={browserRunning
          ? `공유 브라우저 실행 중 — CDP :${browserPort}\nPlaywright MCP가 이 브라우저를 제어합니다\n클릭하면 종료`
          : '공유 브라우저 시작 — Claude와 사용자가 같은 브라우저 공유'}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        {browserRunning ? `브라우저 ●` : '브라우저'}
      </button>

      {/* /compact */}
      <button
        onClick={handleCompact}
        disabled={!claudeRunning}
        className="titlebar-nodrag flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-surface-border text-gray-600 hover:text-accent hover:border-accent/40 transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
        title="컨텍스트 압축 (/compact)"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        compact
      </button>

      {/* Status */}
      <div className="titlebar-nodrag flex items-center gap-3 ml-1">
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className={`status-dot ${claudeRunning ? 'running' : 'idle'}`} />
          Claude
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className={`status-dot ${devServerRunning ? 'running' : 'idle'}`} />
          Dev
        </span>
      </div>
    </div>
  )
}
