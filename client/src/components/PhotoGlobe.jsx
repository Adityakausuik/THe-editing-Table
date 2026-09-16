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
 * Mathematical 3D Spherical Orbit Gallery.
 * Distributes photo cards around an invisible sphere in 3D space.
 * Updates DOM styles directly via requestAnimationFrame for zero-rerender 60 FPS performance.
 */
export function PhotoGlobe({ photos = [], onSelectPhoto }) {
  const containerRef = useRef(null);
  const cardRefs = useRef([]);

  const [isDragging, setIsDragging] = useState(false);

  // Mutable animation and interaction state
  const physicsRef = useRef({
    yaw: 0, // horizontal rotation angle around Y axis
    pitch: 0.04, // vertical pitch angle around X axis
    targetPitch: 0.04,
    velocityX: 0,
    velocityY: 0,
    baseAutoSpeed: 0.0022, // Cinematic slow Earth orbit speed
    currentAutoSpeed: 0.0022,
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
    // This creates an upright, photogenic orbital Earth without pole distortion.
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

      const sinYaw = Math.sin(state.yaw);
      const cosYaw = Math.cos(state.yaw);
      const sinPitch = Math.sin(state.pitch);
      const cosPitch = Math.cos(state.pitch);
      const R = state.radius;
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

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

        // Scaled 3D Cartesian coordinates
        const X = x2 * R;
        const Y = y2 * (R * 0.86); // Gentle elliptical compression for cinematic depth
        const Z = z2 * R;

        // Normalized depth t: 0 (deepest back) to 1 (front center)
        const t = (z2 + 1) / 2;

        // Dynamic scale: 0.58 (back) to 1.10 (front)
        const scale = 0.58 + 0.52 * t;

        // Dynamic opacity
        let opacity = 0.18 + 0.82 * Math.pow(t, 1.4);

        // Dynamic depth-of-field blur
        const blur = Math.max(0, (1 - t) * 5.2);

        // Strict Z-Index stacking
        const zIndex = Math.round(100 + t * 900);

        // Subtle orbital tangent rotation
        const rotY = -x2 * 30;
        const rotX = y2 * 16;

        // On mobile, hide back-facing cards to avoid clutter and keep 60 FPS
        if (isMobile && t < 0.28) {
          opacity = 0;
        }

        // Direct DOM transform assignment
        el.style.transform = `translate3d(${X.toFixed(1)}px, ${Y.toFixed(1)}px, ${Z.toFixed(1)}px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
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
        if (!state.isDragging) {
          if (state.isReducedMotion) {
            state.currentAutoSpeed = 0;
          } else {
            // Apply momentum deceleration or auto-rotation
            if (Math.abs(state.velocityX) > 0.0001) {
              state.yaw += state.velocityX;
              state.velocityX *= 0.94; // Momentum friction decay
            } else {
              const targetSpeed = state.isHovered ? 0.0006 : state.baseAutoSpeed;
              state.currentAutoSpeed += (targetSpeed - state.currentAutoSpeed) * 0.06;
              state.yaw += state.currentAutoSpeed;
            }

            if (Math.abs(state.velocityY) > 0.0001) {
              state.pitch += state.velocityY;
              state.velocityY *= 0.94;
            }
          }

          // Smoothly restore pitch toward clamped target
          state.pitch += (state.targetPitch - state.pitch) * 0.06;
          state.pitch = Math.max(-0.26, Math.min(0.26, state.pitch));
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
      if (dist > 6) {
        state.hasMoved = true;
      }

      state.yaw += deltaX * 0.0042;
      state.pitch -= deltaY * 0.0028;
      state.targetPitch = state.pitch;

      state.velocityX = deltaX * 0.0035;
      state.velocityY = -deltaY * 0.0022;

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
      const offsetY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      state.targetPitch = 0.04 + Math.max(-0.14, Math.min(0.14, offsetY * 0.12));
    }
  };

  const handlePointerEnter = () => {
    physicsRef.current.isHovered = true;
  };

  const handlePointerLeave = () => {
    physicsRef.current.isHovered = false;
    physicsRef.current.targetPitch = 0.04;
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
      {/* Ambient Spherical Glow */}
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
