import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../ui/Button.jsx";
import { apiFetch, mediaUrl } from "../../lib/api.js";

/**
 * The Editing Table – hero section.
 * Drag (or use arrow keys on) the playhead to compare raw vs. edited footage.
 * Clean hero: floating software badges removed.
 * Background Video: Dynamic admin-managed cinematic hero video layer.
 */

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;600&display=swap');
.et-hero{
  --bg:#eef2ea; --bg2:#dfe8d5; --moss:#6d8f4f; --deep:#4d6e38; --ink:#33422d; --muted:#5f6f58;
  --raw:#a9aea6; --glass:rgba(255,255,255,.45); --edge:rgba(255,255,255,.9); --shadow:rgba(60,85,50,.25);
  --cut:#e8833a; --cutink:#2a1708; --x:0%; --pad:clamp(14px,4vw,44px);
  box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);
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
.hero{position:relative;overflow:hidden;min-height:85vh;min-height:calc(88svh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));display:grid;place-items:center;padding:calc(68px + clamp(12px,2.5vw,36px)) max(clamp(12px,3vw,36px),env(safe-area-inset-right,0px)) clamp(20px,3vw,44px) max(clamp(12px,3vw,36px),env(safe-area-inset-left,0px))}
.stage{position:relative;width:min(980px,100%);display:grid;justify-items:center;gap:clamp(12px,2.5vw,28px)}

