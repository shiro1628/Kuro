import * as vscode from 'vscode'
import * as http from 'http'

function getConfig() {
  const cfg = vscode.workspace.getConfiguration('kuro')
  return {
    port: cfg.get<number>('port', 7890),
    contextLines: cfg.get<number>('contextLines', 20),
  }
}

function postToKuro(payload: {
  code: string
  error?: string
  file?: string
  lines?: string
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const { port } = getConfig()
    const body = JSON.stringify(payload)

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/inject',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      res => {
        if (res.statusCode === 200) resolve()
        else reject(new Error(`Kuro 서버 응답: ${res.statusCode}`))
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function isKuroRunning(): Promise<boolean> {
  return new Promise(resolve => {
    const { port } = getConfig()
    const req = http.request(
      { hostname: '127.0.0.1', port, path: '/ping', method: 'GET' },
      res => resolve(res.statusCode === 200)
    )
    req.on('error', () => resolve(false))
    req.setTimeout(1000, () => { req.destroy(); resolve(false) })
    req.end()
  })
}

async function fixWithKuro(editor: vscode.TextEditor) {
  const { contextLines } = getConfig()
  const document = editor.document
  const position = editor.selection.active

  // 커서 위치 주변 에러/경고 수집
  const allDiagnostics = vscode.languages.getDiagnostics(document.uri)
  const nearbyDiagnostics = allDiagnostics.filter(
    d => Math.abs(d.range.start.line - position.line) <= 5
  )

  // 에러가 없으면 선택 영역 또는 커서 주변 코드만 전송
  const errorLines = nearbyDiagnostics.length > 0
    ? nearbyDiagnostics
        .map(d => {
          const sev = d.severity === vscode.DiagnosticSeverity.Error ? 'Error' : 'Warning'
          return `${sev} (${d.range.start.line + 1}:${d.range.start.character + 1}): ${d.message}`
        })
        .join('\n')
    : undefined

  // 에러가 없고 선택도 없으면 안내
  if (!errorLines && editor.selection.isEmpty) {
    vscode.window.showInformationMessage('Kuro: 에러가 없습니다. 코드를 선택하거나 에러 위치에 커서를 두세요.')
    return
  }

  // 코드 범위 결정: 선택 영역 우선, 없으면 에러 주변 ±contextLines
  let startLine: number
  let endLine: number

  if (!editor.selection.isEmpty) {
    startLine = editor.selection.start.line
    endLine = editor.selection.end.line
  } else {
    const errorLine = nearbyDiagnostics[0]?.range.start.line ?? position.line
    startLine = Math.max(0, errorLine - contextLines)
    endLine = Math.min(document.lineCount - 1, errorLine + contextLines)
  }

  const code = document.getText(
    new vscode.Range(startLine, 0, endLine, Number.MAX_SAFE_INTEGER)
  )
  const file = vscode.workspace.asRelativePath(document.uri)
  const lines = `${startLine + 1}-${endLine + 1}`

  // Kuro 실행 여부 확인
  const running = await isKuroRunning()
  if (!running) {
    vscode.window.showErrorMessage('Kuro가 실행되지 않았습니다. Kuro 앱을 먼저 시작하세요.')
    return
  }

  try {
    await postToKuro({ code, error: errorLines, file, lines })
    vscode.window.showInformationMessage(`Kuro로 전송 완료 — ${file}:${lines}`)
  } catch (err: any) {
    vscode.window.showErrorMessage(`Kuro 전송 실패: ${err.message}`)
  }
}

export function activate(context: vscode.ExtensionContext) {
  // 커맨드: Ctrl+Shift+K 또는 커맨드 팔레트
  context.subscriptions.push(
    vscode.commands.registerCommand('kuro.fixWithKuro', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) return
      await fixWithKuro(editor)
    })
  )

  // 커맨드: 선택한 코드만 전송 (에러 없이)
  context.subscriptions.push(
    vscode.commands.registerCommand('kuro.sendSnippet', async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor || editor.selection.isEmpty) {
        vscode.window.showInformationMessage('Kuro: 전송할 코드를 선택하세요.')
        return
      }
      const code = editor.document.getText(editor.selection)
      const file = vscode.workspace.asRelativePath(editor.document.uri)
      const start = editor.selection.start.line + 1
      const end = editor.selection.end.line + 1
      const lines = start === end ? `${start}` : `${start}-${end}`

      const running = await isKuroRunning()
      if (!running) {
        vscode.window.showErrorMessage('Kuro가 실행되지 않았습니다.')
        return
      }
      try {
        await postToKuro({ code, file, lines })
        vscode.window.showInformationMessage(`Kuro로 전송 완료 — ${file}:${lines}`)
      } catch (err: any) {
        vscode.window.showErrorMessage(`Kuro 전송 실패: ${err.message}`)
      }
    })
  )

  // lightbulb 메뉴에 "Fix with Kuro" 추가
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      {
        provideCodeActions(document, range, ctx) {
          if (ctx.diagnostics.length === 0) return []
          const action = new vscode.CodeAction('Fix with Kuro', vscode.CodeActionKind.QuickFix)
          action.command = { command: 'kuro.fixWithKuro', title: 'Fix with Kuro' }
          action.diagnostics = [...ctx.diagnostics]
          action.isPreferred = false
          return [action]
        },
      },
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  )
}

export function deactivate() {}
