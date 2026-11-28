import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, mediaUrl, subscribeToCmsChanges } from "../../lib/api.js";
import { getYouTubeId } from "../../utils/youtube.js";
import { isVideoMedia, isImageMedia } from "../../utils/mediaUtils.js";
import HeroSectionVideo from "./HeroSectionVideo.jsx";

/**
 * The Editing Table – Dynamic Multi-Slide Editorial Hero Section.
 * Features:
 * 1. Background Video Layer: High-performance Neon PostgreSQL BYTEA chunk-streamed
 *    or YouTube video player with live opacity & focal positioning.
 * 2. Multi-Slide Carousel: Rotates every 5 seconds across published Hero Slides
 *    with interactive navigation, pause-on-hover, and silky transitions.
 * 3. Graceful Fallback: Editorial minimal branding ("You Shoot. WE EDIT.") when 0 slides exist.
 */

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;600;700&display=swap');
.et-hero{
  --bg:#eef2ea; --bg2:#dfe8d5; --moss:#6d8f4f; --deep:#4d6e38; --ink:#33422d; --muted:#5f6f58;
  --raw:#a9aea6; --glass:rgba(255,255,255,.45); --edge:rgba(255,255,255,.9); --shadow:rgba(60,85,50,.25);
  --cut:#e8833a; --cutink:#2a1708; --pad:clamp(12px,3vw,32px);
  box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);
  position:relative;
}
@media (prefers-color-scheme:dark){.et-hero:not([data-theme="light"]){
  --bg:#131912; --bg2:#1b2519; --moss:#9dc07a; --deep:#b8d998; --ink:#e4ecdc; --muted:#a3b39a;
  --raw:#5b6157; --glass:rgba(255,255,255,.06); --edge:rgba(255,255,255,.22); --shadow:rgba(0,0,0,.55); --cut:#f2a065;}}
.et-hero[data-theme="dark"]{
  --bg:#131912; --bg2:#1b2519; --moss:#9dc07a; --deep:#b8d998; --ink:#e4ecdc; --muted:#a3b39a;
  --raw:#5b6157; --glass:rgba(255,255,255,.06); --edge:rgba(255,255,255,.22); --shadow:rgba(0,0,0,.55); --cut:#f2a065;}
.et-hero *,.et-hero *::before,.et-hero *::after{box-sizing:inherit}
.et-hero{margin:0;min-height:100%;background:var(--bg);color:var(--ink);font-family:'Manrope',system-ui,sans-serif;
  background-image:radial-gradient(ellipse 70% 55% at 85% -10%,rgba(255,255,255,.5),transparent 60%),
  radial-gradient(ellipse 60% 50% at 8% 110%,var(--bg2),transparent 65%)}

.hero{
  position:relative;
  overflow:hidden;
  min-height:70vh;
  min-height:calc(74svh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));
  display:flex;
  align-items:center;
  justify-content:center;
  padding:calc(64px + clamp(20px,4.5vh,52px)) max(clamp(16px,4vw,40px),env(safe-area-inset-right,0px)) clamp(28px,5vh,60px) max(clamp(16px,4vw,40px),env(safe-area-inset-left,0px));
  text-align:center;
}

.stage{
  position:relative;
  width:min(960px,100%);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:clamp(8px,1.6vw,16px);
  z-index:1;
  text-align:center;
}

.hero::before{
  content:'';position:absolute;width:min(60vw,600px);aspect-ratio:1;left:50%;top:38%;translate:-50% -50%;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--moss) 35%,transparent),transparent 68%);filter:blur(30px);pointer-events:none
}

.title{
  width:100%;
  display:flex;
  justify-content:center;
  align-items:center;
}

h1.fallback-h1{
  margin:0;
  padding:0;
  display:flex;
  align-items:baseline;
  justify-content:center;
  flex-wrap:wrap;
  gap:0 clamp(0.12em,1.4vw,0.28em);
  font-weight:400;
  line-height:1.08;
  text-align:center;
}

