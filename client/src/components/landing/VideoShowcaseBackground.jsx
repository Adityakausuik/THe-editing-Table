import { useMemo } from "react";

// Deterministic ambient light particles
const PARTICLES = [
  { id: 1, top: "14%", left: "10%", size: 6, delay: "0s", duration: "7s", color: "rgba(72,125,72,0.55)" },
  { id: 2, top: "24%", left: "84%", size: 5, delay: "1.5s", duration: "8s", color: "rgba(200,216,190,0.65)" },
  { id: 3, top: "66%", left: "7%", size: 7, delay: "2.5s", duration: "9s", color: "rgba(143,174,123,0.55)" },
  { id: 4, top: "76%", left: "89%", size: 6, delay: "0.8s", duration: "7.5s", color: "rgba(212,175,122,0.6)" },
  { id: 5, top: "34%", left: "18%", size: 4, delay: "3s", duration: "6.5s", color: "rgba(72,125,72,0.5)" },
  { id: 6, top: "54%", left: "80%", size: 5, delay: "2s", duration: "8.5s", color: "rgba(143,174,123,0.5)" },
  { id: 7, top: "82%", left: "24%", size: 6, delay: "1s", duration: "7.2s", color: "rgba(200,216,190,0.6)" },
  { id: 8, top: "18%", left: "72%", size: 4, delay: "3.5s", duration: "9.5s", color: "rgba(72,125,72,0.5)" }
];

