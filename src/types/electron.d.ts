export {}

declare global {
  interface Window {
    kuro: {
      ptySpawn: (opts: { id: string; cwd: string; command: string; args?: string[] }) => Promise<{ success: boolean; error?: string }>
      ptyWrite: (id: string, data: string) => void
      ptyResize: (id: string, cols: number, rows: number) => Promise<void>
      ptyKill: (id: string) => Promise<void>
      onPtyData: (cb: (id: string, data: string) => void) => () => void
      onPtyExit: (cb: (id: string, code: number) => void) => () => void
      openFolder: () => Promise<string | null>
      mcpInject: (projectPath: string) => Promise<{ success: boolean; error?: string }>
      gitDiff: (projectPath: string) => Promise<{ diff: string; empty: boolean }>
      devserverDetect: (projectPath: string) => Promise<{ name: string; script: string } | null>
      geminiInvoke: (opts: { mode: 'review' | 'research'; input: string; context?: string }) => Promise<{ success: boolean; output: string; error: string }>
      onGeminiStream: (cb: (chunk: string) => void) => () => void
      onExternalInject: (cb: (payload: { code: string; error?: string; file?: string; lines?: string }) => void) => () => void
      getServerPort: () => Promise<number>
      onServerReady: (cb: (port: number) => void) => () => void
      onServerError: (cb: (msg: string) => void) => () => void
    }
  }
}
