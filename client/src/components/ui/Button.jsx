import { ArrowRight, Loader2 } from "lucide-react";

const variants = {
  primary:
    "bg-[rgb(72,125,72)] text-white hover:bg-[#7C9B69] hover:shadow-sage focus-visible:ring-sage-light/50",
  secondary:
    "border border-[rgb(72,125,72)]/30 bg-sage-card/80 text-forest hover:border-[rgb(72,125,72)] hover:bg-sage-card hover:text-site focus-visible:ring-[rgb(72,125,72)]/40",
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