.hero::before{content:'';position:absolute;width:min(60vw,600px);aspect-ratio:1;left:50%;top:38%;translate:-50% -50%;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--moss) 35%,transparent),transparent 68%);filter:blur(30px);pointer-events:none}
.stage{z-index:1}
/* the monitor: glass panel that doubles as a timeline */
.panel{position:relative;width:100%;background:none;border:0;box-shadow:none;padding:clamp(8px,2vw,24px) var(--pad);cursor:default;touch-action:pan-y;user-select:none;overflow:visible}
.title{display:grid;justify-items:stretch}
.title>*{grid-area:1/1}
h1,.rawcopy{margin:0 calc(-1*var(--pad));padding:0 var(--pad);display:flex;align-items:baseline;justify-content:center;flex-wrap:nowrap;white-space:nowrap;gap:0 clamp(0.12em,1.4vw,0.28em);font-weight:400;line-height:1.05;text-align:center}
.script{font-family:'Alex Brush',cursive;font-size:clamp(2.2rem,6.4vw,5.4rem);font-weight:400;display:inline-block;transform:rotate(-3deg);transform-origin:85% 65%;margin-right:-0.05em;line-height:0.92}
.bold{font-family:'Playfair Display','Cormorant Garamond',Georgia,serif;font-size:clamp(1.75rem,5.2vw,4.4rem);font-weight:800;letter-spacing:.025em;text-transform:uppercase;line-height:1}
/* graded = finished edit, left of playhead */
h1{clip-path:inset(-60% calc(100% - var(--x)) -60% -15%);color:var(--moss)}
h1 .bold{color:#436E4F;background:linear-gradient(180deg,#4D7B58 0%,#3B6645 55%,#2A4A31 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 .04em .08em rgba(45,70,40,.2))}
h1 .script{color:#9FAAA0;text-shadow:0 .03em .1em rgba(72,125,72,.18)}
/* raw = ungraded footage, right of playhead */
.rawcopy{clip-path:inset(-60% -15% -60% var(--x));color:var(--raw);filter:grayscale(1) blur(.7px) contrast(.85);opacity:.8}
.rawcopy .bold{letter-spacing:.035em}
.rawcopy .script{color:#B0B7AD}
.rawcopy{position:relative}

.brand{text-align:center;width:100%;max-width:880px}
.brand h2{margin:0 0 .4rem;font:600 clamp(1.4rem,2.4vw,2.1rem)/1.2 'Cormorant Garamond',Georgia,serif;letter-spacing:.07em;color:#3C6647}
.brand p{margin:.65rem auto 0;font-family:'Manrope','DM Sans',sans-serif;font-size:clamp(.88rem,1.1vw,1rem);font-weight:400;line-height:1.55;color:#556B51;max-width:580px;white-space:normal}


/* motion pop */
.panel{animation:panelpop .8s cubic-bezier(.34,1.56,.64,1) backwards}
.script{animation:pop .9s .55s cubic-bezier(.34,1.56,.64,1) backwards}
.bold{animation:slam .7s .95s cubic-bezier(.2,1.6,.4,1) backwards}
.brand>*{animation:rise .7s cubic-bezier(.34,1.56,.64,1) backwards}
.brand h2{animation-delay:1.3s}.brand p{animation-delay:1.45s}.brand .cta{animation-delay:1.6s}
.ring{position:absolute;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;border:2px solid var(--moss);pointer-events:none;animation:ring .6s ease-out forwards}
@keyframes spin{to{rotate:360deg}}
@keyframes unspin{to{rotate:-360deg}}
@keyframes panelpop{from{scale:.86;opacity:0}}
@keyframes popin{from{scale:0;opacity:0}}
@keyframes pop{from{scale:.4;rotate:-8deg;opacity:0}}
@keyframes slam{from{scale:1.7;translate:0 -.25em;opacity:0}}
@keyframes rise{from{translate:0 26px;scale:.9;opacity:0}}
@keyframes ring{from{scale:.2;opacity:1}to{scale:5;opacity:0}}
@media (min-width:1440px){.stage{width:min(1080px,100%)}}
@media (max-width:640px){
  .hero{padding-top:calc(64px + clamp(12px,3vh,24px));padding-bottom:clamp(16px,3vh,28px);min-height:auto}
  .panel{padding:clamp(6px,2vw,16px) var(--pad)}
  .script{font-size:clamp(1.85rem,7.8vw,2.9rem);transform:rotate(-2deg);margin-right:-0.02em}
  .bold{font-size:clamp(1.5rem,6.2vw,2.3rem)}
}
@media (max-width:480px){
  .stage{gap:clamp(12px,3.5vw,18px)}
  .brand h2{font-size:clamp(1.25rem,4.5vw,1.65rem);letter-spacing:.05em}
  .brand p{font-size:clamp(0.82rem,3.2vw,0.92rem);line-height:1.45;padding:0 4px}
}
@media (max-width:340px){
  .stage{gap:10px}
  .script{font-size:clamp(1.6rem,7.2vw,2rem)}
  .bold{font-size:clamp(1.3rem,5.5vw,1.65rem)}
}
@media (max-height:680px) and (orientation:landscape){.hero{padding-block:12px}.stage{gap:12px}.panel{padding-top:16px}}
@media (prefers-reduced-motion:reduce){.panel,.script,.bold,.brand>*{animation:none}.cta,.head::after,.tc{transition:none}.ring{display:none}}
.et-hero[data-has-video="true"] h1 .bold{color:#ffffff;background:linear-gradient(180deg,#ffffff 0%,#d1fae5 55%,#a7f3d0 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 .05em .15em rgba(0,0,0,.7))}
.et-hero[data-has-video="true"] h1 .script{color:#f8fafc;text-shadow:0 .04em .15em rgba(0,0,0,.7)}
.et-hero[data-has-video="true"] .rawcopy{opacity:.9}
.et-hero[data-has-video="true"] .rawcopy .bold{color:#e2e8f0;filter:drop-shadow(0 .04em .1em rgba(0,0,0,.6))}
.et-hero[data-has-video="true"] .rawcopy .script{color:#cbd5e1}
.et-hero[data-has-video="true"] .brand h2{color:#ffffff;text-shadow:0 2px 8px rgba(0,0,0,0.6)}
.et-hero[data-has-video="true"] .brand p{color:#f1f5f9;text-shadow:0 1px 4px rgba(0,0,0,0.6)}`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function getYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch) return shortMatch[1];
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch) return watchMatch[1];
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch) return embedMatch[1];
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch) return shortsMatch[1];
  return null;
}

export default function HeroSection({
  ctaHref = "/contactus",
  ctaLabel = "Start a Project",
}) {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const headRef = useRef(null);
  const tcRef = useRef(null);
  const bgVideoRef = useRef(null);
  const pct = useRef(0);
  const raf = useRef(0);
  const dragging = useRef(false);
  const [grab, setGrab] = useState(false);
  const [rings, setRings] = useState([]);
  const [heroVideo, setHeroVideo] = useState(null);

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
      // Non-blocking fallback to minimal presentation
      setHeroVideo(null);
    }
  }, []);

  useEffect(() => {
    fetchActiveHeroVideo();

    // Listen for live CMS updates via BroadcastChannel
    if (typeof BroadcastChannel === "function") {
      const channel = new BroadcastChannel("editing-table-cms");
      channel.onmessage = (e) => {
        if (e.data?.key === "hero-video") {
          fetchActiveHeroVideo();
        }
      };
      return () => {
        try {
          channel.close();
        } catch {
          // ignore
        }
      };
    }
  }, [fetchActiveHeroVideo]);

  // Adjust playback velocity
  useEffect(() => {
    if (bgVideoRef.current && heroVideo?.playbackSpeed) {
      bgVideoRef.current.playbackRate = heroVideo.playbackSpeed;
    }
  }, [heroVideo]);

  const setPos = useCallback((p) => {
    const v = Math.max(0, Math.min(100, p));
    pct.current = v;
    rootRef.current?.style.setProperty("--x", v + "%");
    panelRef.current?.setAttribute("aria-valuenow", String(Math.round(v)));
    headRef.current?.setAttribute("aria-valuenow", String(Math.round(v)));
    const w = panelRef.current?.clientWidth || 0;
    headRef.current?.toggleAttribute("data-flip", w > 0 && ((100 - v) / 100) * w < 120);
    const f = Math.round((v / 100) * 240);
    if (tcRef.current) {
      tcRef.current.textContent =
        "00:00:" + String(Math.floor(f / 24)).padStart(2, "0") + ":" + String(f % 24).padStart(2, "0");
    }
  }, []);

  const stop = () => cancelAnimationFrame(raf.current);

  useEffect(() => {
    const onResize = () => setPos(pct.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setPos]);

  useEffect(() => {
    setPos(0);
    if (prefersReducedMotion()) { setPos(100); return; }
    let t0 = null;
    const step = (t) => {
      if (t0 === null) t0 = t;
      const k = Math.min(1, (t - t0) / 2800);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      setPos(e * 100);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    const id = setTimeout(() => (raf.current = requestAnimationFrame(step)), 1100);
    return () => { window.clearTimeout(id); stop(); };
  }, [setPos]);

  const fromEvent = (e) => {
    const r = panelRef.current.getBoundingClientRect();
    setPos(((e.clientX - r.left) / r.width) * 100);
  };

  const onPointerDown = (e) => {
    stop();
    dragging.current = true;
    setGrab(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    fromEvent(e);
    if (!prefersReducedMotion()) {
      const r = e.currentTarget.getBoundingClientRect();
      const id = Math.random();
      setRings((list) => [...list, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
      setTimeout(() => setRings((list) => list.filter((x) => x.id !== id)), 650);
    }
  };
  const onPointerMove = (e) => dragging.current && fromEvent(e);
  const endDrag = () => { dragging.current = false; setGrab(false); };

  const onKeyDown = (e) => {
    const d = { ArrowLeft: -4, ArrowDown: -4, ArrowRight: 4, ArrowUp: 4, Home: -100, End: 100 }[e.key];
    if (d) { e.preventDefault(); stop(); setPos(pct.current + d); }
  };

  const youtubeId = getYouTubeId(heroVideo?.videoUrl);

  return (
    <div
      className="et-hero"
      ref={rootRef}
      data-has-video={Boolean(heroVideo?.videoUrl || heroVideo?.posterUrl)}
    >
      <style>{CSS}</style>
      <main className="hero">
        {/* Dynamic Hero Background Video Layer */}
        {heroVideo && (heroVideo.videoUrl || heroVideo.posterUrl) && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
            {youtubeId && !prefersReducedMotion() ? (
              <div className="relative w-full h-full overflow-hidden pointer-events-none">
                <iframe
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none border-0"
                  style={{
                    width: "max(100%, 177.78vh)",
                    height: "max(100%, 56.25vw)",
                    minWidth: "100%",
                    minHeight: "100%"
                  }}
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&modestbranding=1&playsinline=1`}
                  title="Hero Background Video"
                  allow="autoplay; encrypted-media"
                />
              </div>
            ) : heroVideo.videoUrl && !prefersReducedMotion() ? (
              <video
                ref={bgVideoRef}
                className="h-full w-full object-cover"
                style={{
                  objectPosition: heroVideo.videoPosition || "center"
                }}
                autoPlay={heroVideo.playbackSettings?.autoplay ?? true}
                muted={heroVideo.playbackSettings?.muted ?? true}
                loop={heroVideo.playbackSettings?.loop ?? true}
                playsInline={heroVideo.playbackSettings?.playsInline ?? true}
                poster={heroVideo.posterUrl ? mediaUrl(heroVideo.posterUrl) : undefined}
              >
                {heroVideo.mobileVideoUrl && (
                  <source src={mediaUrl(heroVideo.mobileVideoUrl)} media="(max-width: 768px)" type="video/mp4" />
                )}
                <source src={mediaUrl(heroVideo.videoUrl)} type={heroVideo.videoType || "video/mp4"} />
              </video>
            ) : heroVideo.posterUrl ? (
              <img
                src={mediaUrl(heroVideo.posterUrl)}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: heroVideo.videoPosition || "center" }}
              />
            ) : null}

            {/* Adjustable Darkness Overlay */}
            <div
              className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-300"
              style={{
                opacity: typeof heroVideo.overlayOpacity === "number" ? heroVideo.overlayOpacity : 0.35
              }}
            />
          </div>
        )}

        <div className="stage">
          <section
            ref={panelRef}
            className={"panel" + (grab ? " grab" : "")}
            role="slider"
            tabIndex={0}
            aria-label="Before and after preview. Drag the playhead to compare raw and edited."
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
          >
            <div className="title">
              <div className="rawcopy" aria-hidden="true">
                <span className="script">You Shoot.</span>
                <span className="bold">WE EDIT.</span>
              </div>
              <h1>
                <span className="script">You Shoot.</span>
                <span className="bold">WE EDIT.</span>
              </h1>
            </div>




            {rings.map((r) => (
              <span key={r.id} className="ring" style={{ left: r.x, top: r.y }} />
            ))}
          </section>

          <div className="brand">
            <h2>The Editing Table</h2>
            <p>Professional photo &amp; video editing for creators, filmmakers and brands around the world.</p>
            <div className="mt-6 flex justify-center">
              <Button href={ctaHref} variant="primary">
                {ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
