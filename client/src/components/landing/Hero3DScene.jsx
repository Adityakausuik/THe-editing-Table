import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sliders,
  Layers,
  Film,
  CheckCircle2,
  Play,
  Pause
} from "lucide-react";

const CHAPTERS = [
  {
    id: "ingest",
    phase: "01 / EDIT",
    title: "Raw Ingest & Curated Story Assembly",
    subtitle: "ARRIRAW & RED 8K Ingest • Narrative Proxies • Clip Curation",
    accent: "rgba(72, 125, 72, 0.45)"
  },
  {
    id: "grade",
    phase: "02 / TRANSFORM",
    title: "Color Science & Cinematic Film Stock",
    subtitle: "DaVinci Resolve ACES • Custom Kodak 2383 • Highlight Roll-Off",
    accent: "rgba(143, 174, 123, 0.55)"
  },
  {
    id: "retouch",
    phase: "03 / POLISH",
    title: "High-Fashion Frequency Separation",
    subtitle: "Micro Dodge & Burn • Skin Texture Preservation • Editorial Finish",
    accent: "rgba(200, 216, 190, 0.65)"
  },
  {
    id: "master",
    phase: "04 / FINAL RESULT",
    title: "4K DCI Cinema Master Delivery",
    subtitle: "ProRes 4444 XQ • Frame.io Review • Cinema Anamorphic 2.39:1",
    accent: "rgba(72, 125, 72, 0.65)"
  }
];

