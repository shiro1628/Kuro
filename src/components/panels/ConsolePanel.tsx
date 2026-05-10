import { useRef, useEffect } from 'react'
import { useAppStore, type ConsoleEntry } from '../../store/useAppStore'
import { PawIcon } from '../KuroCat'

const typeStyle: Record<ConsoleEntry['type'], string> = {
  info:    'text-blue-400',
  success: 'text-green-400',
  error:   'text-red-400',
  warn:    'text-yellow-400',
}

const typeLabel: Record<ConsoleEntry['type'], string> = {
  info: 'INFO',
  success: 'OK  ',
  error: 'ERR ',
  warn: 'WARN',
}

export default function ConsolePanel() {
  const entries = useAppStore(s => s.consoleEntries)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [entries])

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <PawIcon size={11} className="text-gray-700" />
        Console
        <button
          onClick={() => useAppStore.setState({ consoleEntries: [] })}
          className="ml-auto text-gray-700 hover:text-accent text-xs font-normal normal-case transition-colors"
        >
          clear
        </button>
      </div>
      <div ref={listRef} className="panel-body overflow-y-auto px-2 py-1 font-mono text-xs leading-relaxed">
        {entries.length === 0 ? (
          <span className="text-gray-700">이벤트 없음</span>
        ) : (
          entries.map(e => (
            <div key={e.id} className="flex gap-2 py-0.5">
              <span className="text-gray-700 flex-shrink-0">
                {e.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`flex-shrink-0 ${typeStyle[e.type]}`}>
                {typeLabel[e.type]}
              </span>
              <span className="text-gray-400 break-all">{e.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
