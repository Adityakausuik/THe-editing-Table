import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../ui/Button.jsx";

/**
 * The Editing Table – hero section.
 * Drag (or use arrow keys on) the playhead to compare raw vs. edited footage.
 * Self-contained: styles are embedded below, no extra dependencies.
 */

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Anton&family=Cormorant+Garamond:wght@600&family=Mrs+Saint+Delafield&family=Inter:wght@400;500&display=swap');
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
.et-hero{margin:0;min-height:100%;background:var(--bg);color:var(--ink);font-family:'Inter',system-ui,sans-serif;
  background-image:radial-gradient(ellipse 70% 55% at 85% -10%,rgba(255,255,255,.5),transparent 60%),
  radial-gradient(ellipse 60% 50% at 8% 110%,var(--bg2),transparent 65%)}
.hero{position:relative;overflow:hidden;min-height:100vh;min-height:calc(100svh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));display:grid;place-items:center;padding:clamp(16px,4vw,64px) max(clamp(12px,3vw,48px),env(safe-area-inset-right,0px)) clamp(20px,4vw,64px) max(clamp(12px,3vw,48px),env(safe-area-inset-left,0px))}
.stage{position:relative;width:min(1040px,100%);display:grid;justify-items:center;gap:clamp(16px,3.8vw,48px)}

.hero::before{content:'';position:absolute;width:min(70vw,720px);aspect-ratio:1;left:50%;top:38%;translate:-50% -50%;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--moss) 38%,transparent),transparent 68%);filter:blur(30px);pointer-events:none}
.stage{z-index:1}
/* the monitor: glass panel that doubles as a timeline */
.panel{position:relative;width:100%;background:none;border:0;box-shadow:none;  padding:clamp(10px,2.5vw,32px) var(--pad);cursor:default;touch-action:pan-y;user-select:none;overflow:visible}
.title{display:grid;justify-items:stretch}
.title>*{grid-area:1/1}
h1,.rawcopy{margin:0 calc(-1*var(--pad));padding:0 var(--pad);display:flex;align-items:baseline;justify-content:center;flex-wrap:nowrap;white-space:nowrap;gap:0 clamp(0.18em,2.2vw,0.45em);font-weight:400;line-height:1;text-align:center}
.script{font-family:'Mrs Saint Delafield',cursive;font-size:clamp(1.9rem,8.6vw,8.6rem);margin-right:.04em}
.bold{font-family:'Anton',Impact,sans-serif;font-size:clamp(1.45rem,6.8vw,6.4rem);letter-spacing:.01em;text-transform:uppercase}
/* graded = finished edit, left of playhead */
h1{clip-path:inset(-60% calc(100% - var(--x)) -60% -15%);color:var(--moss)}
h1 .bold{background:linear-gradient(180deg,var(--moss) 0%,var(--deep) 55%,var(--ink) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;filter:drop-shadow(0 .05em .07em var(--shadow))}
h1 .script{text-shadow:0 .04em .12em color-mix(in srgb,var(--moss) 45%,transparent)}
/* raw = ungraded footage, right of playhead */
.rawcopy{clip-path:inset(-60% -15% -60% var(--x));color:var(--raw);filter:grayscale(1) blur(.7px) contrast(.85);opacity:.8}
.rawcopy .bold{letter-spacing:.05em}
.rawcopy{position:relative}

.brand{text-align:center;width:100%;max-width:960px}
.brand h2{margin:0 0 .5rem;font:600 clamp(1.7rem,3.6vw,2.6rem)/1.1 'Cormorant Garamond',Georgia,serif;letter-spacing:.14em;color:var(--deep)}
.brand p{margin:.9rem auto 0;font-size:clamp(.88rem,1.35vw,1.05rem);line-height:1.55;color:var(--muted);white-space:nowrap}
@media (max-width:767px){.brand p{white-space:normal}}


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
@media (min-width:1440px){.stage{width:min(1200px,100%)}}
@media (max-width:640px){
  .hero{padding-block:clamp(16px,4vh,36px)}
  .panel{padding:clamp(6px,2vw,20px) var(--pad)}
}
@media (max-width:480px){
  .stage{gap:clamp(16px,4.5vw,24px)}
  .brand h2{font-size:clamp(1.4rem,5.5vw,2rem);letter-spacing:.08em}
  .brand p{font-size:clamp(0.82rem,3.4vw,0.95rem);line-height:1.48;padding:0 6px}
}
@media (max-width:340px){
  .stage{gap:12px}
  .script{font-size:clamp(1.65rem,8vw,2.2rem)}
  .bold{font-size:clamp(1.25rem,6.2vw,1.7rem)}
}
@media (max-height:680px) and (orientation:landscape){.hero{padding-block:12px}.stage{gap:12px}.panel{padding-top:16px}}
@media (prefers-reduced-motion:reduce){.panel,.script,.bold,.brand>*{animation:none}.cta,.head::after,.tc{transition:none}.ring{display:none}}`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function HeroSection({
  ctaHref = "/contact",
  ctaLabel = "Start a project",
}) {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const headRef = useRef(null);
  const tcRef = useRef(null);
  const pct = useRef(0);
  const raf = useRef(0);
  const dragging = useRef(false);
  const [grab, setGrab] = useState(false);
  const [rings, setRings] = useState([]);

  const setPos = useCallback((p) => {
    const v = Math.max(0, Math.min(100, p));
    pct.current = v;
    rootRef.current?.style.setProperty("--x", v + "%");
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
    return () => { clearTimeout(id); stop(); };
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

  return (
    <div className="et-hero" ref={rootRef}>
      <style>{CSS}</style>
      <main className="hero">
        <div className="stage">
          <section
            ref={panelRef}
            className={"panel" + (grab ? " grab" : "")}
            aria-label="Before and after preview. Drag the playhead to compare raw and edited."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="title">
              <div className="rawcopy" aria-hidden="true">
                <span className="script">You Shoot,</span>
                <span className="bold">We Edit.</span>
              </div>
              <h1>
                <span className="script">You Shoot,</span>
                <span className="bold">We Edit.</span>
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
