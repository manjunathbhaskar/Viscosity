// The brand mark — a small swirling fluid blob instead of a flat dot.
// Pure SVG + CSS animation (feTurbulence displacement + rotating gradient),
// no JS needed, so it's safe to render on the server.
export default function WaterMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="water-mark" aria-hidden="true">
      <defs>
        <filter id="water-turbulence">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.05" numOctaves="2" seed="7" result="noise">
            <animate attributeName="baseFrequency" values="0.018 0.05;0.03 0.08;0.018 0.05" dur="9s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" />
        </filter>
        <radialGradient id="water-gradient" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffb27a" />
          <stop offset="55%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-dark)" />
        </radialGradient>
        <clipPath id="water-circle">
          <circle cx="16" cy="16" r="15" />
        </clipPath>
      </defs>
      <g clipPath="url(#water-circle)">
        <circle cx="16" cy="16" r="15" fill="url(#water-gradient)" filter="url(#water-turbulence)" className="water-mark-swirl" />
      </g>
    </svg>
  );
}
