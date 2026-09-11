import { AnimatePresence, m } from "framer-motion";
import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ImageZoomModal({ isOpen, onClose, imageSrc, imageName, imageRole }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.3, 3.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const nextScale = Math.max(prev - 0.3, 1);
      if (nextScale === 1) setPosition({ x: 0, y: 0 });
      return nextScale;
    });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose?.();
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
      if (e.key === "0") handleReset();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, scale, onClose]);

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`${imageName || "Image"} viewer`}
      >
        {/* Floating Top Controls Header */}
        <div
          className="absolute left-4 right-4 top-4 z-50 flex flex-col items-stretch gap-3 pointer-events-auto sm:left-6 sm:right-6 sm:top-6 sm:flex-row sm:items-center sm:justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Member Name & Role */}
          <div className="min-w-0 rounded-2xl border border-white/10 bg-black/60 px-4 py-2.5 text-white backdrop-blur-md sm:px-5">
            <h3 className="font-heading text-lg sm:text-xl font-semibold leading-none">{imageName}</h3>
            {imageRole && <p className="text-xs text-site font-medium tracking-wider uppercase mt-1">{imageRole}</p>}
          </div>

          {/* Action Toolbar: Zoom Out, Zoom Reset, Zoom In, Close */}
          <div className="flex max-w-full items-center justify-center gap-1 self-end rounded-2xl border border-white/10 bg-black/60 p-1.5 text-white shadow-xl backdrop-blur-md sm:gap-2 sm:self-auto sm:p-2">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>

            <span className="text-xs font-mono font-semibold px-2 min-w-[50px] text-center text-site">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 3.5}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-white/15"
              title="Reset Zoom (0)"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <div className="h-5 w-px bg-white/20 mx-1" />

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-rose-600"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Center Image Container */}
        <div
          className="relative max-w-4xl max-h-[80vh] overflow-hidden rounded-3xl cursor-grab active:cursor-grabbing flex items-center justify-center"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => e.stopPropagation()}
        >
          <m.img
            src={imageSrc}
            alt={imageName}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? "none" : "transform 0.25s ease-out"
            }}
            className="max-h-[75vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl pointer-events-auto"
            draggable={false}
          />
        </div>

        {/* Bottom Helper Hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-5 py-2 text-xs text-white/70 backdrop-blur-md pointer-events-none hidden sm:block">
          Use mouse wheel or <span className="text-site font-bold">+</span> / <span className="text-site font-bold">-</span> keys to zoom • Drag to pan image
        </div>
      </m.div>
    </AnimatePresence>
  );
}
