import KuroCat from './KuroCat'

interface Props {
  onOpen: (path: string) => void
}

export default function ProjectLoadScreen({ onOpen }: Props) {
  const handlePick = async () => {
    const path = await window.kuro.openFolder()
    if (path) onOpen(path)
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full overflow-hidden noise titlebar-drag"
      style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 45%, #110d00 0%, #080808 100%)' }}
    >
      {/* Subtle grid lines */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#f0a500 1px, transparent 1px), linear-gradient(90deg, #f0a500 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Stars */}
      {[...Array(24)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: Math.random() > 0.8 ? 2 : 1,
            height: Math.random() > 0.8 ? 2 : 1,
            top:  `${10 + Math.random() * 80}%`,
            left: `${5  + Math.random() * 90}%`,
            opacity: 0.1 + Math.random() * 0.25,
          }}
        />
      ))}

      {/* Main content */}
      <div className="titlebar-nodrag relative z-10 flex flex-col items-center gap-6 animate-fade-in">

        {/* Cat + glow halo */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(240,165,0,0.12) 0%, transparent 70%)' }}
          />
          <KuroCat size={140} animate />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1
            className="text-4xl font-bold tracking-widest uppercase"
            style={{
              color: '#fff',
              textShadow: '0 0 20px rgba(240,165,0,0.3), 0 0 40px rgba(240,165,0,0.1)',
              letterSpacing: '0.3em',
            }}
          >
            KURO
          </h1>
          <p className="text-xs mt-2 tracking-widest uppercase"
            style={{ color: 'rgba(240,165,0,0.5)', letterSpacing: '0.2em' }}>
            黒猫 · Claude + Antigravity
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-48">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(240,165,0,0.3))' }} />
          <div className="w-1 h-1 rounded-full bg-accent opacity-50" />
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(240,165,0,0.3))' }} />
        </div>

        {/* CTA */}
        <button
          onClick={handlePick}
          className="group relative px-8 py-2.5 text-sm font-medium tracking-widest uppercase transition-all duration-200"
          style={{
            color: '#f0a500',
            border: '1px solid rgba(240,165,0,0.3)',
            background: 'rgba(240,165,0,0.05)',
            borderRadius: 2,
            letterSpacing: '0.15em',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(240,165,0,0.12)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(240,165,0,0.6)'
            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(240,165,0,0.15)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(240,165,0,0.05)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(240,165,0,0.3)'
            ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
          }}
        >
          프로젝트 열기
        </button>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: '0.05em' }}>
          Playwright MCP 자동 설정 · 집사 모드 진입
        </p>
      </div>
    </div>
  )
}
