import { m, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSiteSettings } from "../../lib/useSiteSettings.js";
import Container from "../ui/Container.jsx";

const DEFAULT_STATS = [
  { label: "Films Mastered", value: 500, suffix: "+" },
  { label: "Global Studios", value: 45, suffix: "+" },
  { label: "Awards Won", value: 18, suffix: "" },
  { label: "Client Satisfaction", value: 99, suffix: "%" },
  { label: "Turnaround Days", value: 5, suffix: "-7" }
];

export default function StatsSection() {
  const { settings } = useSiteSettings();
  const cmsStats = settings.publicContent?.stats;
  const stats = Array.isArray(cmsStats) && cmsStats.length > 0
    ? cmsStats
    : DEFAULT_STATS;

  return (
    <section data-theme="team" className="border-y border-sage-border/60 bg-sage-secondary/50 py-16">
      <Container className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-3xl border border-sage-border bg-sage-card p-6 text-center shadow-soft transition-all duration-300 hover:border-sage-light/80"
          >
            <Counter value={stat.value} suffix={stat.suffix} />
            <p className="mt-2 text-sm font-medium text-forest">{stat.label}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-site">Verified Metric</p>
          </article>
        ))}
      </Container>
    </section>
  );
}

function Counter({ value, suffix }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1200;
    const start = performance.now();
    let frameId;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(value * easeOutProgress));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isInView, value]);

  return (
    <m.p ref={ref} className="font-serif text-4xl sm:text-5xl font-normal text-site">
      {displayValue.toLocaleString()}
      {suffix}
    </m.p>
  );
}