export default function Hero3DScene({ onChapterChange, isIntroActive }) {
  const shouldReduceMotion = useReducedMotion();
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const stageRef = useRef(null);

  // Mouse parallax state
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const rafRef = useRef(0);

  const activeChapter = CHAPTERS[activeChapterIndex];

  // Auto-advance chapter timer
  useEffect(() => {
    if (isPaused || shouldReduceMotion || isIntroActive) return;

    const interval = window.setInterval(() => {
      setActiveChapterIndex((prev) => {
        const next = (prev + 1) % CHAPTERS.length;
        if (onChapterChange) onChapterChange(CHAPTERS[next]);
        return next;
      });
    }, 7200);

    return () => window.clearInterval(interval);
  }, [isPaused, shouldReduceMotion, isIntroActive, onChapterChange]);

  // Smooth mouse tilt parallax
  useEffect(() => {
    if (shouldReduceMotion) return;

    const onPointerMove = (e) => {
      const { innerWidth, innerHeight } = window;
      mouseRef.current.targetX = (e.clientX / innerWidth - 0.5) * 2;
      mouseRef.current.targetY = (e.clientY / innerHeight - 0.5) * 2;
    };

    const updateParallax = () => {
      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.08;
      m.y += (m.targetY - m.y) * 0.08;

      if (stageRef.current) {
        const rotX = -m.y * 7;
        const rotY = m.x * 9;
        stageRef.current.style.transform = `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      }

      rafRef.current = window.requestAnimationFrame(updateParallax);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    rafRef.current = window.requestAnimationFrame(updateParallax);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.cancelAnimationFrame(rafRef.current);
    };
  }, [shouldReduceMotion]);

  const selectChapter = (index) => {
    setActiveChapterIndex(index);
    if (onChapterChange) onChapterChange(CHAPTERS[index]);
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 flex items-center justify-center"
      aria-hidden="true"
    >
      {/* 3D PERSPECTIVE WRAPPER */}
      <div
        ref={stageRef}
        className="relative w-full h-full max-w-[1920px] transition-transform duration-75 ease-out will-change-transform"
        style={{
          transformStyle: "preserve-3d"
        }}
      >
        {/* AMBIENT 3D FLOATING PARTICLES / APERTURE GRAIN */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-[18%] left-[12%] h-1.5 w-1.5 rounded-full bg-[rgb(72,125,72)] animate-pulse" />
          <div className="absolute top-[35%] right-[16%] h-2 w-2 rounded-full bg-[#C8D8BE] animate-ping" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-[28%] left-[22%] h-1 w-1 rounded-full bg-[rgb(72,125,72)]" />
          <div className="absolute bottom-[20%] right-[25%] h-1.5 w-1.5 rounded-full bg-[#8FAE7B] animate-pulse" style={{ animationDuration: '5s' }} />
        </div>

        {/* ========================================================
            3D CHAPTER VISUAL ENVIRONMENTS (SWAPPED WITH DEPTH FADE)
            ======================================================== */}
        <AnimatePresence mode="wait">
          {activeChapter.id === "ingest" && (
            <m.div
              key="ingest"
              initial={{ opacity: 0, scale: 0.94, z: -80 }}
              animate={{ opacity: 1, scale: 1, z: 0 }}
              exit={{ opacity: 0, scale: 1.05, z: 60 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-between px-4 sm:px-12 lg:px-24"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* LEFT 3D PANEL: CAMERA RAW VIEWFINDER */}
              <div
                className="hidden md:flex flex-col gap-3 p-5 rounded-2xl border border-[rgb(72,125,72)]/25 bg-[#F8FBF7]/85 backdrop-blur-md shadow-2xl w-[280px] lg:w-[320px]"
                style={{
                  transform: "translate3d(0, -20px, 40px) rotateY(12deg)",
                  boxShadow: "0 24px 48px -12px rgba(72,125,72,0.18)"
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[rgb(72,125,72)] border-b border-[rgb(72,125,72)]/15 pb-2.5">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    REC • ARRIRAW
                  </span>
                  <span>23.976 FPS</span>
                </div>
                <div className="font-mono text-xl lg:text-2xl font-bold tracking-widest text-[#1A241A] py-1">
                  01:24:08:14
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#4A584A] border-t border-[rgb(72,125,72)]/15 pt-2">
                  <div>RES: 8192 × 4320</div>
                  <div>CODEC: LOG-C3</div>
                  <div>SHUTTER: 180.0°</div>
                  <div>ISO: 800 • 5600K</div>
                </div>
              </div>

              {/* RIGHT 3D PANEL: FLOATING FILM STRIP WITH 35MM FRAMES */}
              <div
                className="hidden sm:flex flex-col items-center gap-3 p-4 rounded-2xl border border-[rgb(72,125,72)]/20 bg-white/70 backdrop-blur-md shadow-xl w-[260px] lg:w-[300px]"
                style={{
                  transform: "translate3d(0, 30px, -20px) rotateY(-10deg)",
                  boxShadow: "0 20px 44px -10px rgba(72,125,72,0.14)"
                }}
              >
                <div className="flex items-center justify-between w-full text-[10px] font-mono uppercase tracking-widest text-[#4A584A] border-b border-sage-border pb-2">
                  <span className="flex items-center gap-1 font-semibold text-[rgb(72,125,72)]">
                    <Film className="h-3.5 w-3.5" /> 35mm Negatives
                  </span>
                  <span>Batch #08</span>
                </div>
                <div className="w-full flex items-center justify-between gap-1 py-1 px-1 bg-[#1A241A] rounded-lg">
                  {[1, 2, 3, 4, 5].map((sprocket) => (
                    <div key={sprocket} className="h-2 w-2 rounded-sm bg-white/60" />
                  ))}
                </div>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/40 bg-gradient-to-tr from-[#253825] to-[#487D48]/40 flex items-center justify-center text-white/90 text-xs font-mono">
                  <span className="backdrop-blur-sm px-2 py-1 rounded bg-black/40 border border-white/20">
                    A002_C014_RAW
                  </span>
                </div>
                <div className="w-full flex items-center justify-between gap-1 py-1 px-1 bg-[#1A241A] rounded-lg">
                  {[1, 2, 3, 4, 5].map((sprocket) => (
                    <div key={sprocket} className="h-2 w-2 rounded-sm bg-white/60" />
                  ))}
                </div>
              </div>
            </m.div>
          )}

          {activeChapter.id === "grade" && (
            <m.div
              key="grade"
              initial={{ opacity: 0, scale: 0.94, z: -80 }}
              animate={{ opacity: 1, scale: 1, z: 0 }}
              exit={{ opacity: 0, scale: 1.05, z: 60 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-between px-4 sm:px-12 lg:px-24"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* LEFT 3D PANEL: COLOR CURVES & VECTORSCOPE */}
              <div
                className="hidden md:flex flex-col gap-3 p-5 rounded-2xl border border-[rgb(72,125,72)]/30 bg-[#F8FBF7]/90 backdrop-blur-md shadow-2xl w-[290px] lg:w-[330px]"
                style={{
                  transform: "translate3d(0, -10px, 35px) rotateY(14deg)",
                  boxShadow: "0 24px 48px -12px rgba(72,125,72,0.22)"
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[rgb(72,125,72)] border-b border-[rgb(72,125,72)]/15 pb-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5" /> COLOR SCIENCE
                  </span>
                  <span>DAVINCI ACES</span>
                </div>
                <div className="relative w-full h-28 bg-[#1A241A] rounded-xl overflow-hidden p-2 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                    <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                    <path
                      d="M 5 90 C 35 90, 40 50, 50 50 C 60 50, 65 10, 95 10"
                      fill="none"
                      stroke="#8FAE7B"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 5 92 C 30 85, 45 45, 50 48 C 55 52, 70 12, 95 8"
                      fill="none"
                      stroke="rgba(200,216,190,0.5)"
                      strokeWidth="1.2"
                      strokeDasharray="2,2"
                    />
                  </svg>
                  <div className="absolute top-2 right-2 text-[9px] font-mono text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
                    KODAK 2383
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center text-[#254425]">
                  <div className="bg-[#E3EBDD]/60 p-1.5 rounded">L: +0.02</div>
                  <div className="bg-[#E3EBDD]/60 p-1.5 rounded">G: -0.04</div>
                  <div className="bg-[#E3EBDD]/60 p-1.5 rounded">G: +0.08</div>
                </div>
              </div>

              {/* RIGHT 3D PANEL: CHROMATICITY & SPECTRUM READOUT */}
              <div
                className="hidden sm:flex flex-col gap-3 p-4 rounded-2xl border border-[rgb(72,125,72)]/25 bg-white/80 backdrop-blur-md shadow-xl w-[260px] lg:w-[290px]"
                style={{
                  transform: "translate3d(0, 25px, -15px) rotateY(-12deg)",
                  boxShadow: "0 20px 44px -10px rgba(72,125,72,0.16)"
                }}
              >
                <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#4A584A] border-b border-sage-border pb-2">
                  <span className="font-semibold text-[rgb(72,125,72)]">35mm LUT PREVIEW</span>
                  <span>D65 BALANCED</span>
                </div>
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-sage-border bg-gradient-to-r from-[#8FAE7B]/20 via-[#487D48]/30 to-[#C8D8BE]/40 flex items-center justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(72,125,72,0.35)_0%,transparent_70%)]" />
                  <div className="relative z-10 flex flex-col items-center gap-1 text-center">
                    <span className="text-[11px] font-mono font-bold text-forest uppercase tracking-widest bg-white/85 px-2.5 py-1 rounded-full shadow-sm">
                      Skin Tone Vector: 100%
                    </span>
                    <span className="text-[9px] font-mono text-forest/70">
                      Highlight Roll-Off: Smooth
                    </span>
                  </div>
                </div>
              </div>
            </m.div>
          )}

          {activeChapter.id === "retouch" && (
            <m.div
              key="retouch"
              initial={{ opacity: 0, scale: 0.94, z: -80 }}
              animate={{ opacity: 1, scale: 1, z: 0 }}
              exit={{ opacity: 0, scale: 1.05, z: 60 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-between px-4 sm:px-12 lg:px-24"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* LEFT 3D PANEL: FREQUENCY SEPARATION STACK */}
              <div
                className="hidden md:flex flex-col gap-3 p-5 rounded-2xl border border-[rgb(72,125,72)]/30 bg-[#F8FBF7]/90 backdrop-blur-md shadow-2xl w-[280px] lg:w-[320px]"
                style={{
                  transform: "translate3d(0, -15px, 45px) rotateY(15deg)",
                  boxShadow: "0 24px 48px -12px rgba(72,125,72,0.20)"
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[rgb(72,125,72)] border-b border-[rgb(72,125,72)]/15 pb-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> FREQUENCY LAYERS
                  </span>
                  <span>16-BIT PSD</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg border border-[rgb(72,125,72)]/30 bg-[#E3EBDD]/70 flex items-center justify-between text-xs font-mono text-forest font-semibold">
                    <span>High-Pass Texture</span>
                    <span className="text-[10px] text-site">Radius 2.4px</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-sage-border bg-white/70 flex items-center justify-between text-xs font-mono text-[#4A584A]">
                    <span>Dodge & Burn Curves</span>
                    <span className="text-[10px]">Opacity 42%</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-sage-border bg-white/70 flex items-center justify-between text-xs font-mono text-[#4A584A]">
                    <span>Low-Pass Color & Tone</span>
                    <span className="text-[10px]">Gaussian 24px</span>
                  </div>
                </div>
              </div>

              {/* RIGHT 3D PANEL: 400% RETOUCH LOUPE INSPECTION */}
              <div
                className="hidden sm:flex flex-col gap-3 p-4 rounded-2xl border border-[rgb(72,125,72)]/25 bg-white/80 backdrop-blur-md shadow-xl w-[260px] lg:w-[300px]"
                style={{
                  transform: "translate3d(0, 30px, -20px) rotateY(-14deg)",
                  boxShadow: "0 20px 44px -10px rgba(72,125,72,0.16)"
                }}
              >
                <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#4A584A] border-b border-sage-border pb-2">
                  <span className="font-semibold text-[rgb(72,125,72)]">400% MICRO-LOUPE</span>
                  <span>SKIN PORES PRESERVED</span>
                </div>
                <div className="relative w-full aspect-square rounded-full border-2 border-[rgb(72,125,72)]/40 p-2 flex items-center justify-center bg-[radial-gradient(circle,rgba(72,125,72,0.15)_0%,transparent_75%)]">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-full w-[1px] bg-[rgb(72,125,72)]/30" />
                    <div className="w-full h-[1px] bg-[rgb(72,125,72)]/30 absolute" />
                    <div className="h-16 w-16 rounded-full border border-[rgb(72,125,72)]/50 absolute" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-forest bg-white/90 px-2 py-0.5 rounded shadow">
                    XY: 1420, 980
                  </span>
                </div>
              </div>
            </m.div>
          )}

          {activeChapter.id === "master" && (
            <m.div
              key="master"
              initial={{ opacity: 0, scale: 0.94, z: -80 }}
              animate={{ opacity: 1, scale: 1, z: 0 }}
              exit={{ opacity: 0, scale: 1.05, z: 60 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-between px-4 sm:px-12 lg:px-24"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* LEFT 3D PANEL: MASTER TIMELINE & STEMS */}
              <div
                className="hidden md:flex flex-col gap-3 p-5 rounded-2xl border border-[rgb(72,125,72)]/30 bg-[#F8FBF7]/90 backdrop-blur-md shadow-2xl w-[290px] lg:w-[330px]"
                style={{
                  transform: "translate3d(0, -15px, 40px) rotateY(12deg)",
                  boxShadow: "0 24px 48px -12px rgba(72,125,72,0.22)"
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[rgb(72,125,72)] border-b border-[rgb(72,125,72)]/15 pb-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> MASTER DELIVERABLE
                  </span>
                  <span>4K PRORES 4444</span>
                </div>
                <div className="space-y-1.5 font-mono text-[9px]">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-[rgb(72,125,72)] font-bold">V2</span>
                    <div className="flex-1 h-5 rounded bg-[#487D48]/30 border border-[rgb(72,125,72)]/40 flex items-center px-2 text-forest truncate">
                      Grade_Adjustment_Layer
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-[rgb(72,125,72)] font-bold">V1</span>
                    <div className="flex-1 h-5 rounded bg-[#8FAE7B]/40 border border-[#8FAE7B]/60 flex items-center px-2 text-forest truncate">
                      Cinema_Feature_Master_Cut
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-[rgb(72,125,72)] font-bold">A1</span>
                    <div className="flex-1 h-5 rounded bg-[#C8D8BE]/50 border border-[#C8D8BE] flex items-center px-2 text-forest truncate">
                      Dialogue_Cleaned_24bit
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-center text-[#254425] bg-[#E3EBDD]/60 py-1 rounded">
                  QC PASSED • ZERO DROPPED FRAMES
                </div>
              </div>

              {/* RIGHT 3D PANEL: CINEMA 2.39:1 ANAMORPHIC MONITOR */}
              <div
                className="hidden sm:flex flex-col gap-3 p-4 rounded-2xl border border-[rgb(72,125,72)]/25 bg-white/80 backdrop-blur-md shadow-xl w-[270px] lg:w-[310px]"
                style={{
                  transform: "translate3d(0, 25px, -15px) rotateY(-12deg)",
                  boxShadow: "0 20px 44px -10px rgba(72,125,72,0.18)"
                }}
              >
                <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#4A584A] border-b border-sage-border pb-2">
                  <span className="font-semibold text-[rgb(72,125,72)]">2.39:1 ANAMORPHIC</span>
                  <span>HDR 1000 NITS</span>
                </div>
                <div className="relative w-full aspect-[2.39/1] rounded-lg overflow-hidden bg-black flex items-center justify-center border border-white/20">
                  <div className="text-center font-mono text-[10px] text-white/90">
                    <span className="text-[#8FAE7B] font-bold">THE EDITING TABLE</span>
                    <br />
                    <span>FINAL RELEASE READY</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-forest/80 pt-1">
                  <span>AUDIO: -14.0 LUFS</span>
                  <span className="text-site font-bold">FRAME.IO SYNCED</span>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========================================================
          EDITORIAL TIMELINE / CHAPTER CONTROLLER (BOTTOM OF HERO)
          ======================================================== */}
      <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[calc(100%-2rem)] max-w-2xl px-2">
        <div className="relative flex items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl sm:rounded-full border border-[rgb(72,125,72)]/25 bg-[#F8FBF7]/85 backdrop-blur-xl shadow-lg">
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5 w-full">
            {CHAPTERS.map((ch, idx) => {
              const isActive = idx === activeChapterIndex;
              return (
                <button
                  key={ch.id}
                  onClick={() => selectChapter(idx)}
                  className={`relative flex flex-col items-center justify-center py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-full text-center transition-all duration-300 ${
                    isActive
                      ? "bg-[rgb(72,125,72)] text-white shadow-md"
                      : "bg-transparent text-forest/70 hover:bg-[rgb(72,125,72)]/10 hover:text-forest"
                  }`}
                  aria-label={`Jump to ${ch.phase} - ${ch.title}`}
                >
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider uppercase">
                    {ch.phase.split("/")[0].trim()}
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold tracking-tight truncate max-w-full">
                    {ch.phase.split("/")[1]?.trim() || ch.id}
                  </span>

                  {isActive && !isPaused && (
                    <m.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 7.2, ease: "linear" }}
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-white/70 origin-left rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-full border border-[rgb(72,125,72)]/20 bg-white/80 text-[rgb(72,125,72)] hover:bg-[rgb(72,125,72)] hover:text-white transition-colors shrink-0 shadow-sm"
            aria-label={isPaused ? "Resume auto chapter presentation" : "Pause chapter presentation"}
            title={isPaused ? "Resume rotation" : "Pause rotation"}
          >
            {isPaused ? <Play className="h-3.5 w-3.5 ml-0.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
