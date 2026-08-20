import { useState } from "react";

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=85";

export default function ImageWithFallback({ src, alt, className = "", fallbackClassName = "" }) {
  const [hasError, setHasError] = useState(false);

  return (
    <img
      src={hasError || !src ? DEFAULT_FALLBACK_IMAGE : src}
      alt={alt}
      className={hasError ? (fallbackClassName || className) : className}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}
