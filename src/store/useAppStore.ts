import { create } from 'zustand'

export interface GeminiEntry {
  id: string
  mode: 'review' | 'research'
  input: string
  output: string
  timestamp: Date
  loading: boolean
}

export interface ConsoleEntry {
  id: string
  timestamp: Date
  type: 'info' | 'success' | 'error' | 'warn'
  message: string
}

interface AppStore {
  project: { path: string; name: string } | null
  devServerCommand: { name: string; script: string } | null
  claudeRunning: boolean
  devServerRunning: boolean
  autoSnippet: boolean       // 코드 붙여넣기 자동 snippet 래핑

  geminiEntries: GeminiEntry[]
  activeGeminiId: string | null

  consoleEntries: ConsoleEntry[]

  setProject: (path: string) => void
  clearProject: () => void
  setDevServerCommand: (cmd: { name: string; script: string } | null) => void
  setClaudeRunning: (v: boolean) => void
  setDevServerRunning: (v: boolean) => void
  toggleAutoSnippet: () => void

  pendingGeminiInput: string | null
  setPendingGeminiInput: (text: string | null) => void

  claudeRestartSignal: number   // 값이 바뀔 때마다 ClaudePanel이 재시작
  restartClaude: () => void

  addGeminiEntry: (entry: Omit<GeminiEntry, 'id' | 'timestamp'>) => string
  appendGeminiChunk: (id: string, chunk: string) => void
  finishGeminiEntry: (id: string) => void

  log: (type: ConsoleEntry['type'], message: string) => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  project: null,
  devServerCommand: null,
  claudeRunning: false,
  devServerRunning: false,
  autoSnippet: true,
  geminiEntries: [],
  activeGeminiId: null,
  pendingGeminiInput: null,
  claudeRestartSignal: 0,
  restartClaude: () => set(s => ({ claudeRestartSignal: s.claudeRestartSignal + 1 })),
  consoleEntries: [],

  setProject: (path) => {
    const name = path.split(/[\\/]/).pop() ?? path
    set({ project: { path, name } })
  },
  clearProject: () => set({ project: null, devServerCommand: null, claudeRunning: false, devServerRunning: false }),
  setDevServerCommand: (cmd) => set({ devServerCommand: cmd }),
  setClaudeRunning: (v) => set({ claudeRunning: v }),
  setDevServerRunning: (v) => set({ devServerRunning: v }),
  toggleAutoSnippet: () => set(s => ({ autoSnippet: !s.autoSnippet })),

  setPendingGeminiInput: (text) => set({ pendingGeminiInput: text }),

  addGeminiEntry: (entry) => {
    const id = crypto.randomUUID()
    set(s => ({
      geminiEntries: [...s.geminiEntries, { ...entry, id, timestamp: new Date() }],
      activeGeminiId: id,
    }))
    return id
  },
  appendGeminiChunk: (id, chunk) => {
    set(s => ({
      geminiEntries: s.geminiEntries.map(e =>
        e.id === id ? { ...e, output: e.output + chunk } : e
      ),
    }))
  },
  finishGeminiEntry: (id) => {
    set(s => ({
      geminiEntries: s.geminiEntries.map(e =>
        e.id === id ? { ...e, loading: false } : e
      ),
      activeGeminiId: null,
    }))
  },

  log: (type, message) => {
    const entry: ConsoleEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message,
    }
    set(s => ({ consoleEntries: [...s.consoleEntries.slice(-500), entry] }))
  },
}))