export default function VideoShowcaseBackground() {
  const particles = useMemo(() => PARTICLES, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none allow-motion"
      aria-hidden="true"
    >
      {/* 1. SOFT SECTION-WIDE MESH GRADIENT */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F8FBF7] via-[#F2F7F0]/60 to-[#F8FBF7]" />

      {/* 2. DYNAMIC ROTATING KINETIC ENGINE (Centered directly on the 5-card carousel) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1240px] h-[780px] flex items-center justify-center pointer-events-none">

        {/* LAYER A: Primary Clockwise Rotating Conic Light Beam (Running Speed: 10s) */}
        <div
          className="absolute w-[680px] sm:w-[860px] lg:w-[1020px] h-[680px] sm:h-[860px] lg:h-[1020px] rounded-full blur-3xl opacity-75 animate-showcase-rotate-cw allow-motion"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(72,125,72,0.36) 0deg, rgba(200,216,190,0.52) 65deg, transparent 130deg, rgba(143,174,123,0.38) 190deg, rgba(212,175,122,0.44) 260deg, transparent 320deg, rgba(72,125,72,0.36) 360deg)"
          }}
        />

        {/* LAYER B: Counter-Clockwise Secondary Conic Aurora (Running Speed: 14s) */}
        <div
          className="absolute w-[560px] sm:w-[740px] lg:w-[840px] h-[560px] sm:h-[740px] lg:h-[840px] rounded-full blur-3xl opacity-70 animate-showcase-rotate-ccw allow-motion"
          style={{
            background:
              "conic-gradient(from 180deg, rgba(143,174,123,0.32) 0deg, transparent 90deg, rgba(72,125,72,0.35) 180deg, rgba(200,216,190,0.48) 270deg, transparent 330deg, rgba(143,174,123,0.32) 360deg)"
          }}
        />

        {/* LAYER C: Pulsing Ambient Core Glow (Breathing Heartbeat) */}
        <div
          className="absolute w-[440px] sm:w-[580px] h-[440px] sm:h-[580px] rounded-full blur-2xl animate-showcase-pulse allow-motion"
          style={{
            background:
              "radial-gradient(circle, rgba(72,125,72,0.48) 0%, rgba(143,174,123,0.28) 45%, rgba(200,216,190,0.16) 70%, transparent 80%)"
          }}
        />

        {/* LAYER D: Precision Outer Orbital Ring with 4 Orbiting Satellites (Clockwise: 12s running speed) */}
        <div className="absolute w-[680px] sm:w-[860px] lg:w-[1040px] h-[680px] sm:h-[860px] lg:h-[1040px] animate-showcase-rotate-cw allow-motion flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 1000 1000" fill="none">
            <defs>
              <linearGradient id="orbitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgb(72,125,72)" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#C8D8BE" stopOpacity="0.70" />
                <stop offset="100%" stopColor="rgb(72,125,72)" stopOpacity="0.45" />
              </linearGradient>
            </defs>
            {/* Dashed Orbital Track */}
            <circle
              cx="500"
              cy="500"
              r="470"
              stroke="url(#orbitGrad1)"
              strokeWidth="1.5"
              strokeDasharray="12 18"
            />
            {/* Fine Outer Boundary Line */}
            <circle
              cx="500"
              cy="500"
              r="490"
              stroke="rgba(72,125,72,0.20)"
              strokeWidth="1"
              strokeDasharray="4 24"
            />
          </svg>

          {/* 4 Orbital Satellite Nodes running along the track */}
          <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-emerald-600 shadow-[0_0_14px_rgba(72,125,72,0.9)] border-2 border-white" />
          <div className="absolute right-[2%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#C8D8BE] shadow-[0_0_12px_rgba(200,216,190,0.9)] border-2 border-white" />
          <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-emerald-700 shadow-[0_0_14px_rgba(72,125,72,0.9)] border-2 border-white" />
          <div className="absolute left-[2%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.8)] border-2 border-white" />
        </div>

        {/* LAYER E: Cinematic Camera Shutter / 12-Spoke Film Aperture Wheel (Counter-Clockwise: 8.5s running speed) */}
        <div className="absolute w-[500px] sm:w-[660px] lg:w-[780px] h-[500px] sm:h-[660px] lg:h-[780px] animate-showcase-rotate-ccw-fast allow-motion flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 800 800" fill="none">
            {/* Inner Precision Aperture Circle */}
            <circle
              cx="400"
              cy="400"
              r="280"
              stroke="rgba(72,125,72,0.32)"
              strokeWidth="1.5"
              strokeDasharray="8 8"
            />
            <circle
              cx="400"
              cy="400"
              r="340"
              stroke="rgba(72,125,72,0.24)"
              strokeWidth="1"
              strokeDasharray="3 14"
            />

            {/* 12 Cinematic Radial Tick Marks (Shutter Angles: 0°, 30°, 60°, ... 330°) */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 400 400)`}>
                <line
                  x1="400"
                  y1="70"
                  x2="400"
                  y2="130"
                  stroke="rgba(72,125,72,0.48)"
                  strokeWidth={deg % 90 === 0 ? "2.5" : "1.5"}
                  strokeLinecap="round"
                />
                <circle cx="400" cy="145" r={deg % 90 === 0 ? "3" : "2"} fill="rgba(72,125,72,0.55)" />
              </g>
            ))}
          </svg>
        </div>

        {/* LAYER F: Fast Inner Radar / Lens Sweep Arc (Clockwise: 6s running speed) */}
        <div className="absolute w-[340px] sm:w-[440px] h-[340px] sm:h-[440px] animate-showcase-rotate-cw-fast allow-motion flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
            <defs>
              <linearGradient id="sweepArc" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgb(72,125,72)" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#8FAE7B" stopOpacity="0.35" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 200,30 A 170,170 0 0,1 370,200"
              stroke="url(#sweepArc)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="200" cy="30" r="4" fill="rgb(72,125,72)" />
          </svg>
        </div>

      </div>

      {/* 3. RUNNING AMBIENT LIGHT PARTICLES */}
      <div className="absolute inset-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none allow-motion"
            style={{
              top: p.top,
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              boxShadow: `0 0 10px ${p.color}`,
              animation: `showcase-pulse-slow ${p.duration} ease-in-out infinite`,
              animationDelay: p.delay
            }}
          />
        ))}
      </div>
    </div>
  );
}
