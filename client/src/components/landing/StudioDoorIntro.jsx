import { m, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import logo from "../../assets/the-editing-table-logo.png";

export default function StudioDoorIntro({ onComplete }) {
  const shouldReduceMotion = useReducedMotion();
  const [isOpening, setIsOpening] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // If user prefers reduced motion, skip intro immediately
    if (shouldReduceMotion) {
      setIsComplete(true);
      if (onComplete) onComplete();
      return;
    }

    // Lock page scroll while doors are present and opening
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    // 1. Hold doors closed briefly (~300ms)
    const openTimer = window.setTimeout(() => {
      setIsOpening(true);
    }, 320);

    // 2. Complete opening animation after 1.85s total
    const completeTimer = window.setTimeout(() => {
      setIsComplete(true);
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      if (onComplete) onComplete();
    }, 1850);

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(completeTimer);
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [shouldReduceMotion, onComplete]);

  if (isComplete) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden select-none ${
        isOpening ? "pointer-events-none" : "pointer-events-auto"
      }`}
      aria-hidden="true"
    >
      {/* LEFT DOOR */}
      <m.div
        initial={{ x: "0%" }}
        animate={{ x: isOpening ? "-100%" : "0%" }}
        transition={{
          duration: 1.5,
          ease: [0.76, 0, 0.24, 1]
        }}
        className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-br from-[#F8FBF7] via-[#F2F7F0] to-[#EBF3E8] border-r border-sage-border/80 shadow-[10px_0_40px_rgba(26,36,26,0.08)] flex items-center justify-end"
      >
        {/* Luxury architectural paneling on left door */}
        <div className="absolute inset-4 sm:inset-8 border border-sage-border/50 rounded-2xl sm:rounded-3xl pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-[rgb(72,125,72)]/30 to-transparent" />
      </m.div>

      {/* RIGHT DOOR */}
      <m.div
        initial={{ x: "0%" }}
        animate={{ x: isOpening ? "100%" : "0%" }}
        transition={{
          duration: 1.5,
          ease: [0.76, 0, 0.24, 1]
        }}
        className="absolute top-0 bottom-0 right-0 w-1/2 bg-gradient-to-bl from-[#F8FBF7] via-[#F2F7F0] to-[#EBF3E8] border-l border-sage-border/80 shadow-[-10px_0_40px_rgba(26,36,26,0.08)] flex items-center justify-start"
      >
        {/* Luxury architectural paneling on right door */}
        <div className="absolute inset-4 sm:inset-8 border border-sage-border/50 rounded-2xl sm:rounded-3xl pointer-events-none" />
        <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-[rgb(72,125,72)]/30 to-transparent" />
      </m.div>

      {/* CENTER STUDIO EMBLEM & LOGO OVERLAY */}
      <m.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{
          opacity: isOpening ? 0 : 1,
          scale: isOpening ? 1.04 : 1
        }}
        transition={{
          duration: isOpening ? 0.7 : 0.4,
          ease: "easeInOut"
        }}
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30"
      >
        {/* Ambient aura behind intro logo */}
        <div className="absolute h-64 w-64 sm:h-80 sm:w-80 rounded-full bg-[radial-gradient(circle,rgba(72,125,72,0.18)_0%,rgba(200,216,190,0.08)_50%,transparent_70%)] blur-2xl pointer-events-none" />

        {/* Central Studio Logo */}
        <div className="relative flex flex-col items-center gap-3 sm:gap-4 px-6 text-center">
          <img
            src={logo}
            alt="The Editing Table"
            className="w-56 sm:w-72 md:w-84 lg:w-96 max-w-[85vw] h-auto object-contain drop-shadow-[0_8px_30px_rgba(72,125,72,0.18)]"
            loading="eager"
            decoding="sync"
          />

          {/* Subtle Studio Entrance Cue */}
          <m.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: isOpening ? 0 : 0.85, y: isOpening ? -4 : 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-2 text-[10px] sm:text-xs tracking-[0.28em] uppercase text-site/80 font-medium"
          >
            <span className="h-[1px] w-6 bg-sage-light/60" />
            <span>Creative Studio</span>
            <span className="h-[1px] w-6 bg-sage-light/60" />
          </m.div>
        </div>
      </m.div>

      {/* CENTER REVEAL LIGHT BEAM */}
      {isOpening && (
        <m.div
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-20"
        />
      )}
    </div>
  );
}
