import { m, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import editorSticker from "../../assets/editor-sticker.png";
import editorStickerRight from "../../assets/editor-sticker-right.png";

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

      {/* 4. FLOATING ADOBE PREMIERE PRO BADGE WITH CONTINUOUS FLOATING ANIMATION */}
      <m.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={
          shouldReduceMotion
            ? { opacity: 1, scale: 1 }
            : {
                opacity: 1,
                y: [0, -18, -4, -22, 0],
                x: [mousePos.x * 24, mousePos.x * 24 + 8, mousePos.x * 24 - 6, mousePos.x * 24 + 5, mousePos.x * 24],
                rotate: [-3, 4, -2, 5, -3],
                scale: [1, 1.04, 0.98, 1.03, 1]
              }
        }
        transition={{
          duration: 6.8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.12, rotate: 6 }}
        style={{
          perspective: 1000
        }}
        className="absolute top-[18%] sm:top-[30%] lg:top-[34%] left-[6%] sm:left-[8%] lg:left-[12%] w-11 h-11 sm:w-16 sm:h-16 lg:w-20 lg:h-20 pointer-events-auto cursor-pointer z-10 group"
        title="Adobe Premiere Pro"
      >
        {/* Soft violet ambient back-glow aura */}
        <div className="absolute -inset-3 sm:-inset-6 rounded-full bg-[radial-gradient(circle,rgba(153,102,255,0.45)_0%,rgba(110,60,220,0.18)_50%,transparent_75%)] blur-lg sm:blur-2xl pointer-events-none group-hover:opacity-100 transition-opacity duration-500" />

        {/* Premiere Pro Badge */}
        <div className="relative w-full h-full rounded-[22%] bg-gradient-to-br from-[#1F0A38] via-[#0E031E] to-[#04010A] p-2 sm:p-3 lg:p-3.5 shadow-[0_12px_28px_-4px_rgba(40,10,70,0.5),0_0_20px_rgba(153,102,255,0.25)] border border-[rgba(179,136,255,0.45)] group-hover:border-[#B388FF] group-hover:shadow-[0_20px_45px_-4px_rgba(120,60,240,0.6),0_0_35px_rgba(179,136,255,0.5)] transition-all duration-300 backdrop-blur-md flex items-center justify-center">
          {/* Subtle glossy sheen */}
          <div className="absolute inset-0 rounded-[22%] bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

          {/* Authentic Adobe Premiere Pro Icon */}
          <svg
            role="img"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full fill-[#B388FF] group-hover:fill-[#D1A8FF] transition-colors duration-300 drop-shadow-[0_2px_8px_rgba(179,136,255,0.6)]"
          >
            <title>Adobe Premiere Pro</title>
            <path d="M10.15 8.42a2.93 2.93 0 00-1.18-.2 13.9 13.9 0 00-1.09.02v3.36l.39.02h.53c.39 0 .78-.06 1.15-.18.32-.09.6-.28.82-.53.21-.25.31-.59.31-1.03a1.45 1.45 0 00-.93-1.46zM19.75.3H4.25A4.25 4.25 0 000 4.55v14.9c0 2.35 1.9 4.25 4.25 4.25h15.5c2.35 0 4.25-1.9 4.25-4.25V4.55C24 2.2 22.1.3 19.75.3zm-7.09 11.65c-.4.56-.96.98-1.61 1.22-.68.25-1.43.34-2.25.34l-.5-.01-.43-.01v3.21a.12.12 0 01-.11.14H5.82c-.08 0-.12-.04-.12-.13V6.42c0-.07.03-.11.1-.11l.56-.01.76-.02.87-.02.91-.01c.82 0 1.5.1 2.06.31.5.17.96.45 1.34.82.32.32.57.71.73 1.14.15.42.23.85.23 1.3 0 .86-.2 1.57-.6 2.13zm6.82-3.15v1.95c0 .08-.05.11-.16.11a4.35 4.35 0 00-1.92.37c-.19.09-.37.21-.51.37v5.1c0 .1-.04.14-.13.14h-1.97a.14.14 0 01-.16-.12v-5.58l-.01-.75-.02-.78c0-.23-.02-.45-.04-.68a.1.1 0 01.07-.11h1.78c.1 0 .18.07.2.16a3.03 3.03 0 01.13.92c.3-.35.67-.64 1.08-.86a3.1 3.1 0 011.52-.39c.07-.01.13.04.14.11v.04z" />
          </svg>
        </div>

        {/* Floating tooltip badge */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#1F0A38]/90 border border-[#B388FF]/30 backdrop-blur-md text-[10px] font-semibold tracking-wider text-[#E0B0FF] uppercase opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-soft">
          Premiere Pro
        </div>
      </m.div>

      {/* 5. FLOATING ADOBE LOGO BADGE WITH CONTINUOUS FLOATING ANIMATION */}
      <m.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={
          shouldReduceMotion
            ? { opacity: 1, scale: 1 }
            : {
                opacity: 1,
                y: [0, -20, -5, -16, 0],
                x: [mousePos.x * -24, mousePos.x * -24 - 8, mousePos.x * -24 + 6, mousePos.x * -24 - 4, mousePos.x * -24],
                rotate: [3, -4, 2, -5, 3],
                scale: [1, 1.03, 0.97, 1.04, 1]
              }
        }
        transition={{
          duration: 7.4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.12, rotate: -6 }}
        style={{
          perspective: 1000
        }}
        className="absolute top-[18%] sm:top-[32%] lg:top-[36%] right-[6%] sm:right-[8%] lg:right-[12%] w-11 h-11 sm:w-16 sm:h-16 lg:w-20 lg:h-20 pointer-events-auto cursor-pointer z-10 group"
        title="Adobe"
      >
        {/* Soft crimson/coral ambient back-glow aura */}
        <div className="absolute -inset-3 sm:-inset-6 rounded-full bg-[radial-gradient(circle,rgba(235,16,0,0.45)_0%,rgba(180,20,20,0.18)_50%,transparent_75%)] blur-lg sm:blur-2xl pointer-events-none group-hover:opacity-100 transition-opacity duration-500" />

        {/* Adobe Badge */}
        <div className="relative w-full h-full rounded-[22%] bg-gradient-to-br from-[#2E0508] via-[#140203] to-[#050001] p-2 sm:p-3 lg:p-3.5 shadow-[0_12px_28px_-4px_rgba(70,10,15,0.5),0_0_20px_rgba(235,16,0,0.25)] border border-[rgba(255,80,80,0.45)] group-hover:border-[#FF4D4D] group-hover:shadow-[0_20px_45px_-4px_rgba(235,16,0,0.6),0_0_35px_rgba(255,80,80,0.5)] transition-all duration-300 backdrop-blur-md flex items-center justify-center">
          {/* Subtle glossy sheen */}
          <div className="absolute inset-0 rounded-[22%] bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

          {/* Authentic Adobe "A" Icon */}
          <svg
            role="img"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full fill-[#FF4D4D] group-hover:fill-[#FF6B6B] transition-colors duration-300 drop-shadow-[0_2px_8px_rgba(235,16,0,0.6)] p-0.5"
          >
            <title>Adobe</title>
            <path d="M13.966 22.624l-1.69-4.281H8.122l3.892-9.144 5.662 13.425zM8.884 1.376H0v21.248zm15.116 0h-8.884L24 22.624Z" />
          </svg>
        </div>

        {/* Floating tooltip badge */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#2E0508]/90 border border-[#FF4D4D]/30 backdrop-blur-md text-[10px] font-semibold tracking-wider text-[#FFA8A8] uppercase opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-soft">
          Adobe
        </div>
      </m.div>

      {/* 6. FLOATING DIE-CUT STICKER DOWNWARD OF PREMIERE PRO LOGO */}
      <m.div
        initial={{ opacity: 0, scale: 0.85, y: 15 }}
        animate={
          shouldReduceMotion
            ? { opacity: 1, scale: 1, y: 0 }
            : {
                opacity: 1,
                y: [0, -14, 2, -10, 0],
                x: [mousePos.x * 20, mousePos.x * 20 - 6, mousePos.x * 20 + 8, mousePos.x * 20 - 4, mousePos.x * 20],
                rotate: [-4, -1, -6, -2, -4],
                scale: [1, 1.025, 0.985, 1.02, 1]
              }
        }
        transition={{
          duration: 7.8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{
          scale: 1.08,
          rotate: -1,
          transition: { duration: 0.25 }
        }}
        style={{
          perspective: 1000
        }}
        className="absolute bottom-[10%] sm:bottom-auto sm:top-[48%] lg:top-[52%] left-[5%] sm:left-[7%] lg:left-[10%] w-20 sm:w-28 lg:w-36 xl:w-40 pointer-events-auto cursor-pointer z-10 group"
        title="Lead Editor"
      >
        {/* Soft ambient back-glow aura */}
        <div className="absolute -inset-4 sm:-inset-6 rounded-full bg-[radial-gradient(circle,rgba(72,125,72,0.22)_0%,rgba(143,174,123,0.10)_50%,transparent_75%)] blur-xl pointer-events-none group-hover:opacity-100 transition-opacity duration-500" />

        {/* Die-Cut Sticker Image with Dynamic Drop Shadow */}
        <div className="relative w-full transition-transform duration-300">
          <img
            src={editorSticker}
            alt="Lead Editor Sticker"
            className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)] group-hover:drop-shadow-[0_18px_32px_rgba(72,125,72,0.28)] transition-all duration-300"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Floating tooltip badge */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#1A241A]/90 border border-[rgba(143,174,123,0.35)] backdrop-blur-md text-[10px] font-semibold tracking-wider text-[#C8D8BE] uppercase opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-soft">
          Lead Editor
        </div>
      </m.div>

      {/* 7. FLOATING DIE-CUT STICKER DOWNWARD OF ADOBE LOGO (RIGHT SIDE) */}
      <m.div
        initial={{ opacity: 0, scale: 0.85, y: 15 }}
        animate={
          shouldReduceMotion
            ? { opacity: 1, scale: 1, y: 0 }
            : {
                opacity: 1,
                y: [0, -16, 3, -12, 0],
                x: [mousePos.x * -20, mousePos.x * -20 + 7, mousePos.x * -20 - 7, mousePos.x * -20 + 5, mousePos.x * -20],
                rotate: [4, 1, 6, 2, 4],
                scale: [1, 1.03, 0.98, 1.025, 1]
              }
        }
        transition={{
          duration: 8.4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{
          scale: 1.08,
          rotate: 1,
          transition: { duration: 0.25 }
        }}
        style={{
          perspective: 1000
        }}
        className="absolute bottom-[10%] sm:bottom-auto sm:top-[50%] lg:top-[54%] right-[5%] sm:right-[7%] lg:right-[10%] w-20 sm:w-28 lg:w-36 xl:w-40 pointer-events-auto cursor-pointer z-10 group"
        title="Creative Editor"
      >
        {/* Soft warm terracotta/amber ambient back-glow aura */}
        <div className="absolute -inset-4 sm:-inset-6 rounded-full bg-[radial-gradient(circle,rgba(196,123,85,0.24)_0%,rgba(176,106,66,0.12)_50%,transparent_75%)] blur-xl pointer-events-none group-hover:opacity-100 transition-opacity duration-500" />

        {/* Die-Cut Sticker Image with Dynamic Drop Shadow */}
        <div className="relative w-full transition-transform duration-300">
          <img
            src={editorStickerRight}
            alt="Creative Editor Sticker"
            className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)] group-hover:drop-shadow-[0_18px_32px_rgba(196,123,85,0.30)] transition-all duration-300"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Floating tooltip badge */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#1A241A]/90 border border-[rgba(196,123,85,0.40)] backdrop-blur-md text-[10px] font-semibold tracking-wider text-[#E8C5A8] uppercase opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-soft">
          Creative Editor
        </div>
      </m.div>

      {/* 8. SUBTLE EDITORIAL FILM GRAIN / MESH TEXTURE */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(47, 58, 47, 0.8) 1px, transparent 1px)`,
          backgroundSize: "28px 28px"
        }}
      />

      {/* 6. SMOOTH LUXURY PERIMETER VIGNETTE */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(248,251,247,0.72)_100%)] pointer-events-none" />
    </m.div>
  );
}
