import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAppStore, type AgyEntry } from '../../store/useAppStore'
import { PawIcon } from '../KuroCat'

type Mode = 'review' | 'research'

function VerdictBadge({ output }: { output: string }) {
  if (/SHIP/i.test(output)) return <span className="verdict-ship text-xs">● SHIP</span>
  if (/NEEDS-FIX/i.test(output)) return <span className="verdict-fix text-xs">● NEEDS-FIX</span>
  if (/DISCUSS/i.test(output)) return <span className="verdict-discuss text-xs">● DISCUSS</span>
  return null
}

const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h2: ({children}) => <h2 className="text-gray-100 font-bold text-sm mt-4 mb-1.5 first:mt-0 border-b border-surface-border pb-1">{children}</h2>,
  h3: ({children}) => <h3 className="text-gray-200 font-semibold text-xs mt-3 mb-1">{children}</h3>,
  p: ({children}) => <p className="mb-2 text-gray-300 leading-relaxed">{children}</p>,
  ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1 text-gray-300">{children}</ul>,
  ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-gray-300">{children}</ol>,
  li: ({children}) => <li className="text-gray-300">{children}</li>,
  code: ({children, className}) => className
    ? <code className="block bg-surface-2 rounded p-2 my-1.5 font-mono text-green-400 overflow-x-auto whitespace-pre text-xs">{children}</code>
    : <code className="bg-surface-2 rounded px-1 font-mono text-green-400 text-xs">{children}</code>,
  pre: ({children}) => <>{children}</>,
  strong: ({children}) => <strong className="text-gray-100 font-semibold">{children}</strong>,
  blockquote: ({children}) => <blockquote className="border-l-2 border-yellow-600/50 pl-2 my-1.5 text-yellow-300/70 italic">{children}</blockquote>,
  a: ({href, children}) => <a href={href} className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noreferrer">{children}</a>,
}

