import { Zap } from 'lucide-react';

/**
 * A self-contained animated "energy core" graphic: concentric orbit rings, flowing dashed
 * connector lines and pulsing nodes around a glowing central core. Pure CSS animation
 * (reuses .orbit-cw / .orbit-ccw / .node-pulse / .core-glow / .dashed-flow from index.css)
 * so it stays lightweight and respects prefers-reduced-motion globally.
 *
 * `variant="hero"` renders the full atom-like graphic (used in the About hero).
 * `variant="flow"` renders a flatter horizontal version used inline in the Technology section.
 */
export default function EnergyGraphic({ variant = 'hero', className = '' }: { variant?: 'hero' | 'flow'; className?: string }) {
  if (variant === 'flow') {
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
        <circle cx="60" cy="60" r="34" fill="url(#coreGradFlow)" className="core-glow" />
        <circle cx="60" cy="60" r="34" fill="none" stroke="url(#ringGradFlow)" strokeWidth="1.5" opacity="0.6" />
        <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(31,162,232,.25)" strokeWidth="1" strokeDasharray="2 4" className="orbit-cw" />
        <Zap x="46" y="46" width="28" height="28" className="fill-white" />
        <defs>
          <radialGradient id="coreGradFlow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#4DB8F0" />
            <stop offset="100%" stopColor="#1487C7" />
          </radialGradient>
          <linearGradient id="ringGradFlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1FA2E8" />
            <stop offset="100%" stopColor="#34C77B" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 420 420" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="coreGrad" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#4DB8F0" />
          <stop offset="55%" stopColor="#1FA2E8" />
          <stop offset="100%" stopColor="#14608f" />
        </radialGradient>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1FA2E8" />
          <stop offset="100%" stopColor="#34C77B" />
        </linearGradient>
      </defs>

      {/* faint static rings */}
      <circle cx="210" cy="210" r="200" fill="none" stroke="rgba(148,163,184,.12)" strokeWidth="1" />
      <circle cx="210" cy="210" r="160" fill="none" stroke="rgba(148,163,184,.14)" strokeWidth="1" />

      {/* orbiting dashed rings */}
      <g className="orbit-cw">
        <circle cx="210" cy="210" r="176" fill="none" stroke="url(#ringGrad)" strokeWidth="1.5" strokeDasharray="3 10" opacity="0.55" />
      </g>
      <g className="orbit-ccw">
        <circle cx="210" cy="210" r="136" fill="none" stroke="#34C77B" strokeWidth="1.5" strokeDasharray="2 8" opacity="0.4" />
      </g>

      {/* connector spokes */}
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line
          key={deg}
          x1="210" y1="210"
          x2={210 + 176 * Math.cos((deg * Math.PI) / 180)}
          y2={210 + 176 * Math.sin((deg * Math.PI) / 180)}
          stroke="rgba(31,162,232,.28)" strokeWidth="1" strokeDasharray="4 5" className="dashed-flow"
        />
      ))}

      {/* pulsing nodes at spoke ends */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <circle
          key={deg}
          cx={210 + 176 * Math.cos((deg * Math.PI) / 180)}
          cy={210 + 176 * Math.sin((deg * Math.PI) / 180)}
          r="5" fill={i % 2 === 0 ? '#1FA2E8' : '#34C77B'} className="node-pulse"
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}

      {/* central glowing core */}
      <circle cx="210" cy="210" r="72" fill="url(#coreGrad)" className="core-glow" />
      <circle cx="210" cy="210" r="72" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" />
      <foreignObject x="176" y="176" width="68" height="68">
        <div className="flex h-full w-full items-center justify-center">
          <Zap size={34} className="fill-white text-white" />
        </div>
      </foreignObject>
    </svg>
  );
}
