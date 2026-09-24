import { createContext, useContext, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

const SmoothScrollContext = createContext(null);

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

/**
 * SmoothScrollProvider
 * Provides silky-smooth, inertia-damped scrolling on desktop wheel events.
 * Leaves mobile touch gestures 100% native (no scroll-jacking, no lag).
 * Honors prefers-reduced-motion.
 * Supports smooth anchor navigation.
 */
export default function SmoothScrollProvider({ children }) {
  const shouldReduceMotion = useReducedMotion();
  const stateRef = useRef({
    currentY: 0,
    targetY: 0,
    isScrolling: false,
    rafId: 0
  });

  useEffect(() => {
    if (shouldReduceMotion) return;

    const isTouchDevice =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || (window.navigator && window.navigator.maxTouchPoints > 0) || window.matchMedia("(pointer: coarse)").matches);

    if (isTouchDevice) {
      return;
    }

    const state = stateRef.current;
    state.currentY = window.scrollY;
    state.targetY = window.scrollY;

    const maxScroll = () =>
      document.documentElement.scrollHeight - window.innerHeight;

    const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

    const onTick = () => {
      const diff = state.targetY - state.currentY;
      state.currentY += diff * 0.12;

      if (Math.abs(diff) < 0.5) {
        state.currentY = state.targetY;
        window.scrollTo(0, state.currentY);
        state.isScrolling = false;
        return;
      }

      window.scrollTo(0, state.currentY);
      state.rafId = window.requestAnimationFrame(onTick);
    };

    const onWheel = (e) => {
      let el = e.target;
      while (el && el !== document.body && el !== document.documentElement) {
        const overflowY = window.getComputedStyle(el).overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
          return;
        }
        el = el.parentElement;
      }

      e.preventDefault();

      const delta = e.deltaY * (e.deltaMode === 1 ? 24 : 1);
      state.targetY = clamp(state.targetY + delta * 1.15, 0, maxScroll());

      if (!state.isScrolling) {
        state.isScrolling = true;
        state.rafId = window.requestAnimationFrame(onTick);
      }
    };

    const onScrollSync = () => {
      if (!state.isScrolling) {
        state.currentY = window.scrollY;
        state.targetY = window.scrollY;
      }
    };

    const onAnchorClick = (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      const targetEl = document.querySelector(hash);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 90;
        const targetPos = clamp(
          targetEl.getBoundingClientRect().top + window.scrollY - headerOffset,
          0,
          maxScroll()
        );
        state.targetY = targetPos;
        if (!state.isScrolling) {
          state.isScrolling = true;
          state.rafId = window.requestAnimationFrame(onTick);
        }
        if (window.history && window.history.pushState) {
          window.history.pushState(null, "", hash);
        }
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScrollSync, { passive: true });
    document.addEventListener("click", onAnchorClick);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScrollSync);
      document.removeEventListener("click", onAnchorClick);
      window.cancelAnimationFrame(state.rafId);
    };
  }, [shouldReduceMotion]);

  const scrollTo = (targetY) => {
    const state = stateRef.current;
    state.targetY = Math.max(0, Math.min(targetY, document.documentElement.scrollHeight - window.innerHeight));
    if (!state.isScrolling) {
      state.isScrolling = true;
      const animateStep = () => {
        const diff = state.targetY - state.currentY;
        state.currentY += diff * 0.12;
        window.scrollTo(0, state.currentY);
        if (Math.abs(diff) >= 0.5) {
          state.rafId = window.requestAnimationFrame(animateStep);
        } else {
          state.isScrolling = false;
        }
      };
      state.rafId = window.requestAnimationFrame(animateStep);
    }
  };

  return (
    <SmoothScrollContext.Provider value={{ scrollTo }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
