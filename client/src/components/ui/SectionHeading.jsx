import { m } from "framer-motion";

export default function SectionHeading({ label, title, text, align = "center", light = false }) {
  const centered = align === "center";
  return (
    <m.div
      className={`${centered ? "mx-auto text-center" : ""} max-w-3xl space-y-3`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {label && (
        <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${light ? "text-sage-light" : "text-site"}`}>
          {label}
        </span>
      )}
      <h2 className={`font-heading text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.12] tracking-tight ${light ? "text-forest" : "text-forest"}`}>
        {title}
      </h2>
      {text ? (
        <p className={`text-base sm:text-lg font-normal leading-relaxed ${light ? "text-site" : "text-sage-muted"}`}>
          {text}
        </p>
      ) : null}
    </m.div>
  );
}
