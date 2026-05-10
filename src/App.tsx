import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import MainLayout from './components/layout/MainLayout'
import ProjectLoadScreen from './components/ProjectLoadScreen'

export default function App() {
  const project = useAppStore(s => s.project)
  const setProject = useAppStore(s => s.setProject)
  const setDevServerCommand = useAppStore(s => s.setDevServerCommand)
  const mcpInject = useAppStore(s => s.log)

  const handleOpenProject = async (path: string) => {
    // MCP 주입과 dev server 감지를 먼저 완료한 뒤 Claude 시작
    const [cmd, mcpResult] = await Promise.all([
      window.kuro.devserverDetect(path),
      window.kuro.mcpInject(path),
    ])

    setDevServerCommand(cmd)

    if (mcpResult.success) {
      mcpInject('success', `Playwright MCP injected → ${path}\\.claude\\settings.json`)
    } else {
      mcpInject('warn', `MCP inject failed: ${mcpResult.error}`)
    }

    // 설정 파일 write 완료 후 Claude 시작
    setProject(path)
  }

  // Cleanup PTYs on unmount
  useEffect(() => {
    return () => {
      window.kuro.ptyKill('claude')
      window.kuro.ptyKill('devserver')
    }
  }, [])

  if (!project) {
    return <ProjectLoadScreen onOpen={handleOpenProject} />
  }

  return <MainLayout />
}
