import { useState, useRef } from 'react'

interface Props {
  onSend: (formatted: string) => void
}

export default function SnippetInput({ onSend }: Props) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [question, setQuestion] = useState('')
  const codeRef = useRef<HTMLTextAreaElement>(null)

  const handleOpen = () => {
    setOpen(true)
    setTimeout(() => codeRef.current?.focus(), 50)
  }

  const handleClose = () => {
    setOpen(false)
    setCode('')
    setQuestion('')
  }

  const handleSend = () => {
    const trimmedCode = code.trim()
    if (!trimmedCode) return
    const parts = [`<snippet>\n${trimmedCode}\n</snippet>`]
    if (question.trim()) parts.push(question.trim())
    onSend(parts.join('\n'))
    handleClose()
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-1.5 py-1 text-xs text-gray-700 hover:text-gray-400 hover:bg-surface-2 border-t border-surface-border transition-colors"
        title="코드 붙여넣기 → Claude에 스니펫으로 주입 (파일 전체 읽기 방지)"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        스니펫
      </button>
    )
  }

  return (
    <div className="border-t border-surface-border bg-surface-1 flex flex-col gap-1.5 p-2 flex-shrink-0">
      <textarea
        ref={codeRef}
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="코드 붙여넣기 (Ctrl+V)"
        rows={6}
        className="bg-surface-2 border border-surface-border rounded px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600 font-mono resize-none focus:outline-none focus:border-accent leading-relaxed"
      />
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSend()
            if (e.key === 'Escape') handleClose()
          }}
          placeholder="질문 입력 후 Enter"
          className="flex-1 bg-surface-2 border border-surface-border rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent"
        />
        <button
          onClick={handleSend}
          disabled={!code.trim()}
          className="px-3 py-1 bg-accent hover:bg-accent-dim text-white text-xs rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          전송
        </button>
        <button onClick={handleClose} className="text-gray-600 hover:text-gray-400 text-xs px-1">✕</button>
      </div>
    </div>
  )
}
