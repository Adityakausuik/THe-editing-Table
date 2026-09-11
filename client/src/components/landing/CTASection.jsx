import { m } from "framer-motion";
import Button from "../ui/Button.jsx";
import Container from "../ui/Container.jsx";

export default function CTASection() {
  return (
    <section data-theme="team" className="section-pad">
      <Container>
        <m.div
          className="relative overflow-hidden rounded-3xl border border-sage-border bg-[rgb(72,125,72)] p-10 text-center shadow-deep sm:p-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Sage Green Ambient Glow */}
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(143,174,123,0.2),transparent_65%)] pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-3xl space-y-6">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C8D8BE]">
              Reserve Your Suite
            </span>

            <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.12] text-[#F8FBF7]">
              Ready to Give Your Wedding Films &amp; Galleries the Finish They Deserve?
            </h2>

            <p className="text-base sm:text-lg text-[#C8D8BE] leading-relaxed max-w-2xl mx-auto">
              Partner with our master post-production team to streamline your workflow, elevate your turnaround times, and deliver publication-grade galleries.
            </p>

            <div className="pt-4 flex flex-col justify-center gap-4 sm:flex-row">
              <Button href="#contact" variant="primary">
                Reserve Studio Suite
              </Button>
              <Button href="#contact" variant="secondary" className="border-[#C8D8BE]/40 text-[#F8FBF7] hover:bg-[#F8FBF7] hover:text-site">
                Schedule Studio Call
              </Button>
            </div>
          </div>
        </m.div>
      </Container>
    </section>
  );
}