.script{
  font-family:'Alex Brush',cursive;
  font-size:clamp(2.2rem,6.8vw,5.6rem);
  font-weight:400;
  display:inline-block;
  transform:rotate(-3deg);
  transform-origin:85% 65%;
  margin-right:-0.05em;
  line-height:0.92;
  color:#526B55;
  text-shadow:0 .03em .1em rgba(38,61,45,.15);
}

.bold{
  font-family:'Playfair Display','Cormorant Garamond',Georgia,serif;
  font-size:clamp(1.75rem,5.5vw,4.5rem);
  font-weight:800;
  letter-spacing:.025em;
  text-transform:uppercase;
  line-height:1;
  color:#263D2D;
  background:linear-gradient(180deg,#3C5A42 0%,#263D2D 55%,#1A2B20 100%);
  -webkit-background-clip:text;
  background-clip:text;
  -webkit-text-fill-color:transparent;
  filter:drop-shadow(0 .04em .08em rgba(38,61,45,.2));
}

.brand{
  text-align:center;
  width:100%;
  max-width:880px;
}

.brand h2{
  margin:0;
  font-family:'Cormorant Garamond',Georgia,serif;
  font-weight:600;
  font-size:clamp(1.3rem,3.2vw,2.2rem);
  letter-spacing:.07em;
  line-height:1.2;
  color:#263D2D;
  text-align:center;
}

/* Animations for Minimal Fallback */
.script{animation:pop .9s .3s cubic-bezier(.34,1.56,.64,1) backwards}
.bold{animation:slam .7s .6s cubic-bezier(.2,1.6,.4,1) backwards}
.brand h2{animation:rise .7s .9s cubic-bezier(.34,1.56,.64,1) backwards}

@keyframes pop{from{scale:.4;rotate:-8deg;opacity:0}}
@keyframes slam{from{scale:1.7;translate:0 -.25em;opacity:0}}
@keyframes rise{from{translate:0 20px;scale:.94;opacity:0}}

/* Multi-Slide Carousel Styles */
.slide-stage {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 clamp(8px, 2vw, 24px);
  position: relative;
  z-index: 2;
  max-width: 980px;
}

.slide-eyebrow {
  margin-bottom: clamp(8px, 1.4vw, 16px);
}
.slide-eyebrow span {
  display: inline-block;
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: clamp(0.72rem, 1.1vw, 0.88rem);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #526B55;
  background: rgba(82, 107, 85, 0.08);
  border: 1px solid rgba(82, 107, 85, 0.2);
  padding: 0.32em 1.25em;
  border-radius: 9999px;
  backdrop-filter: blur(8px);
}

.slide-title-wrapper {
  max-width: 940px;
  margin: 0 auto;
}

.slide-title {
  margin: 0;
  padding: 0;
  font-family: 'Playfair Display', 'Cormorant Garamond', Georgia, serif;
  font-size: clamp(1.9rem, 4.8vw, 4.2rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.015em;
  color: #263D2D;
  text-align: center;
}

.slide-subtitle {
  max-width: 680px;
  margin: clamp(10px, 1.8vw, 18px) auto 0;
}
.slide-subtitle p {
  margin: 0;
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: clamp(0.92rem, 1.6vw, 1.18rem);
  line-height: 1.55;
  font-weight: 500;
  color: #5f6f58;
}

.slide-cta {
  margin-top: clamp(18px, 2.6vw, 28px);
}

.slide-cta-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: clamp(0.85rem, 1.2vw, 0.98rem);
  font-weight: 600;
  color: #ffffff;
  background-color: #263D2D;
  padding: clamp(10px, 1.3vw, 13px) clamp(22px, 2.8vw, 32px);
  border-radius: 9999px;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(38, 61, 45, 0.25);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-cta-button:hover {
  background-color: #1a2b20;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(38, 61, 45, 0.35);
}

/* 5s Carousel Indicators */
.slide-indicators {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: clamp(22px, 3.2vw, 36px);
  z-index: 3;
}

.indicator-dot {
  position: relative;
  height: 8px;
  width: 8px;
  border-radius: 9999px;
  background: rgba(38, 61, 45, 0.25);
  border: none;
  padding: 0;
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.indicator-dot.active {
  width: 28px;
  background: #263D2D;
}
.indicator-dot:hover:not(.active) {
  background: rgba(38, 61, 45, 0.55);
}

/* Slide Transition Animations */
.animate-slide-rise {
  animation: slideRise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.animate-slide-fade {
  animation: slideFade 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slideRise {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes slideFade {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width:640px){
  .hero{
    padding-top:calc(64px + clamp(16px,3vh,32px));
    padding-bottom:clamp(20px,3.5vh,36px);
    min-height:calc(58svh - env(safe-area-inset-top,0px));
  }
  .script{font-size:clamp(1.85rem,8.2vw,3.2rem);transform:rotate(-2deg);margin-right:-0.02em}
  .bold{font-size:clamp(1.45rem,6.6vw,2.5rem)}
  .brand h2{font-size:clamp(1.15rem,4.8vw,1.75rem);letter-spacing:.05em}
  .slide-title{font-size:clamp(1.6rem,6.5vw,2.4rem)}
}

@media (max-width:360px){
  .script{font-size:clamp(1.6rem,7.5vw,2rem)}
  .bold{font-size:clamp(1.25rem,5.8vw,1.65rem)}
  .brand h2{font-size:clamp(1.05rem,4.2vw,1.35rem)}
  .slide-title{font-size:clamp(1.4rem,6vw,1.8rem)}
}

@media (prefers-reduced-motion:reduce){
  .script,.bold,.brand h2,.animate-slide-rise,.animate-slide-fade{animation:none}
}

/* Video Background High-Contrast Overrides */
.et-hero[data-has-video="true"] h1.fallback-h1 .bold{
  color:#ffffff;
  background:linear-gradient(180deg,#ffffff 0%,#e2f8ec 55%,#bbf7d0 100%);
  -webkit-background-clip:text;
  background-clip:text;
  -webkit-text-fill-color:transparent;
  filter:drop-shadow(0 2px 12px rgba(0,0,0,.75));
}
.et-hero[data-has-video="true"] h1.fallback-h1 .script{
  color:#f8fafc;
  text-shadow:0 2px 10px rgba(0,0,0,.75);
}
.et-hero[data-has-video="true"] .brand h2{
  color:#ffffff;
  text-shadow:0 2px 10px rgba(0,0,0,0.75);
}

.et-hero[data-has-video="true"] .slide-eyebrow span {
  color: #bbf7d0;
  background: rgba(187, 247, 208, 0.16);
  border-color: rgba(187, 247, 208, 0.32);
  text-shadow: 0 1px 4px rgba(0,0,0,0.6);
}

.et-hero[data-has-video="true"] .slide-title {
  color: #ffffff;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85);
}

.et-hero[data-has-video="true"] .slide-subtitle p {
  color: #f1f5f9;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.75);
}

.et-hero[data-has-video="true"] .slide-cta-button {
  background-color: #263D2D;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}
.et-hero[data-has-video="true"] .slide-cta-button:hover {
  background-color: #385641;
}

.et-hero[data-has-video="true"] .indicator-dot {
  background: rgba(255, 255, 255, 0.4);
}
.et-hero[data-has-video="true"] .indicator-dot.active {
  background: #ffffff;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function HeroSection() {
  const bgVideoRef = useRef(null);
  const [heroVideo, setHeroVideo] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Fetch active hero background video
  const fetchActiveHeroVideo = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/hero-video/active");
      if (res?.data && (res.data.videoUrl || res.data.posterUrl)) {
        setHeroVideo(res.data);
      } else {
        setHeroVideo(null);
      }
    } catch {
      setHeroVideo(null);
    }
  }, []);

  // Fetch published hero slides from Neon PostgreSQL
  const fetchHeroSlides = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/cms/hero-slides");
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setHeroSlides(res.data);
      } else {
        setHeroSlides([]);
      }
    } catch {
      setHeroSlides([]);
    }
  }, []);

  // Initial load and live CMS subscriptions
  useEffect(() => {
    fetchActiveHeroVideo();
    fetchHeroSlides();

    const unsubscribe = subscribeToCmsChanges((data) => {
      const key = data?.key;
      if (key === "hero-video" || key === "hero") {
        fetchActiveHeroVideo();
      }
      if (key === "hero-slides" || key === "hero") {
        fetchHeroSlides();
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [fetchActiveHeroVideo, fetchHeroSlides]);

  // Adjust playback velocity and guarantee autoplay
  useEffect(() => {
    if (bgVideoRef.current) {
      bgVideoRef.current.defaultMuted = true;
      bgVideoRef.current.muted = true;
      if (heroVideo?.playbackSpeed) {
        bgVideoRef.current.playbackRate = heroVideo.playbackSpeed;
      }
      bgVideoRef.current.play().catch(() => {});
    }
  }, [heroVideo]);

  // 5-Second Carousel Auto-Rotation
  useEffect(() => {
    if (heroSlides.length <= 1 || isPaused || prefersReducedMotion()) return;

    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [heroSlides.length, isPaused, currentSlideIndex]);

  const youtubeId = getYouTubeId(heroVideo?.videoUrl);
  const activeSlide = heroSlides.length > 0
    ? heroSlides[currentSlideIndex % heroSlides.length]
    : null;

  const activeSlideMedia = activeSlide?.mainImage || "";
  const isSlideVideo = isVideoMedia(activeSlideMedia);
  const isSlideImage = Boolean(activeSlideMedia && !isSlideVideo);
  const hasMediaBackground = true;

  return (
    <div
      className="et-hero"
      data-has-video={hasMediaBackground}
    >
      <style>{CSS}</style>
      <main className="hero">
        {/* Continuous Sequential Local Background Videos (IMG_2952.MOV -> IMG_2953.MP4 -> Loop) */}
        <HeroSectionVideo
          overlayOpacity={typeof heroVideo?.overlayOpacity === "number" ? heroVideo.overlayOpacity : 0.42}
        />

        {/* Dynamic Multi-Slide Carousel or Minimal Editorial Fallback */}
        {activeSlide ? (
          <div
            className="slide-stage"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {activeSlide.eyebrow && (
              <div className="slide-eyebrow animate-slide-fade" key={`eyebrow-${activeSlide._id || currentSlideIndex}`}>
                <span>{activeSlide.eyebrow}</span>
              </div>
            )}

            <div className="slide-title-wrapper animate-slide-rise" key={`title-${activeSlide._id || currentSlideIndex}`}>
              <h1 className="slide-title">
                {activeSlide.title}
              </h1>
            </div>

            {activeSlide.subtitle && (
              <div className="slide-subtitle animate-slide-fade" key={`sub-${activeSlide._id || currentSlideIndex}`}>
                <p>{activeSlide.subtitle}</p>
              </div>
            )}

            {activeSlide.ctaText && (
              <div className="slide-cta animate-slide-rise" key={`cta-${activeSlide._id || currentSlideIndex}`}>
                <Link
                  to={activeSlide.ctaLink || "/contact"}
                  className="slide-cta-button"
                >
                  <span>{activeSlide.ctaText}</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            )}

            {/* Carousel Indicators (when > 1 slide exists) */}
            {heroSlides.length > 1 && (
              <nav className="slide-indicators" aria-label="Hero Slide Carousel Controls">
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide._id || idx}
                    type="button"
                    onClick={() => {
                      setCurrentSlideIndex(idx);
                    }}
                    className={`indicator-dot ${idx === currentSlideIndex % heroSlides.length ? "active" : ""}`}
                    aria-label={`Go to slide ${idx + 1}: ${slide.title || "Hero slide"}`}
                    aria-current={idx === currentSlideIndex % heroSlides.length ? "true" : undefined}
                  />
                ))}
              </nav>
            )}
          </div>
        ) : (
          /* Minimal Fallback when 0 slides are published: Clean "You Shoot. WE EDIT." */
          <div className="stage">
            <div className="title">
              <h1 className="fallback-h1">
                <span className="script">You Shoot.</span>
                <span className="bold">WE EDIT.</span>
              </h1>
            </div>

            <div className="brand">
              <h2>The Editing Table</h2>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
