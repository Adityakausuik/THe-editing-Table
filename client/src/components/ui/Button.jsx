import { ArrowRight, Loader2 } from "lucide-react";

const variants = {
  primary:
    "relative backdrop-blur-xl bg-gradient-to-b from-[rgba(86,138,78,0.92)] to-[rgba(62,108,54,0.95)] text-white border border-white/35 shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.7),inset_0_-1px_2px_0_rgba(0,0,0,0.15),0_10px_28px_-4px_rgba(47,65,38,0.32)] hover:from-[rgba(98,154,89,0.95)] hover:to-[rgba(72,122,63,0.98)] hover:border-white/50 hover:shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.85),0_14px_34px_-4px_rgba(47,65,38,0.4)] hover:scale-[1.02] focus-visible:ring-sage-light/60",
  secondary:
    "relative backdrop-blur-xl border border-[rgb(72,125,72)]/30 bg-sage-card/80 text-forest hover:border-[rgb(72,125,72)] hover:bg-sage-card hover:text-site focus-visible:ring-[rgb(72,125,72)]/40 hover:scale-[1.02]",
  glass:
    "relative backdrop-blur-2xl bg-white/55 text-forest border border-white/75 shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.95),0_10px_25px_-5px_rgba(60,85,50,0.16)] hover:bg-white/75 hover:border-white/90 hover:shadow-[inset_0_1px_2px_0_rgba(255,255,255,1),0_14px_32px_-4px_rgba(60,85,50,0.22)] hover:scale-[1.02] focus-visible:ring-sage-light/60",
  gold:
    "bg-sage-light text-forest hover:bg-[rgb(72,125,72)] hover:text-white hover:shadow-sage focus-visible:ring-sage-light/60",
  ghost:
    "text-site hover:bg-[rgb(72,125,72)]/10 hover:text-sage-hover focus-visible:ring-[rgb(72,125,72)]/30"
};

export default function Button({
  children,
  href,
  type = "button",
  variant = "primary",
  icon,
  loading = false,
  showArrow = true,
  className = "",
  ...props
}) {
  const baseClasses = `group inline-flex min-h-[46px] items-center justify-center gap-2.5 rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ${variants[variant] ?? variants.primary} ${className}`;
  const Icon = loading ? Loader2 : icon || ArrowRight;
  const content = (
    <>
      <span>{children}</span>
      {showArrow && (
        <Icon
          className={`h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 ${loading ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
      )}
    </>
  );

  if (href) {
    return (
      <a className={baseClasses} href={href} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button className={baseClasses} type={type} disabled={loading || props.disabled} {...props}>
      {content}
    </button>
  );
}
