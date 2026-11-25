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
        <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${light ? "text-sage-light" : "text-[#78866A]"}`}>
          {label}
        </span>
      )}
      <h2 className={`font-heading text-2xl sm:text-3xl lg:text-[2.5rem] font-normal leading-[1.18] tracking-tight ${light ? "text-white" : "text-[#263D2D]"}`}>
        {title}
      </h2>
      {text ? (
        <p className={`text-sm sm:text-base font-normal leading-relaxed ${light ? "text-white/80" : "text-[#777D76]"}`}>
          {text}
        </p>
      ) : null}
    </m.div>
  );
}
