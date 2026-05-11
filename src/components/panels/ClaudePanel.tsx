import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { useAppStore } from '../../store/useAppStore'
import SnippetInput from './SnippetInput'
import { PawIcon } from '../KuroCat'
import TermContextMenu from '../TermContextMenu'

export default function ClaudePanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal>()
  const fitRef = useRef<FitAddon>()
  const { project, setClaudeRunning, log } = useAppStore()
  const claudeRunning = useAppStore(s => s.claudeRunning)
  const autoSnippet = useAppStore(s => s.autoSnippet)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; selection: string } | null>(null)
  const autoSnippetRef = useRef(autoSnippet)
  autoSnippetRef.current = autoSnippet  // 클로저 갱신 없이 최신값 참조

  useEffect(() => {
    if (!containerRef.current || !project) return

    const term = new Terminal({
      theme: {
        background: '#0f0f0f',
        foreground: '#d4d4d4',
        cursor: '#7c6af7',
        selectionBackground: '#3a3a5c',
      },
      fontFamily: 'Cascadia Code, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      scrollback: 5000,
    })
    const fit = new FitAddon()
    const links = new WebLinksAddon()
    term.loadAddon(fit)
    term.loadAddon(links)
    term.open(containerRef.current)
    termRef.current = term
    fitRef.current = fit

    // 레이아웃 완료 후 fit (dimensions 에러 방지)
    requestAnimationFrame(() => {
      fit.fit()
      window.kuro.ptyResize('claude', term.cols, term.rows)
      term.focus()
    })

    const offData = window.kuro.onPtyData((id, data) => {
      if (id === 'claude') term.write(data)
    })
    // Cursor extension에서 보내는 에러+코드 수신 → snippet 자동 주입
    const offExternal = window.kuro.onExternalInject(({ code, error, file, lines }) => {
      const attrs = [
        file ? `file="${file}"` : '',
        lines ? `lines="${lines}"` : '',
      ].filter(Boolean).join(' ')

      const parts: string[] = []
      if (file) parts.push(`파일: ${file}${lines ? ` (${lines}줄)` : ''}`)
      parts.push(`<snippet${attrs ? ' ' + attrs : ''}>\n${code.trim()}\n</snippet>`)
      if (error) parts.push(`에러:\n${error.trim()}`)
      parts.push('위 에러를 수정해줘')

      // Bracketed paste로 감싸면 중간 \r이 Enter로 해석되지 않음
      const msg = parts.join('\n')
      window.kuro.ptyWrite('claude', `\x1b[200~${msg}\x1b[201~\r`)
      log('success', `Cursor에서 에러 수신${file ? ` — ${file}${lines ? ':' + lines : ''}` : ''}`)

      // 포커스를 Kuro로 가져옴
      window.focus()
    })

    const offExit = window.kuro.onPtyExit((id, code) => {
      if (id === 'claude') {
        setClaudeRunning(false)
        term.write(`\r\n\x1b[90m[claude exited: ${code}]\x1b[0m\r\n`)
        log('warn', `Claude Code exited (code ${code})`)
      }
    })

    term.onData(data => {
      const lines = data.split('\n')
      const isCodeLike = lines.length >= 3 && (
        /[{};()=>]/.test(data) ||          // 코드 문법 문자
        /^\s+(const|let|var|def|fn|func|import|export|class|if|for)\b/m.test(data) || // 들여쓴 키워드
        /^\s{2,}/m.test(data)              // 들여쓰기 있음
      )
      if (isCodeLike && autoSnippetRef.current) {
        const wrapped = `<snippet>\n${data.trimEnd()}\n</snippet>\n`
        window.kuro.ptyWrite('claude', wrapped)
        log('info', `코드 붙여넣기 → snippet 자동 래핑 (${lines.length}줄)`)
      } else {
        window.kuro.ptyWrite('claude', data)
      }
    })

    window.kuro.ptySpawn({
      id: 'claude',
      cwd: project.path,
      command: 'powershell.exe',
      args: ['-NoLogo', '-NoExit', '-Command', 'claude'],
    }).then(result => {
      if (result.success) {
        setClaudeRunning(true)
        log('success', `Claude Code terminal started in ${project.path}`)
      } else {
        term.write(`\x1b[31mFailed to start terminal: ${result.error}\x1b[0m\r\n`)
        log('error', `Claude terminal spawn failed: ${result.error}`)
      }
    })

    const observer = new ResizeObserver(() => {
      fit.fit()
      window.kuro.ptyResize('claude', term.cols, term.rows)
    })
    observer.observe(containerRef.current)

    return () => {
      offData()
      offExit()
      offExternal()
      observer.disconnect()
      term.dispose()
    }
  }, [project?.path])

  // 스니펫을 Claude PTY에 직접 주입
  const handleSnippetSend = (formatted: string) => {
    // Claude Code는 paste 이벤트 없이 raw 텍스트를 받으므로
    // 개행을 \r\n으로 변환하고 마지막에 Enter 전송
    const encoded = formatted.replace(/\n/g, '\r\n')
    window.kuro.ptyWrite('claude', encoded + '\r')
    log('info', `스니펫 주입: ${formatted.split('\n')[0].slice(0, 60)}…`)
  }

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <PawIcon size={12} className={claudeRunning ? 'text-accent' : 'text-gray-700'} />
        Claude Code
        {claudeRunning && (
          <span className="text-xs font-normal normal-case" style={{ color: 'rgba(240,165,0,0.5)' }}>
            집사 대기 중
          </span>
        )}
        <span className="ml-auto text-gray-700 text-xs font-mono font-normal">{project?.name}</span>
      </div>
      <div className="panel-body">
        <div
          ref={containerRef}
          className="xterm-container"
          onClick={() => termRef.current?.focus()}
          onContextMenu={e => {
            e.preventDefault()
            const sel = termRef.current?.getSelection() ?? ''
            setCtxMenu({ x: e.clientX, y: e.clientY, selection: sel })
          }}
        />
        {ctxMenu && termRef.current && (
          <TermContextMenu
            x={ctxMenu.x} y={ctxMenu.y}
            term={termRef.current} ptyId="claude"
            selection={ctxMenu.selection}
            onClose={() => setCtxMenu(null)}
          />
        )}
      </div>
      <SnippetInput onSend={handleSnippetSend} />
    </div>
  )
}
