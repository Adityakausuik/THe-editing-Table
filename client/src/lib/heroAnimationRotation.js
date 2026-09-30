import { useEffect, useMemo, useState } from "react";
import anim1 from "@animations/animation (1).mp4";
import anim2 from "@animations/animation (2).mp4";
import anim3 from "@animations/animation (3).mp4";

/**
 * FIXED REFERENCE DATE FOR WEEKLY ROTATION
 * January 5, 2026 was Monday 00:00:00 UTC (Week 1 start).
 * Week 1 (Jan 5 - Jan 11)   → Animation 1
 * Week 2 (Jan 12 - Jan 18)  → Animation 2
 * Week 3 (Jan 19 - Jan 25)  → Animation 3
 * Week 4 (Jan 26 - Feb 1)   → Animation 1
 * Week 5 (Feb 2 - Feb 8)    → Animation 2
 * Week 6 (Feb 9 - Feb 15)   → Animation 3
 * ... indefinitely.
 */
export const DEFAULT_ROTATION_REFERENCE_DATE = "2026-01-05T00:00:00Z";
export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export const HERO_ANIMATIONS = [
  {
    id: 1,
    name: "Animation 1",
    label: "Emerald Glass",
    description: "3D emerald glass typography with golden light trail & DaVinci Resolve orbit",
    src: anim1,
    accent: "rgba(72, 125, 72, 0.75)"
  },
  {
    id: 2,
    name: "Animation 2",
    label: "Frosted Sage Glass",
    description: "Ethereal frosted crystal & sage glass typography with soft luminous aura",
    src: anim2,
    accent: "rgba(143, 174, 123, 0.75)"
  },
  {
    id: 3,
    name: "Animation 3",
    label: "Editorial Typography",
    description: "Clean modern serif & solid sage typography with typewriter animation",
    src: anim3,
    accent: "rgba(47, 58, 47, 0.85)"
  }
];

/**
 * Calculates current rotation state based strictly on calendar date and reference date.
 * Pure function: deterministic, zero side-effects, does NOT depend on localStorage, sessions or reloads.
 */
export function calculateWeeklyRotation(currentDate = new Date(), referenceDateStr = DEFAULT_ROTATION_REFERENCE_DATE) {
  const refDate = new Date(referenceDateStr);
  const now = new Date(currentDate);

  const diffMs = now.getTime() - refDate.getTime();
  const elapsedWeeks = Math.floor(diffMs / MS_PER_WEEK);
  const weekNumber = elapsedWeeks + 1;

  // Modulo 3 arithmetic ensuring non-negative index
  const index = ((elapsedWeeks % 3) + 3) % 3; // 0, 1, or 2
  const nextIndex = (index + 1) % 3;

  // Calculate milliseconds until the next weekly period boundary
  const currentWeekStartMs = refDate.getTime() + elapsedWeeks * MS_PER_WEEK;
  const nextWeekStartMs = currentWeekStartMs + MS_PER_WEEK;
  const msUntilNextWeek = Math.max(1000, nextWeekStartMs - now.getTime());

  return {
    index,
    animationNumber: index + 1,
    weekNumber,
    currentAnimation: HERO_ANIMATIONS[index],
    nextAnimation: HERO_ANIMATIONS[nextIndex],
    msUntilNextWeek,
    nextTransitionDate: new Date(nextWeekStartMs)
  };
}

/**
 * Optional helper to read dev/preview override from URL query string (?anim=1|2|3)
 * strictly for testing/previewing without altering default date-driven rotation.
 */
function getPreviewOverride() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const animParam = params.get("anim") || params.get("animation") || params.get("previewAnimation");
    if (animParam) {
      const parsed = parseInt(animParam, 10);
      if (parsed >= 1 && parsed <= 3) {
        return parsed - 1; // Convert 1-indexed to 0-indexed
      }
    }
  } catch {
    // Ignore URL parsing errors
  }
  return null;
}

/**
 * React hook managing active hero animation with automatic weekly rollover.
 */
export function useWeeklyHeroAnimation(referenceDateStr = DEFAULT_ROTATION_REFERENCE_DATE) {
  const [overrideIndex, setOverrideIndex] = useState(() => getPreviewOverride());
  const [rotationState, setRotationState] = useState(() => calculateWeeklyRotation(new Date(), referenceDateStr));

  // Automatically refresh calculation at weekly boundary or periodically check
  useEffect(() => {
    let timerId;

    function scheduleNextCheck() {
      const state = calculateWeeklyRotation(new Date(), referenceDateStr);
      setRotationState(state);

      // Max timeout clamp: 24 hours to prevent 32-bit setTimeout overflow
      const delay = Math.min(state.msUntilNextWeek, 24 * 60 * 60 * 1000);
      timerId = setTimeout(() => {
        scheduleNextCheck();
      }, delay);
    }

    scheduleNextCheck();

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [referenceDateStr]);

  const activeIndex = overrideIndex !== null ? overrideIndex : rotationState.index;
  const activeAnimation = HERO_ANIMATIONS[activeIndex];
  const nextAnimation = HERO_ANIMATIONS[(activeIndex + 1) % 3];

  return useMemo(
    () => ({
      currentAnimation: activeAnimation,
      nextAnimation,
      animationNumber: activeIndex + 1,
      weekNumber: rotationState.weekNumber,
      isOverridden: overrideIndex !== null,
      nextTransitionDate: rotationState.nextTransitionDate,
      setPreviewAnimation: (num) => {
        if (num === null || num === undefined) {
          setOverrideIndex(null);
        } else {
          const idx = Math.max(0, Math.min(2, num - 1));
          setOverrideIndex(idx);
        }
      }
    }),
    [activeAnimation, nextAnimation, activeIndex, rotationState.weekNumber, rotationState.nextTransitionDate, overrideIndex]
  );
}
