// ============================================================
// AnimatedBackground — Floating orbs + mesh grid + glow
// ============================================================

interface AnimatedBackgroundProps {
  /** Extra CSS classes on the wrapper */
  className?: string
  /** Reduce animation intensity (for forms / focused UIs) */
  subtle?: boolean
}

export function AnimatedBackground({ className = '', subtle = false }: AnimatedBackgroundProps) {
  const opacity = subtle ? 0.5 : 1

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`}
      style={{ zIndex: 0, opacity }}
    >
      {/* ── Mesh dot grid ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, oklch(0.52 0.22 268 / 0.12) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── Radial vignette overlay ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, transparent 40%, var(--background) 100%)',
        }}
      />

      {/* ── Orb 1: Large Indigo — top-left ── */}
      <div
        className="absolute animate-float-slow animate-pulse-glow"
        style={{
          width: 600,
          height: 600,
          top: '-15%',
          left: '-10%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, oklch(0.52 0.22 268 / 0.22) 0%, oklch(0.52 0.22 268 / 0.08) 50%, transparent 70%)',
          filter: 'blur(60px)',
          animationDuration: '9s',
        }}
      />

      {/* ── Orb 2: Violet — top-right ── */}
      <div
        className="absolute animate-float-medium animate-pulse-glow animation-delay-300"
        style={{
          width: 500,
          height: 500,
          top: '-5%',
          right: '-8%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, oklch(0.60 0.22 290 / 0.18) 0%, oklch(0.60 0.22 290 / 0.06) 55%, transparent 70%)',
          filter: 'blur(70px)',
          animationDuration: '7s',
        }}
      />

      {/* ── Orb 3: Cyan — bottom-right ── */}
      <div
        className="absolute animate-float-slow animation-delay-500"
        style={{
          width: 450,
          height: 450,
          bottom: '5%',
          right: '5%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, oklch(0.72 0.15 200 / 0.14) 0%, oklch(0.72 0.15 200 / 0.05) 60%, transparent 75%)',
          filter: 'blur(80px)',
          animationDuration: '11s',
        }}
      />

      {/* ── Orb 4: Violet small — bottom-left ── */}
      <div
        className="absolute animate-float-fast animation-delay-200"
        style={{
          width: 300,
          height: 300,
          bottom: '15%',
          left: '8%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, oklch(0.55 0.22 285 / 0.16) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animationDuration: '5s',
        }}
      />

      {/* ── Orb 5: Center glow ── */}
      <div
        className="absolute animate-pulse-glow animation-delay-400"
        style={{
          width: 700,
          height: 350,
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse, oklch(0.52 0.22 268 / 0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animationDuration: '6s',
        }}
      />
    </div>
  )
}
