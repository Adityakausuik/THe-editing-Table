import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { MapPin } from "lucide-react";
import { GLOBAL_LOCATIONS } from "../../data/globalLocations.js";

const GLOBE_RADIUS = 1.35;

/**
 * Converts geographic latitude and longitude into 3D Cartesian coordinates on the globe
 */
export function latLonToVector3(lat, lon, radius = GLOBE_RADIUS) {
  const latRad = lat * (Math.PI / 180);
  const lonRad = lon * (Math.PI / 180);
  const x = radius * Math.cos(latRad) * Math.sin(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.cos(lonRad);
  return new THREE.Vector3(x, y, z);
}

/**
 * Builds an elevated 3D bezier arc curve connecting two points on the sphere surface
 */
function createCurvedArc(p1, p2, radius = GLOBE_RADIUS) {
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const distance = p1.distanceTo(p2);
  const elevation = radius + 0.18 + distance * 0.14;
  mid.normalize().multiplyScalar(elevation);
  return new THREE.QuadraticBezierCurve3(p1, mid, p2);
}

export default function Interactive3DGlobe({
  activeLocation,
  locations = GLOBAL_LOCATIONS,
  onSelectLocation,
  onUserInteractionChange,
}) {
  const mountRef = useRef(null);
  const labelRef = useRef(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [activeLabelPos, setActiveLabelPos] = useState({ x: 0, y: 0, visible: false });

  // Location references for real-time reactivity without WebGL context destruction
  const activeLocationRef = useRef(activeLocation);
  activeLocationRef.current = activeLocation;
  const locationsRef = useRef(locations);
  locationsRef.current = locations;

  const rebuildMarkersRef = useRef(null);
  const rebuildArcsRef = useRef(null);

  // Interaction refs
  const isDragging = useRef(false);
  const pointerStart = useRef({ x: 0, y: 0 });
  const prevPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0.25, y: -0.96 }); // Initial Dubai focus
  const currentRotation = useRef({ x: 0.25, y: -0.96 });
  const idleTimer = useRef(null);

  // Update target rotation & arcs when activeLocation changes
  useEffect(() => {
    if (!activeLocation) return;
    const latRad = activeLocation.lat * (Math.PI / 180);
    const lonRad = activeLocation.lon * (Math.PI / 180);
    targetRotation.current = {
      x: Math.max(-0.6, Math.min(0.7, latRad * 0.65)),
      y: -lonRad
    };
    if (rebuildArcsRef.current) {
      rebuildArcsRef.current(activeLocation.id, locationsRef.current);
    }
  }, [activeLocation]);

  // Update 3D markers and arcs when locations prop updates from CMS
  useEffect(() => {
    if (rebuildMarkersRef.current && rebuildArcsRef.current) {
      rebuildMarkersRef.current(locations);
      rebuildArcsRef.current(activeLocationRef.current?.id, locations);
    }
  }, [locations]);

  const notifyUserInteraction = useCallback((interacting) => {
    if (onUserInteractionChange) {
      onUserInteractionChange(interacting);
    }
  }, [onUserInteractionChange]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement("canvas");
      const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    let animationFrameId;
    let width = container.clientWidth || 480;
    let height = container.clientHeight || 480;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(aspect < 1 ? 40 / aspect : 40, aspect, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xfffef8, 0.95);
    scene.add(ambientLight);

    // Key directional light (top-left, warm sunlight)
    const keyLight = new THREE.DirectionalLight(0xfff7e8, 2.1);
    keyLight.position.set(-3.2, 2.8, 3.4);
    scene.add(keyLight);

    // Soft rim light (bottom-right, cool sage fill)
    const rimLight = new THREE.DirectionalLight(0x769b82, 0.85);
    rimLight.position.set(3.5, -1.8, -2.0);
    scene.add(rimLight);

    // 4. Grounding Shadow Plane
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext("2d");
    const shadowGrad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
    shadowGrad.addColorStop(0, "rgba(45, 60, 40, 0.35)");
    shadowGrad.addColorStop(0.4, "rgba(50, 70, 45, 0.16)");
    shadowGrad.addColorStop(1, "rgba(50, 70, 45, 0)");
    sCtx.fillStyle = shadowGrad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(2.8, 2.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.45;
    scene.add(shadowMesh);

    // 5. Globe Root Group (rotated by user / animation)
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 6. Earth Mesh
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load("/assets/earth_editorial.jpg");
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    const earthBump = textureLoader.load("/assets/earth_bump.jpg");

    const sphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      bumpMap: earthBump,
      bumpScale: 0.035,
      roughness: 0.78,
      metalness: 0.08
    });
    const earthMesh = new THREE.Mesh(sphereGeo, sphereMat);
    // Align texture center (lon 0, lat 0) with mathematical coordinates
    earthMesh.rotation.y = -Math.PI / 2;
    globeGroup.add(earthMesh);

    // 7. Atmospheric Fresnel Glow Layer
    const atmoGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.018, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.2);
          // Soft golden-sage atmospheric glow
          vec3 glowColor = mix(vec3(0.95, 0.88, 0.65), vec3(0.65, 0.85, 0.70), 0.45);
          gl_FragColor = vec4(glowColor, fresnel * 0.48);
        }
      `
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmoMesh);

    // 8. Location Markers & Interactive Hit Targets
    const markerGroup = new THREE.Group();
    globeGroup.add(markerGroup);

    const arcGroup = new THREE.Group();
    globeGroup.add(arcGroup);

    const pulseRings = [];
    const arcParticles = [];

    // Function to dynamically rebuild markers for current active locations
    function rebuildMarkers(currentLocations) {
      while (markerGroup.children.length > 0) {
        const obj = markerGroup.children[0];
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        markerGroup.remove(obj);
      }
      pulseRings.length = 0;

      const locs = currentLocations && currentLocations.length > 0 ? currentLocations : GLOBAL_LOCATIONS;
      locs.forEach((loc) => {
        const pos = latLonToVector3(loc.lat, loc.lon, GLOBE_RADIUS);

        // Core glowing golden pin dot
        const dotGeo = new THREE.SphereGeometry(0.026, 16, 16);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xf5d36e });
        const dotMesh = new THREE.Mesh(dotGeo, dotMat);
        dotMesh.position.copy(pos);
        dotMesh.userData = { locationId: loc.id };
        markerGroup.add(dotMesh);

        // Outer ripple ring
        const ringGeo = new THREE.RingGeometry(0.038, 0.054, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xecd185,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.copy(pos.clone().multiplyScalar(1.006));
        ringMesh.lookAt(pos.clone().multiplyScalar(2));
        ringMesh.userData = { locationId: loc.id, baseScale: 1.0 };
        markerGroup.add(ringMesh);

        pulseRings.push({ mesh: ringMesh, locId: loc.id });
      });
    }

    // 9. Rebuild connecting arcs radiating from active hub
    function rebuildArcs(currentActiveId, currentLocations) {
      while (arcGroup.children.length > 0) {
        const obj = arcGroup.children[0];
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        arcGroup.remove(obj);
      }
      arcParticles.length = 0;

      const locs = currentLocations && currentLocations.length > 0 ? currentLocations : GLOBAL_LOCATIONS;
      const activeLoc = locs.find((l) => l.id === currentActiveId) || locs[0];
      if (!activeLoc) return;
      const pActive = latLonToVector3(activeLoc.lat, activeLoc.lon, GLOBE_RADIUS);

      locs.forEach((destLoc) => {
        if (destLoc.id === activeLoc.id) return;
        const pDest = latLonToVector3(destLoc.lat, destLoc.lon, GLOBE_RADIUS);
        const curve = createCurvedArc(pActive, pDest, GLOBE_RADIUS);
        const points = curve.getPoints(50);

        // Glowing golden line
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xe6c578,
          transparent: true,
          opacity: 0.72,
          linewidth: 1.5
        });
        const lineMesh = new THREE.Line(lineGeo, lineMat);
        arcGroup.add(lineMesh);

        // Traveling light pulse particle
        const particleGeo = new THREE.SphereGeometry(0.022, 12, 12);
        const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const particleMesh = new THREE.Mesh(particleGeo, particleMat);
        arcGroup.add(particleMesh);

        arcParticles.push({
          mesh: particleMesh,
          curve,
          progress: Math.random() // staggered offset
        });
      });
    }

    // Expose helpers via refs
    rebuildMarkersRef.current = rebuildMarkers;
    rebuildArcsRef.current = rebuildArcs;

    // Initial build
    rebuildMarkers(locationsRef.current);
    rebuildArcs(activeLocationRef.current?.id, locationsRef.current);

    // 10. Pointer Drag & Click Handling (Mouse & Touch)
    const onPointerDown = (e) => {
      isDragging.current = true;
      velocity.current = { x: 0, y: 0 };
      pointerStart.current = { x: e.clientX, y: e.clientY };
      prevPointer.current = { x: e.clientX, y: e.clientY };
      notifyUserInteraction(true);

      if (idleTimer.current) clearTimeout(idleTimer.current);
    };

    const onPointerMove = (e) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - prevPointer.current.x;
      const deltaY = e.clientY - prevPointer.current.y;
      prevPointer.current = { x: e.clientX, y: e.clientY };

      const rotSpeed = 0.0055;
      targetRotation.current.y += deltaX * rotSpeed;
      targetRotation.current.x += deltaY * rotSpeed;
      // Clamp vertical pitch so user doesn't flip the globe upside down
      targetRotation.current.x = Math.max(-0.75, Math.min(0.75, targetRotation.current.x));

      velocity.current = { x: deltaY * rotSpeed, y: deltaX * rotSpeed };
    };

    const onPointerUp = (e) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      // Detect click on location marker pins
      const dragDist = Math.hypot(e.clientX - pointerStart.current.x, e.clientY - pointerStart.current.y);
      if (dragDist < 6 && onSelectLocation) {
        const rect = canvasElem.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(markerGroup.children);
        if (intersects.length > 0) {
          const hitLocId = intersects[0].object.userData?.locationId;
          if (hitLocId) {
            const locs = locationsRef.current || GLOBAL_LOCATIONS;
            const hitIdx = locs.findIndex((l) => l.id === hitLocId);
            if (hitIdx !== -1) {
              onSelectLocation(hitIdx);
            }
          }
        }
      }

      // Resume auto-rotation after 8 seconds of idle
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        notifyUserInteraction(false);
      }, 8000);
    };

    const canvasElem = renderer.domElement;
    canvasElem.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    // 11. Resize handling
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          width = cr.width;
          height = cr.height;
          const currentAspect = width / height;
          camera.aspect = currentAspect;
          camera.fov = currentAspect < 1 ? 40 / currentAspect : 40;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    // 12. Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth damping interpolation towards target rotation
      if (isDragging.current) {
        currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.35;
        currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.35;
      } else {
        // Apply residual inertia if any
        if (Math.abs(velocity.current.y) > 0.0001) {
          targetRotation.current.y += velocity.current.y;
          velocity.current.y *= 0.94;
        }
        currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.065;
        currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.065;
      }

      globeGroup.rotation.x = currentRotation.current.x;
      globeGroup.rotation.y = currentRotation.current.y;

      // Pulse location rings (read from activeLocationRef for fresh reactivity)
      const curActiveLoc = activeLocationRef.current;
      pulseRings.forEach((p) => {
        const isActive = p.locId === curActiveLoc?.id;
        const speed = isActive ? 3.0 : 1.8;
        const wave = (time * speed) % 1;
        const scale = isActive ? 1.0 + wave * 1.5 : 1.0 + wave * 0.8;
        p.mesh.scale.set(scale, scale, 1);
        p.mesh.material.opacity = isActive ? (1 - wave) * 0.9 : (1 - wave) * 0.45;
      });

      // Animate arc traveling light particles
      arcParticles.forEach((p) => {
        p.progress = (p.progress + delta * 0.42) % 1;
        const pt = p.curve.getPoint(p.progress);
        p.mesh.position.copy(pt);
      });

      // Project Active Location to 2D Screen Space for the Floating Label
      if (curActiveLoc) {
        const localPos = latLonToVector3(curActiveLoc.lat, curActiveLoc.lon, GLOBE_RADIUS);
        const worldPos = localPos.clone().applyMatrix4(globeGroup.matrixWorld);

        // Vector pointing from world center to marker
        const normal = worldPos.clone().normalize();
        const camDir = camera.position.clone().normalize();
        const dot = normal.dot(camDir);

        if (dot > 0.12) {
          // Facing camera
          const projected = worldPos.clone().project(camera);
          const screenX = (projected.x * 0.5 + 0.5) * width;
          const screenY = (-(projected.y * 0.5) + 0.5) * height;
          setActiveLabelPos({
            x: screenX,
            y: screenY,
            visible: true
          });
        } else {
          setActiveLabelPos((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      rebuildMarkersRef.current = null;
      rebuildArcsRef.current = null;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (idleTimer.current) clearTimeout(idleTimer.current);

      canvasElem.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [notifyUserInteraction, onSelectLocation]);

  return (
    <div className="relative w-full max-w-[420px] mx-auto h-[230px] sm:h-[260px] md:h-[300px] lg:h-[340px] xl:h-[390px] flex items-center justify-center select-none overflow-hidden touch-none">
      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none flex items-center justify-center"
      />

      {/* Floating 3D Projected Location Pill Label */}
      {activeLocation && activeLabelPos.visible && (
        <div
          ref={labelRef}
          style={{
            left: `${activeLabelPos.x}px`,
            top: `${activeLabelPos.y}px`,
            transform: "translate(-50%, -135%)"
          }}
          className="pointer-events-none absolute z-20 flex items-center gap-1.5 rounded-full border border-[#D5E0CF] bg-[#FBFDF9]/95 px-3 py-1.5 shadow-[0_4px_20px_rgba(35,55,30,0.14)] backdrop-blur-md transition-opacity duration-300 animate-in fade-in zoom-in-95"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#EAF2E6] text-[#3D693D]">
            <MapPin className="h-2.5 w-2.5 stroke-[2.4]" />
          </span>
          <span className="font-heading text-xs sm:text-[13px] font-semibold text-[#1B3322] whitespace-nowrap">
            {activeLocation.label}
          </span>
        </div>
      )}

      {/* Graceful Fallback if WebGL is disabled/unavailable */}
      {!webglSupported && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#F2F7F0]/60 rounded-3xl border border-sage-border">
          <div className="h-20 w-20 rounded-full border border-sage-border bg-white flex items-center justify-center text-site mb-3 shadow-xs">
            <MapPin className="h-8 w-8" />
          </div>
          <h3 className="font-heading text-xl font-normal text-forest">{activeLocation?.label || "Global Reach"}</h3>
          <p className="text-xs text-sage-muted mt-1 max-w-xs">
            Interactive 3D acceleration is not available in this environment, but all global suites remain fully operational.
          </p>
        </div>
      )}
    </div>
  );
}
