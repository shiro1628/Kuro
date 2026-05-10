interface Props {
  size?: number
  animate?: boolean
  className?: string
}

export default function KuroCat({ size = 120, animate = true, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ambient glow behind head */}
      <ellipse cx="60" cy="68" rx="42" ry="38"
        fill="rgba(240,165,0,0.04)"
        style={animate ? { animation: 'eye-glow 3s ease-in-out infinite' } : undefined}
      />

      {/* Left ear outer */}
      <polygon points="20,50 11,14 44,38" fill="#0d0d0d" />
      {/* Right ear outer */}
      <polygon points="100,50 109,14 76,38" fill="#0d0d0d" />
      {/* Left ear inner */}
      <polygon points="22,47 15,20 41,37" fill="#1a0d10" />
      {/* Right ear inner */}
      <polygon points="98,47 105,20 79,37" fill="#1a0d10" />

      {/* Head */}
      <ellipse cx="60" cy="70" rx="36" ry="34" fill="#0d0d0d" />

      {/* Left eye white (glow base) */}
      <ellipse cx="43" cy="64" rx="9" ry="11"
        fill="#f0a500"
        opacity="0.9"
        style={animate ? { animation: 'eye-glow 2.4s ease-in-out infinite' } : undefined}
      />
      {/* Left pupil */}
      <ellipse cx="43" cy="64" rx="3" ry="10" fill="#050505" />
      {/* Left eye shine */}
      <circle cx="40" cy="60" r="2" fill="white" opacity="0.6" />

      {/* Right eye white (glow base) */}
      <ellipse cx="77" cy="64" rx="9" ry="11"
        fill="#f0a500"
        opacity="0.9"
        style={animate ? { animation: 'eye-glow 2.4s ease-in-out infinite' } : undefined}
      />
      {/* Right pupil */}
      <ellipse cx="77" cy="64" rx="3" ry="10" fill="#050505" />
      {/* Right eye shine */}
      <circle cx="74" cy="60" r="2" fill="white" opacity="0.6" />

      {/* Nose */}
      <polygon points="60,78 57,82 63,82" fill="#d06070" />
      {/* Mouth */}
      <path d="M57,82 Q60,87 63,82" stroke="#666" strokeWidth="0.8" />

      {/* Whiskers left */}
      <line x1="16" y1="73" x2="54" y2="77" stroke="#2a2a2a" strokeWidth="0.9" />
      <line x1="16" y1="79" x2="54" y2="79" stroke="#2a2a2a" strokeWidth="0.9" />
      <line x1="18" y1="85" x2="54" y2="81" stroke="#2a2a2a" strokeWidth="0.9" />
      {/* Whiskers right */}
      <line x1="104" y1="73" x2="66" y2="77" stroke="#2a2a2a" strokeWidth="0.9" />
      <line x1="104" y1="79" x2="66" y2="79" stroke="#2a2a2a" strokeWidth="0.9" />
      <line x1="102" y1="85" x2="66" y2="81" stroke="#2a2a2a" strokeWidth="0.9" />

      {/* Tail (bottom right, curving) */}
      <path
        d="M88,104 Q108,95 112,78 Q116,62 104,58"
        stroke="#1a1a1a"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        style={animate ? { animation: 'tail-wag 2.4s ease-in-out infinite', transformOrigin: '88px 104px' } : undefined}
      />
    </svg>
  )
}

/* Paw print icon for toolbar/panel headers */
export function PawIcon({ className = '', size = 14 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Toe beans */}
      <ellipse cx="6.5"  cy="10.5" rx="2.2" ry="1.8" />
      <ellipse cx="10.5" cy="7.5"  rx="2.2" ry="1.8" />
      <ellipse cx="14.5" cy="7.5"  rx="2.2" ry="1.8" />
      <ellipse cx="18"   cy="10.5" rx="2.2" ry="1.8" />
      {/* Main pad */}
      <ellipse cx="12"   cy="16"   rx="5"   ry="4.2" />
    </svg>
  )
}
