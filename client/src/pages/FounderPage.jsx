import { m } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container.jsx";

export default function FounderPage() {
  return (
    <div className="pt-28 pb-20 bg-sage-bg text-forest space-y-16 select-none">
      {/* Hero Header */}
      <section className="relative py-16 bg-sage-secondary/40 border-b border-sage-border/60">
        <Container className="max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-card/80 px-4 py-1.5 backdrop-blur-md shadow-soft">
            <Sparkles className="h-4 w-4 text-site" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-site">FOUNDER &amp; CEO SPOTLIGHT</span>
          </div>
          <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-normal text-forest leading-[1.08]">
            Akshay Chhabra
          </h1>
          <p className="text-lg sm:text-xl text-sage-muted max-w-2xl mx-auto leading-relaxed">
            Founder &amp; Chief Executive Officer — The Editing Table
          </p>
        </Container>
      </section>

      {/* Main Founder Story Grid */}
      <section>
        <Container className="grid gap-12 lg:grid-cols-[1fr_1.1fr] items-center max-w-[1280px] mx-auto">
          {/* Founder Portrait Card */}
          <m.div
            className="relative rounded-3xl overflow-hidden border border-sage-border bg-sage-card p-3 shadow-editorial group"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-forest">
              <img
                src="/assets/akshay-chhabra-founder.jpg"
                alt="Akshay Chhabra - Founder & CEO"
                className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-transparent to-transparent pointer-events-none" />

              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-forest/80 backdrop-blur-md p-4 text-white space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-site">FOUNDER &amp; CEO</span>
                <h3 className="font-serif text-2xl font-semibold">Akshay Chhabra</h3>
                <p className="text-xs text-white/80">The Editing Table Studio • Mohali, Punjab</p>
              </div>
            </div>
          </m.div>

          {/* Founder Narrative */}
          <div className="space-y-6 text-left">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-site">LEADERSHIP &amp; VISION</span>
              <h2 className="font-serif text-3xl sm:text-4xl text-forest font-normal leading-tight">
                &ldquo;Every frame matters. Every story deserves its own visual language.&rdquo;
              </h2>
            </div>

            <div className="space-y-4 text-sage-muted text-sm sm:text-base leading-relaxed">
              <p>
                Founded by <strong className="text-forest font-semibold">Akshay Chhabra</strong>, <strong className="text-forest">The Editing Table</strong> was built on a singular commitment: delivering world-class pre-production and post-production excellence to filmmakers, photographers, wedding studios, and creative brands globally.
              </p>
              <p>
                Under Akshay’s visionary direction, the studio has pioneered bespoke workflows combining 35mm film stock emulation, precision DaVinci Resolve color science, and high-fashion photo retouching — establishing a reputation for uncompromising craftsmanship.
              </p>
              <p>
                From raw footage assembly to Dolby Vision HDR master delivery, Akshay leads a dedicated team of senior colorists, retouchers, and editors based out of Mohali, Punjab, serving premier creative clients across India, Europe, the UK, and North America.
              </p>
            </div>

            {/* Core Leadership Pillars */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-sage-border">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-site shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-forest uppercase tracking-wider">Quality Oversight</h4>
                  <p className="text-[11px] text-sage-muted">100% Personal Review</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-site shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-forest uppercase tracking-wider">Global Standards</h4>
                  <p className="text-[11px] text-sage-muted">Worldwide Delivery</p>
                </div>
              </div>
            </div>

            {/* Action CTAs */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                to="/contactus"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(72,125,72)] px-7 py-3 text-sm font-semibold text-white shadow-soft transition-all hover:bg-[#7C9B69]"
              >
                <span>Connect with Founder</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/team"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-sage-border bg-white px-7 py-3 text-sm font-semibold text-forest shadow-soft transition-all hover:border-[rgb(72,125,72)]"
              >
                <span>Explore Creative Team</span>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
