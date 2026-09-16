import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import PhotoGlobeCard from "./PhotoGlobeCard.jsx";
import "../styles/photo-globe.css";

/**
 * PhotoGlobe Component
 * Mathematical 3D Spherical Orbit Gallery with enhanced velocity,
 * momentum inertia physics, harmonic floating waves, and cursor parallax.
 */
export function PhotoGlobe({ photos = [], onSelectPhoto }) {
  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const timeRef = useRef(0);

  const [isDragging, setIsDragging] = useState(false);

  // Mutable animation and interaction physics state
  const physicsRef = useRef({
    yaw: 0, // horizontal rotation angle around Y axis
    pitch: 0.04, // vertical pitch angle around X axis
    targetPitch: 0.04,
    yawParallax: 0,
    velocityX: 0,
    velocityY: 0,
    baseAutoSpeed: 0.0050, // Faster, lively, cinematic orbital velocity
    currentAutoSpeed: 0.0050,
    isHovered: false,
    isDragging: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    radius: 380,
    isReducedMotion: false,
    isVisible: true,
  });

  // Calculate precomputed spherical unit coordinates for each photo card
  const sphereCoordinates = useMemo(() => {
    const count = photos.length;
    if (count === 0) return [];

    // Distribute across 3 orbital rings: Upper (+22°), Equator (0°), Lower (-22°)
    const rings = [
      { latDeg: 22, count: Math.ceil(count / 3), phase: 0 },
      { latDeg: 0, count: Math.round(count / 3), phase: Math.PI / count },
      { latDeg: -22, count: count - Math.ceil(count / 3) - Math.round(count / 3), phase: 0 },
    ];

    const coords = [];
    let photoIndex = 0;

    rings.forEach((ring) => {
      const latRad = (ring.latDeg * Math.PI) / 180;
      const ringRadius = Math.cos(latRad);
      const ringY = -Math.sin(latRad); // In CSS coordinate system, negative Y is UP

      for (let j = 0; j < ring.count && photoIndex < count; j++) {
        const theta = (2 * Math.PI * j) / ring.count + ring.phase;
        const x = ringRadius * Math.sin(theta);
        const z = ringRadius * Math.cos(theta);

        coords.push({
          x0: x,
          y0: ringY,
          z0: z,
          photo: photos[photoIndex],
          index: photoIndex,
        });
        photoIndex++;
      }
    });

    return coords;
  }, [photos]);

  // Adjust sphere radius responsively
  const updateRadius = useCallback(() => {
    const width = typeof window !== "undefined" ? window.innerWidth : 1200;
    if (width >= 1200) {
      physicsRef.current.radius = 380;
    } else if (width >= 1024) {
      physicsRef.current.radius = 340;
    } else if (width >= 768) {
      physicsRef.current.radius = 280;
    } else {
      physicsRef.current.radius = 185;
    }
  }, []);

  // Update card styles directly in the DOM (Zero React Re-renders!)
  const updateCardStyles = useCallback(
    (force = false) => {
      const state = physicsRef.current;
      if (!state.isVisible && !force) return;

      const effectiveYaw = state.yaw + state.yawParallax;
      const sinYaw = Math.sin(effectiveYaw);
      const cosYaw = Math.cos(effectiveYaw);
      const sinPitch = Math.sin(state.pitch);
      const cosPitch = Math.cos(state.pitch);
      const R = state.radius;
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const time = timeRef.current;

      sphereCoordinates.forEach((coord, i) => {
        const el = cardRefs.current[i];
        if (!el) return;

        // 1. Yaw rotation around Y axis
        const x1 = coord.x0 * cosYaw + coord.z0 * sinYaw;
        const y1 = coord.y0;
        const z1 = -coord.x0 * sinYaw + coord.z0 * cosYaw;

        // 2. Pitch rotation around X axis
        const x2 = x1;
        const y2 = y1 * cosPitch - z1 * sinPitch;
        const z2 = y1 * sinPitch + z1 * cosPitch;

        // Normalized depth t: 0 (deepest back) to 1 (front center)
        const t = (z2 + 1) / 2;

        // Micro-harmonic floating wave motion
        const floatY = Math.sin(time + i * 0.58) * 7.5;
        const floatTilt = Math.cos(time + i * 0.58) * 2.2;

        // Scaled 3D Cartesian coordinates
        const X = x2 * R;
        const Y = y2 * (R * 0.86) + floatY * (0.3 + 0.7 * t);
        const Z = z2 * R;

        // Dynamic scale: 0.54 (back) to 1.14 (front)
        const scale = 0.54 + 0.60 * t;

        // Dynamic opacity
        let opacity = 0.18 + 0.82 * Math.pow(t, 1.4);

        // Dynamic depth-of-field blur
        const blur = Math.max(0, (1 - t) * 5.2);

        // Strict Z-Index stacking
        const zIndex = Math.round(100 + t * 900);

        // Orbital tangent rotation + micro harmonic tilt
        const rotY = -x2 * 32;
        const rotX = y2 * 16;
        const rotZ = floatTilt;

        // On mobile, hide back-facing cards to avoid clutter and keep 60 FPS
        if (isMobile && t < 0.28) {
          opacity = 0;
        }

        // Direct DOM transform assignment
        el.style.transform = `translate3d(${X.toFixed(1)}px, ${Y.toFixed(1)}px, ${Z.toFixed(1)}px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
        el.style.opacity = opacity.toFixed(3);
        el.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : "none";
        el.style.zIndex = zIndex;
        el.style.pointerEvents = opacity > 0.3 ? "auto" : "none";
      });
    },
    [sphereCoordinates]
  );

  // Main Animation & Transformation Loop
  useEffect(() => {
    updateRadius();

    // Reduced motion preference
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    physicsRef.current.isReducedMotion = motionQuery.matches;
    const handleMotionChange = (e) => {
      physicsRef.current.isReducedMotion = e.matches;
    };
    motionQuery.addEventListener("change", handleMotionChange);

    // Initial positioning pass immediately on mount
    updateCardStyles(true);

    const handleResize = () => {
      updateRadius();
      updateCardStyles(true);
    };
    window.addEventListener("resize", handleResize);

    // Viewport Intersection Detection with generous rootMargin
    const observer = new IntersectionObserver(
      ([entry]) => {
        physicsRef.current.isVisible = entry.isIntersecting;
        if (entry.isIntersecting) {
          updateCardStyles(true);
        }
      },
      { threshold: 0, rootMargin: "350px 0px 350px 0px" }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Tab visibility handling
    const handleVisibilityChange = () => {
      physicsRef.current.isVisible = !document.hidden;
      if (!document.hidden) {
        updateCardStyles(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let animationFrameId;

    const render = () => {
      const state = physicsRef.current;

      if (state.isVisible) {
        // Increment wave time
        timeRef.current += 0.024;

        if (!state.isDragging) {
          if (state.isReducedMotion) {
            state.currentAutoSpeed = 0;
          } else {
            // Apply momentum deceleration or auto-rotation with higher inertia retention
            if (Math.abs(state.velocityX) > 0.0001) {
              state.yaw += state.velocityX;
              state.velocityX *= 0.965; // Luxurious coasting momentum
            } else {
              // Cruise speed: slower on hover, lively on idle
              const targetSpeed = state.isHovered ? 0.0016 : state.baseAutoSpeed;
              state.currentAutoSpeed += (targetSpeed - state.currentAutoSpeed) * 0.08;
              state.yaw += state.currentAutoSpeed;
            }

            if (Math.abs(state.velocityY) > 0.0001) {
              state.pitch += state.velocityY;
              state.velocityY *= 0.965;
            }
          }

          // Smoothly restore pitch toward clamped target
          state.pitch += (state.targetPitch - state.pitch) * 0.07;
          state.pitch = Math.max(-0.28, Math.min(0.28, state.pitch));
        }

        updateCardStyles();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      motionQuery.removeEventListener("change", handleMotionChange);
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sphereCoordinates, updateRadius, updateCardStyles]);

  // Pointer / Drag & Momentum Handlers
  const handlePointerDown = (e) => {
    // Only primary click / touch
    if (e.button !== undefined && e.button !== 0) return;

    const state = physicsRef.current;
    state.isDragging = true;
    state.hasMoved = false;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.velocityX = 0;
    state.velocityY = 0;

    setIsDragging(true);

    const onPointerMove = (ev) => {
      const deltaX = ev.clientX - state.lastX;
      const deltaY = ev.clientY - state.lastY;

      const dist = Math.hypot(ev.clientX - state.startX, ev.clientY - state.startY);
      if (dist > 5) {
        state.hasMoved = true;
      }

      // Responsive manual drag
      state.yaw += deltaX * 0.0052;
      state.pitch -= deltaY * 0.0035;
      state.targetPitch = state.pitch;

      // Momentum velocity capture
      state.velocityX = deltaX * 0.0048;
      state.velocityY = -deltaY * 0.0030;

      state.lastX = ev.clientX;
      state.lastY = ev.clientY;
    };

    const onPointerUp = () => {
      state.isDragging = false;
      setIsDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handlePointerMoveContainer = (e) => {
    const state = physicsRef.current;
    // Parallax when hovering without dragging
    if (!state.isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const offsetY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      state.targetPitch = 0.04 + Math.max(-0.20, Math.min(0.20, offsetY * 0.16));
      state.yawParallax = Math.max(-0.16, Math.min(0.16, offsetX * 0.12));
    }
  };

  const handlePointerEnter = () => {
    physicsRef.current.isHovered = true;
  };

  const handlePointerLeave = () => {
    physicsRef.current.isHovered = false;
    physicsRef.current.targetPitch = 0.04;
    physicsRef.current.yawParallax = 0;
  };

  // Card Selection Handler (distinguishes drag release vs intentional click)
  const handleCardClick = (photo) => {
    if (physicsRef.current.hasMoved) {
      return;
    }
    if (onSelectPhoto) {
      onSelectPhoto(photo);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`photo-globe-viewport select-none ${isDragging ? "is-dragging" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMoveContainer}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      role="region"
      aria-label="Interactive 3D Photo Globe Gallery"
    >
      {/* Ambient Spherical Atmospheric Glow */}
      <div className="photo-globe-ambient" aria-hidden="true" />

      {/* Atmospheric Orbital Depth Rings */}
      <div className="photo-globe-ring photo-globe-ring-equator" aria-hidden="true" />
      <div className="photo-globe-ring photo-globe-ring-upper" aria-hidden="true" />
      <div className="photo-globe-ring photo-globe-ring-lower" aria-hidden="true" />

      {/* Center 3D Projection Stage */}
      <div className="photo-globe-stage" aria-hidden="false">
        {sphereCoordinates.map((coord, i) => (
          <PhotoGlobeCard
            key={coord.photo.id || coord.index}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            photo={coord.photo}
            onClick={handleCardClick}
          />
        ))}
      </div>
    </div>
  );
}

export default PhotoGlobe;
