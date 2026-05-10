import { useRef, useState, useCallback, useEffect } from 'react'
import Toolbar from '../toolbar/Toolbar'
import ClaudePanel from '../panels/ClaudePanel'
import GeminiPanel from '../panels/GeminiPanel'
import DevServerPanel from '../panels/DevServerPanel'
import ConsolePanel from '../panels/ConsolePanel'

export default function MainLayout() {
  const [colSplit, setColSplit] = useState(62)        // % for left column
  const [rightRowSplit, setRightRowSplit] = useState(58) // % for top-right
  const [bottomSplit, setBottomSplit] = useState(180)  // px for bottom console

  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<null | 'col' | 'right-row' | 'bottom'>(null)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()

    if (dragging.current === 'col') {
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setColSplit(Math.max(30, Math.min(80, pct)))
    } else if (dragging.current === 'right-row') {
      const rightTop = rect.top + 80 // approx toolbar height
      const rightHeight = rect.height - 80 - bottomSplit - 4
      const pct = ((e.clientY - rightTop) / rightHeight) * 100
      setRightRowSplit(Math.max(20, Math.min(80, pct)))
    } else if (dragging.current === 'bottom') {
      const fromBottom = rect.bottom - e.clientY
      setBottomSplit(Math.max(80, Math.min(400, fromBottom)))
    }
  }, [bottomSplit])

  const onMouseUp = useCallback(() => {
    dragging.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const startDrag = (type: 'col' | 'right-row' | 'bottom') => {
    dragging.current = type
    document.body.style.cursor = type === 'col' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Toolbar />

      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
        {/* Main area (above console) */}
        <div className="flex flex-1 overflow-hidden" style={{ marginBottom: bottomSplit + 4 + 'px' }}>
          {/* Left: Claude */}
          <div className="panel overflow-hidden" style={{ width: colSplit + '%' }}>
            <ClaudePanel />
          </div>

          {/* Vertical resize handle */}
          <div
            className="resize-handle-v"
            onMouseDown={() => startDrag('col')}
          />

          {/* Right column */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Top-right: Gemini */}
            <div className="panel overflow-hidden" style={{ height: rightRowSplit + '%' }}>
              <GeminiPanel />
            </div>

            {/* Horizontal resize handle */}
            <div
              className="resize-handle-h"
              onMouseDown={() => startDrag('right-row')}
            />

            {/* Bottom-right: Dev Server */}
            <div className="panel flex-1 overflow-hidden">
              <DevServerPanel />
            </div>
          </div>
        </div>

        {/* Bottom: Console (absolute pinned to bottom) */}
        <div
          className="panel absolute bottom-0 left-0 right-0 border-t border-surface-border"
          style={{ height: bottomSplit + 'px' }}
        >
          {/* Console resize handle */}
          <div
            className="resize-handle-h w-full"
            onMouseDown={() => startDrag('bottom')}
          />
          <ConsolePanel />
        </div>
      </div>
    </div>
  )
}