function ExpandModal({ entry, onClose }: { entry: AgyEntry; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleSendToClaude = () => {
    const msg = `다음 ${entry.mode === 'review' ? '코드 리뷰' : '리서치'} 결과를 참고해서 수정해줘:\n\n${entry.output}`
    window.kuro.ptyWrite('claude', `\x1b[200~${msg}\x1b[201~`)
    setSent(true)
    setTimeout(() => { setSent(false); onClose() }, 800)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface-1 border border-surface-border rounded-lg flex flex-col"
        style={{ width: '80vw', maxWidth: 900, height: '80vh' }}>
        {/* Modal header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-border flex-shrink-0">
          <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
            entry.mode === 'review' ? 'bg-purple-900/40 text-purple-300' : 'bg-blue-900/40 text-blue-300'
          }`}>{entry.mode.toUpperCase()}</span>
          <span className="text-xs text-gray-400 flex-1 truncate">{entry.input.slice(0, 80)}{entry.input.length > 80 ? '…' : ''}</span>
          <VerdictBadge output={entry.output} />
          <button
            onClick={onClose}
            className="ml-2 text-gray-600 hover:text-gray-300 text-lg leading-none transition-colors"
            title="닫기 (Esc)"
          >✕</button>
        </div>
        {/* Modal body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-300 leading-relaxed">
          <ReactMarkdown components={mdComponents}>{entry.output}</ReactMarkdown>
        </div>
        {/* Modal footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-surface-border flex-shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-surface-border text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
          >
            {copied ? (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 복사됨</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 복사</>
            )}
          </button>
          <button
            onClick={handleSendToClaude}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            {sent ? (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> 전송됨</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Claude로 전송</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function EntryCard({ entry }: { entry: AgyEntry }) {
  const [expanded, setExpanded] = useState(true)
  const [modal, setModal] = useState(false)

  return (
    <>
      {modal && <ExpandModal entry={entry} onClose={() => setModal(false)} />}
      <div className="border border-surface-border rounded mb-2 mx-2 overflow-hidden">
        <div className="w-full flex items-center gap-2 px-3 py-2 bg-surface-2 hover:bg-surface-3 transition-colors">
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${
              entry.mode === 'review' ? 'bg-purple-900/40 text-purple-300' : 'bg-blue-900/40 text-blue-300'
            }`}>{entry.mode.toUpperCase()}</span>
            <span className="text-xs text-gray-400 flex-1 truncate min-w-0">{entry.input.slice(0, 60)}{entry.input.length > 60 ? '…' : ''}</span>
          </button>
          {entry.loading
            ? <span className="status-dot loading flex-shrink-0" />
            : <VerdictBadge output={entry.output} />
          }
          <span className="text-gray-600 text-xs flex-shrink-0">
            {entry.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!entry.loading && entry.output && (
            <button
              onClick={() => setModal(true)}
              className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0"
              title="전체 화면으로 보기"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)} className="text-gray-600 text-xs flex-shrink-0">{expanded ? '▲' : '▼'}</button>
        </div>

        {expanded && (
          <div className="px-3 py-2 bg-surface text-xs text-gray-300 max-h-72 overflow-y-auto leading-relaxed">
            {entry.loading && !entry.output
              ? <span className="text-gray-600 animate-pulse">Antigravity 응답 대기중…</span>
              : entry.output
                ? <ReactMarkdown components={mdComponents}>{entry.output}</ReactMarkdown>
                : <span className="text-gray-600">출력 없음</span>
            }
          </div>
        )}
      </div>
    </>
  )
}

export default function AgyPanel() {
  const entries = useAppStore(s => s.agyEntries)
  const activeId = useAppStore(s => s.activeAgyId)
  const { addAgyEntry, appendAgyChunk, finishAgyEntry, log } = useAppStore()
  const project = useAppStore(s => s.project)

  const [mode, setMode] = useState<Mode>('review')
  const [input, setInput] = useState('')
  const [diffLoading, setDiffLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const pendingAgyInput = useAppStore(s => s.pendingAgyInput)
  const setPendingAgyInput = useAppStore(s => s.setPendingAgyInput)

  useEffect(() => {
    if (!pendingAgyInput) return
    setInput(prev => prev ? prev + '\n\n' + pendingAgyInput : pendingAgyInput)
    setPendingAgyInput(null)
  }, [pendingAgyInput])

  useEffect(() => {
    const off = window.kuro.onAgyStream(chunk => {
      if (activeId) appendAgyChunk(activeId, chunk)
    })
    return off
  }, [activeId])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [entries])

  const handleDiffReview = async () => {
    if (!project || diffLoading || !!activeId) return
    setDiffLoading(true)
    try {
      const { diff, empty } = await window.kuro.gitDiff(project.path)
      if (empty) {
        log('warn', 'git diff: 변경사항 없음')
        return
      }
      setMode('review')
      setInput(`아래 git diff를 코드 리뷰해줘. 버그, 보안 이슈, 개선점 위주로.\n\n${diff}`)
    } finally {
      setDiffLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || activeId) return

    const id = addAgyEntry({ mode, input: trimmed, output: '', loading: true })
    setInput('')
    log('info', `Antigravity ${mode} 요청: ${trimmed.slice(0, 40)}…`)

    const result = await window.kuro.agyInvoke({ mode, input: trimmed })
    finishAgyEntry(id)

    if (!result.success && result.error) {
      log('error', `Antigravity 오류: ${result.error}`)
    } else {
      log('success', `Antigravity ${mode} 완료`)
    }
  }

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          className={activeId ? 'text-accent animate-tail-wag' : 'text-gray-700'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        Antigravity
        <span className="font-normal normal-case text-xs" style={{ color: '#555' }}>리뷰 / 리서치</span>
        <button
          onClick={handleDiffReview}
          disabled={!project || diffLoading || !!activeId}
          className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-purple-800/50 text-purple-400 hover:bg-purple-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-normal normal-case"
          title="git diff를 가져와서 Antigravity 리뷰 요청"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {diffLoading ? '로딩…' : '변경사항 리뷰'}
        </button>
        {activeId && (
          <span className="ml-2 text-xs font-normal normal-case animate-pulse" style={{ color: 'rgba(240,165,0,0.6)' }}>
            생각 중…
          </span>
        )}
      </div>

      {/* Entry list */}
      <div ref={listRef} className="flex-1 overflow-y-auto py-2 min-h-0">
        {entries.length === 0 ? (
          <p className="text-center text-gray-700 text-xs py-8">
            아래에서 리뷰 또는 리서치 요청을 입력하세요
          </p>
        ) : (
          entries.map(e => <EntryCard key={e.id} entry={e} />)
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-surface-border p-2 flex flex-col gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode('review')}
            className={`flex-1 py-1 text-xs rounded transition-colors ${
              mode === 'review'
                ? 'bg-purple-900/50 text-purple-300 border border-purple-800'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            Review
          </button>
          <button
            type="button"
            onClick={() => setMode('research')}
            className={`flex-1 py-1 text-xs rounded transition-colors ${
              mode === 'research'
                ? 'bg-blue-900/50 text-blue-300 border border-blue-800'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            Research
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <textarea
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as any)
              }
            }}
            placeholder={mode === 'review' ? '리뷰할 코드나 변경사항… (Shift+Enter 줄바꿈)' : '조사할 내용… (Shift+Enter 줄바꿈)'}
            rows={3}
            disabled={!!activeId}
            style={{ minHeight: '60px', maxHeight: '300px' }}
            className="w-full bg-surface-2 border border-surface-border rounded px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600 resize-y focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!!activeId || !input.trim()}
            className="w-full py-1.5 bg-accent hover:bg-accent-dim text-white text-xs rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </div>
      </form>
    </div>
  )
}
