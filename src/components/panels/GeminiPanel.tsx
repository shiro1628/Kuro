import { useEffect, useRef, useState } from 'react'
import { useAppStore, type GeminiEntry } from '../../store/useAppStore'
import { PawIcon } from '../KuroCat'

type Mode = 'review' | 'research'

function verdictClass(output: string) {
  if (/SHIP/i.test(output)) return 'verdict-ship'
  if (/NEEDS-FIX/i.test(output)) return 'verdict-fix'
  if (/DISCUSS/i.test(output)) return 'verdict-discuss'
  return ''
}

function VerdictBadge({ output }: { output: string }) {
  if (/SHIP/i.test(output)) return <span className="verdict-ship text-xs">● SHIP</span>
  if (/NEEDS-FIX/i.test(output)) return <span className="verdict-fix text-xs">● NEEDS-FIX</span>
  if (/DISCUSS/i.test(output)) return <span className="verdict-discuss text-xs">● DISCUSS</span>
  return null
}

function EntryCard({ entry }: { entry: GeminiEntry }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-surface-border rounded mb-2 mx-2 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-surface-2 hover:bg-surface-3 transition-colors text-left"
      >
        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
          entry.mode === 'review'
            ? 'bg-purple-900/40 text-purple-300'
            : 'bg-blue-900/40 text-blue-300'
        }`}>
          {entry.mode.toUpperCase()}
        </span>
        <span className="text-xs text-gray-400 flex-1 truncate">{entry.input.slice(0, 60)}{entry.input.length > 60 ? '…' : ''}</span>
        {entry.loading
          ? <span className="status-dot loading flex-shrink-0" />
          : <VerdictBadge output={entry.output} />
        }
        <span className="text-gray-600 text-xs ml-1">
          {entry.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-3 py-2 bg-surface text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
          {entry.loading && !entry.output
            ? <span className="text-gray-600 animate-pulse">Gemini 응답 대기중…</span>
            : entry.output || <span className="text-gray-600">출력 없음</span>
          }
        </div>
      )}
    </div>
  )
}

export default function GeminiPanel() {
  const entries = useAppStore(s => s.geminiEntries)
  const activeId = useAppStore(s => s.activeGeminiId)
  const { addGeminiEntry, appendGeminiChunk, finishGeminiEntry, log } = useAppStore()
  const project = useAppStore(s => s.project)

  const [mode, setMode] = useState<Mode>('review')
  const [input, setInput] = useState('')
  const [diffLoading, setDiffLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const pendingGeminiInput = useAppStore(s => s.pendingGeminiInput)
  const setPendingGeminiInput = useAppStore(s => s.setPendingGeminiInput)

  useEffect(() => {
    if (!pendingGeminiInput) return
    setInput(prev => prev ? prev + '\n\n' + pendingGeminiInput : pendingGeminiInput)
    setPendingGeminiInput(null)
  }, [pendingGeminiInput])

  useEffect(() => {
    const off = window.kuro.onGeminiStream(chunk => {
      if (activeId) appendGeminiChunk(activeId, chunk)
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

    const id = addGeminiEntry({ mode, input: trimmed, output: '', loading: true })
    setInput('')
    log('info', `Gemini ${mode} 요청: ${trimmed.slice(0, 40)}…`)

    const result = await window.kuro.geminiInvoke({ mode, input: trimmed })
    finishGeminiEntry(id)

    if (!result.success && result.error) {
      log('error', `Gemini 오류: ${result.error}`)
    } else {
      log('success', `Gemini ${mode} 완료`)
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
        Gemini
        <span className="font-normal normal-case text-xs" style={{ color: '#555' }}>리뷰 / 리서치</span>
        <button
          onClick={handleDiffReview}
          disabled={!project || diffLoading || !!activeId}
          className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-purple-800/50 text-purple-400 hover:bg-purple-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-normal normal-case"
          title="git diff를 가져와서 Gemini 리뷰 요청"
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
