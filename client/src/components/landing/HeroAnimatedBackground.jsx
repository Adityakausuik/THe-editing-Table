import { m, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

// Pre-calculated deterministic floating light particles (avoids SSR hydration mismatch)
const PARTICLES = [
  { id: 1, left: "8%", size: 6, duration: 18, delay: 0, xOffset: 25, opacity: 0.55 },
  { id: 2, left: "18%", size: 4, duration: 22, delay: 4, xOffset: -20, opacity: 0.45 },
  { id: 3, left: "28%", size: 8, duration: 16, delay: 1.5, xOffset: 30, opacity: 0.6 },
  { id: 4, left: "38%", size: 5, duration: 24, delay: 7, xOffset: -18, opacity: 0.5 },
  { id: 5, left: "48%", size: 7, duration: 19, delay: 3, xOffset: 22, opacity: 0.65 },
  { id: 6, left: "58%", size: 4, duration: 21, delay: 9, xOffset: -25, opacity: 0.4 },
  { id: 7, left: "68%", size: 9, duration: 17, delay: 2, xOffset: 35, opacity: 0.55 },
  { id: 8, left: "78%", size: 5, duration: 23, delay: 6, xOffset: -22, opacity: 0.5 },
  { id: 9, left: "88%", size: 6, duration: 20, delay: 5, xOffset: 20, opacity: 0.6 },
  { id: 10, left: "14%", size: 5, duration: 25, delay: 11, xOffset: -30, opacity: 0.45 },
  { id: 11, left: "32%", size: 7, duration: 18, delay: 8, xOffset: 25, opacity: 0.6 },
  { id: 12, left: "52%", size: 4, duration: 26, delay: 12, xOffset: -15, opacity: 0.4 },
  { id: 13, left: "72%", size: 8, duration: 19, delay: 10, xOffset: 28, opacity: 0.65 },
  { id: 14, left: "84%", size: 6, duration: 22, delay: 13, xOffset: -24, opacity: 0.5 },
  { id: 15, left: "94%", size: 5, duration: 20, delay: 7.5, xOffset: 18, opacity: 0.55 }
];

export default function HeroAnimatedBackground({ isIntroActive = false }) {
  const shouldReduceMotion = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Smooth mouse parallax listener on desktop
  useEffect(() => {
    if (shouldReduceMotion) return;

    let rafId = 0;
    const handleMouseMove = (e) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const { innerWidth, innerHeight } = window;
        // Normalize between -1 and 1
        const x = (e.clientX / innerWidth - 0.5) * 2;
        const y = (e.clientY / innerHeight - 0.5) * 2;
        setMousePos({ x, y });
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [shouldReduceMotion]);

  const particles = useMemo(() => PARTICLES, []);

  return (
    <m.div
      initial={isIntroActive ? { opacity: 0 } : { opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* 1. BASE BACKGROUND GRADIENT */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F8FBF7] via-[#F2F7F0] to-[#F8FBF7]" />

      {/* 2. DYNAMIC AMBIENT LIGHT MESH / AURORA ORBS */}
      <div className="absolute inset-0 overflow-hidden">
        {/* ORB 1 — Primary Emerald Sage Aurora (Upper Left / Center Drift) */}
        <m.div
          animate={
            shouldReduceMotion
              ? { scale: 1, opacity: 0.5 }
              : {
                  x: [mousePos.x * 20 - 30, mousePos.x * 20 + 45, mousePos.x * 20 - 20, mousePos.x * 20 + 25, mousePos.x * 20 - 30],
                  y: [mousePos.y * 20 - 25, mousePos.y * 20 + 35, mousePos.y * 20 - 40, mousePos.y * 20 + 15, mousePos.y * 20 - 25],
                  scale: [1, 1.15, 0.95, 1.1, 1],
                  opacity: [0.65, 0.85, 0.6, 0.8, 0.65]
                }
          }
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            width: "clamp(460px, 52vw, 820px)",
            height: "clamp(460px, 52vw, 820px)",
            background: "radial-gradient(circle, rgba(72, 125, 72, 0.32) 0%, rgba(143, 174, 123, 0.18) 45%, transparent 72%)"
          }}
          className="absolute -top-[12%] -left-[10%] rounded-full blur-3xl will-change-transform"
        />

        {/* ORB 2 — Warm Champagne & Sage Gold Aurora (Lower Right Drift) */}
        <m.div
          animate={
            shouldReduceMotion
              ? { scale: 1, opacity: 0.55 }
              : {
                  x: [mousePos.x * -25 + 35, mousePos.x * -25 - 40, mousePos.x * -25 + 25, mousePos.x * -25 - 25, mousePos.x * -25 + 35],
                  y: [mousePos.y * -25 + 30, mousePos.y * -25 - 25, mousePos.y * -25 + 35, mousePos.y * -25 - 15, mousePos.y * -25 + 30],
                  scale: [1.05, 0.92, 1.15, 0.96, 1.05],
                  opacity: [0.7, 0.9, 0.65, 0.85, 0.7]
                }
          }
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            width: "clamp(500px, 56vw, 900px)",
            height: "clamp(500px, 56vw, 900px)",
            background: "radial-gradient(circle, rgba(200, 216, 190, 0.55) 0%, rgba(143, 174, 123, 0.24) 48%, transparent 72%)"
          }}
          className="absolute -bottom-[16%] -right-[12%] rounded-full blur-3xl will-change-transform"
        />

        {/* ORB 3 — Ethereal Mint Mist (Upper Right Quadrant Float) */}
        <m.div
          animate={
            shouldReduceMotion
              ? { scale: 1, opacity: 0.4 }
              : {
                  x: [mousePos.x * 15, mousePos.x * 15 - 50, mousePos.x * 15 + 35, mousePos.x * 15 - 20, mousePos.x * 15],
                  y: [mousePos.y * 15, mousePos.y * 15 + 40, mousePos.y * 15 - 30, mousePos.y * 15 + 20, mousePos.y * 15],
                  scale: [0.95, 1.12, 0.98, 1.14, 0.95],
                  opacity: [0.55, 0.75, 0.5, 0.7, 0.55]
                }
          }
          transition={{
            duration: 26,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            width: "clamp(380px, 42vw, 680px)",
            height: "clamp(380px, 42vw, 680px)",
            background: "radial-gradient(circle, rgba(163, 196, 150, 0.38) 0%, rgba(72, 125, 72, 0.14) 50%, transparent 70%)"
          }}
          className="absolute top-[8%] -right-[6%] rounded-full blur-3xl will-change-transform"
        />

        {/* ORB 4 — Core Radiant Halo (Pulsing Behind Center Logo & Tagline) */}
        <m.div
          animate={
            shouldReduceMotion
              ? { scale: 1, opacity: 0.4 }
              : {
                  scale: [0.94, 1.14, 1.0, 1.16, 0.94],
                  opacity: [0.45, 0.78, 0.5, 0.74, 0.45]
                }
          }
          transition={{
            duration: 7.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            width: "clamp(380px, 48vw, 760px)",
            height: "clamp(380px, 48vw, 760px)",
            background: "radial-gradient(circle, rgba(72, 125, 72, 0.24) 0%, rgba(200, 216, 190, 0.16) 45%, transparent 72%)"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl will-change-transform"
        />
      </div>

      {/* 3. CINEMATIC FLOATING LIGHT PARTICLES / BOKEH DUST */}
      {!shouldReduceMotion && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <m.div
              key={p.id}
              initial={{
                y: "105vh",
                x: 0,
                opacity: 0,
                scale: 0.6
              }}
              animate={{
                y: ["105vh", "80vh", "30vh", "-10vh"],
                x: [0, p.xOffset, -p.xOffset * 0.7, p.xOffset * 0.5],
                opacity: [0, p.opacity, p.opacity * 0.9, 0],
                scale: [0.6, 1.0, 1.1, 0.7]
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: "linear"
              }}
              style={{
                left: p.left,
                width: `${p.size}px`,
                height: `${p.size}px`
              }}
              className="absolute rounded-full bg-[rgba(143,174,123,0.75)] shadow-[0_0_12px_rgba(72,125,72,0.5)] blur-[0.4px] will-change-transform"
            />
          ))}
        </div>
      )}

      {/* 4. SUBTLE EDITORIAL FILM GRAIN / MESH TEXTURE */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(47, 58, 47, 0.8) 1px, transparent 1px)`,
          backgroundSize: "28px 28px"
        }}
      />

      {/* 5. SMOOTH LUXURY PERIMETER VIGNETTE */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(248,251,247,0.72)_100%)] pointer-events-none" />
    </m.div>
  );
}
