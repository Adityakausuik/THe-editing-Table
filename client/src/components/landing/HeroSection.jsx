import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, mediaUrl } from "../../lib/api.js";
import { getYouTubeId } from "../../utils/youtube.js";

/**
 * The Editing Table – Minimal, Editorial Hero Section.
 * Responsive, clean typography: "You Shoot. WE EDIT." and "The Editing Table".
 * Background Video: Dynamic admin-managed cinematic hero video layer.
 */

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;600&display=swap');
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

h1{
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

/* Animations */
.script{animation:pop .9s .3s cubic-bezier(.34,1.56,.64,1) backwards}
.bold{animation:slam .7s .6s cubic-bezier(.2,1.6,.4,1) backwards}
.brand h2{animation:rise .7s .9s cubic-bezier(.34,1.56,.64,1) backwards}

@keyframes pop{from{scale:.4;rotate:-8deg;opacity:0}}
@keyframes slam{from{scale:1.7;translate:0 -.25em;opacity:0}}
@keyframes rise{from{translate:0 20px;scale:.94;opacity:0}}

@media (max-width:640px){
  .hero{
    padding-top:calc(64px + clamp(16px,3vh,32px));
    padding-bottom:clamp(20px,3.5vh,36px);
    min-height:calc(58svh - env(safe-area-inset-top,0px));
  }
  .script{font-size:clamp(1.85rem,8.2vw,3.2rem);transform:rotate(-2deg);margin-right:-0.02em}
  .bold{font-size:clamp(1.45rem,6.6vw,2.5rem)}
  .brand h2{font-size:clamp(1.15rem,4.8vw,1.75rem);letter-spacing:.05em}
}

@media (max-width:360px){
  .script{font-size:clamp(1.6rem,7.5vw,2rem)}
  .bold{font-size:clamp(1.25rem,5.8vw,1.65rem)}
  .brand h2{font-size:clamp(1.05rem,4.2vw,1.35rem)}
}

@media (prefers-reduced-motion:reduce){
  .script,.bold,.brand h2{animation:none}
}

/* When video background is active */
.et-hero[data-has-video="true"] h1 .bold{
  color:#ffffff;
  background:linear-gradient(180deg,#ffffff 0%,#e2f8ec 55%,#bbf7d0 100%);
  -webkit-background-clip:text;
  background-clip:text;
  -webkit-text-fill-color:transparent;
  filter:drop-shadow(0 2px 12px rgba(0,0,0,.75));
}
.et-hero[data-has-video="true"] h1 .script{
  color:#f8fafc;
  text-shadow:0 2px 10px rgba(0,0,0,.75);
}
.et-hero[data-has-video="true"] .brand h2{
  color:#ffffff;
  text-shadow:0 2px 10px rgba(0,0,0,0.75);
}`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function HeroSection() {
  const bgVideoRef = useRef(null);
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

  const youtubeId = getYouTubeId(heroVideo?.videoUrl);

  return (
    <div
      className="et-hero"
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
                    width: "100vw",
                    height: "56.25vw",
                    minWidth: "177.78vh",
                    minHeight: "100vh"
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
                opacity: typeof heroVideo.overlayOpacity === "number" ? heroVideo.overlayOpacity : 0.42
              }}
            />
          </div>
        )}

        <div className="stage">
          <div className="title">
            <h1>
              <span className="script">You Shoot.</span>
              <span className="bold">WE EDIT.</span>
            </h1>
          </div>

          <div className="brand">
            <h2>The Editing Table</h2>
          </div>
        </div>
      </main>
    </div>
  );
}
