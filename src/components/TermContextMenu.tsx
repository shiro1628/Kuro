import { useEffect, useRef } from 'react'
import type { Terminal } from '@xterm/xterm'
import { useAppStore } from '../store/useAppStore'

interface Props {
  x: number
  y: number
  term: Terminal
  ptyId: string
  onClose: () => void
}

export default function TermContextMenu({ x, y, term, ptyId, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const setPendingGeminiInput = useAppStore(s => s.setPendingGeminiInput)

  // Close on outside click or Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Adjust position so menu doesn't go off-screen
  const vw = window.innerWidth
  const vh = window.innerHeight
  const menuW = 160
  const menuH = 160
  const left = x + menuW > vw ? vw - menuW - 4 : x
  const top  = y + menuH > vh ? vh - menuH - 4 : y

  const copy = async () => {
    const sel = term.getSelection()
    if (sel) await window.kuro.clipboardWrite(sel)
    onClose()
  }

  const paste = async () => {
    const text = await window.kuro.clipboardRead()
    if (text) window.kuro.ptyWrite(ptyId, text)
    term.focus()
    onClose()
  }

  const selectAll = () => {
    term.selectAll()
    onClose()
  }

  const clear = () => {
    term.clear()
    term.focus()
    onClose()
  }

  const sendToClaude = () => {
    const sel = term.getSelection()
    if (!sel) return
    window.kuro.ptyWrite('claude', sel)
    onClose()
  }

  const sendToGemini = () => {
    const sel = term.getSelection()
    if (!sel) return
    setPendingGeminiInput(sel)
    onClose()
  }

  const hasSel = !!term.getSelection()

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', left, top, zIndex: 9999, minWidth: menuW }}
      className="bg-surface-2 border border-surface-border rounded shadow-lg py-1 text-xs"
      onContextMenu={e => e.preventDefault()}
    >
      <Item label="복사" shortcut="Ctrl+C" onClick={copy} disabled={!hasSel} />
      <Item label="붙여넣기" shortcut="Ctrl+V" onClick={paste} />
      <div className="border-t border-surface-border my-1" />
      <Item label="Claude로 전송" onClick={sendToClaude} disabled={!hasSel}
        accent="claude" />
      <Item label="Gemini로 전송" onClick={sendToGemini} disabled={!hasSel}
        accent="gemini" />
      <div className="border-t border-surface-border my-1" />
      <Item label="전체 선택" shortcut="Ctrl+A" onClick={selectAll} />
      <Item label="지우기" onClick={clear} />
    </div>
  )
}

function Item({
  label, shortcut, onClick, disabled, accent,
}: {
  label: string; shortcut?: string; onClick: () => void; disabled?: boolean; accent?: 'claude' | 'gemini'
}) {
  const activeColor = accent === 'claude'
    ? 'text-accent hover:bg-accent/10'
    : accent === 'gemini'
    ? 'text-gem hover:bg-gem/10'
    : 'text-gray-300 hover:bg-surface-3 hover:text-white'

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-default ${
        disabled ? 'text-gray-700' : activeColor
      }`}
    >
      <span>{label}</span>
      {shortcut && <span className="text-gray-600 ml-4 font-mono">{shortcut}</span>}
    </button>
  )
}
