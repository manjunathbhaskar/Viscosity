"use client";

export default function HeroOrb() {
  return (
    <div className="hero-orb-container">
      <div className="hero-orb" />
      <div className="hero-orb-ring hero-orb-ring-1" />
      <div className="hero-orb-ring hero-orb-ring-2" />
      <div className="hero-orb-ring hero-orb-ring-3" />
      <div className="hero-orb-particles">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="hero-particle" style={{ ["--i" as string]: i }} />
        ))}
      </div>
    </div>
  );
}
