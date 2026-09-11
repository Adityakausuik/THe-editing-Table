import { Compass, Heart, Sparkles, Target } from "lucide-react";
import ProcessSection from "../components/landing/ProcessSection.jsx";
import WhyChooseUsSection from "../components/landing/WhyChooseUsSection.jsx";
import Button from "../components/ui/Button.jsx";
import Container from "../components/ui/Container.jsx";
import ImageWithFallback from "../components/ui/ImageWithFallback.jsx";
import SectionHeading from "../components/ui/SectionHeading.jsx";
import { mediaUrl } from "../lib/api.js";
import { useSiteSettings } from "../lib/useSiteSettings.js";

const valueIcons = { mission: Target, vision: Compass, values: Heart };

const DEFAULT_ABOUT = {
  heroLabel: "Creative Post-Production Studio",
  heroTitle: "Every Frame Matters. Every Story Deserves Its Own Visual Language.",
  heroDescription:
    "The Editing Table is a creative pre-production and post-production studio focused on turning raw visuals into compelling stories. We work across photography, films, weddings and branded content, combining precise editing, thoughtful storytelling and refined visual treatment to deliver work that feels polished, cinematic and memorable.",
  storyLabel: "Our Craft & Philosophy",
  storyTitle: "Crafting Timeless Cinematic Stories",
  storyParagraphs: [
    "The Editing Table is a creative pre-production and post-production studio focused on turning raw visuals into compelling stories. We work across photography, films, weddings and branded content, combining precise editing, thoughtful storytelling and refined visual treatment to deliver work that feels polished, cinematic and memorable.",
    "Every frame matters. Every story deserves its own visual language. Our team of skilled colorists and editors collaborate seamlessly with filmmakers, photographers, and studios worldwide."
  ],
  stats: [
    { label: "Craft Skill", value: "10+ Yrs" },
    { label: "Turnaround Hours", value: "48-72h" },
    { label: "Quality Pass Rate", value: "99.8%" },
    { label: "Global Reach", value: "Worldwide" }
  ],
  values: [
    {
      icon: "mission",
      title: "Uncompromising Precision",
      description: "Meticulous color science and scene transitions engineered to hold emotion."
    },
    {
      icon: "vision",
      title: "Filmic Aesthetic",
      description: "Custom film stock emulation inspired by 35mm and 65mm analog film stocks."
    },
    {
      icon: "values",
      title: "Bespoke Service",
      description: "Dedicated account oversight ensuring your signature brand style is strictly preserved."
    }
  ],
  ctaTitle: "Ready to Elevate Your Post-Production?",
  ctaDescription: "Let's discuss your upcoming season and build a custom workflow for your studio.",
  primaryCtaText: "Start a Project",
  primaryCtaLink: "/contactus",
  secondaryCtaText: "View Portfolio",
  secondaryCtaLink: "/portfolio"
};

export default function AboutPage() {
  const { settings } = useSiteSettings();
  const cmsAbout = settings.publicContent?.about || {};

  const about = {
    heroLabel: cmsAbout.heroLabel || DEFAULT_ABOUT.heroLabel,
    heroTitle: cmsAbout.heroTitle || DEFAULT_ABOUT.heroTitle,
    heroDescription: cmsAbout.heroDescription || DEFAULT_ABOUT.heroDescription,
    storyLabel: cmsAbout.storyLabel || DEFAULT_ABOUT.storyLabel,
    storyTitle: cmsAbout.storyTitle || DEFAULT_ABOUT.storyTitle,
    storyParagraphs:
      Array.isArray(cmsAbout.storyParagraphs) && cmsAbout.storyParagraphs.length > 0
        ? cmsAbout.storyParagraphs
        : DEFAULT_ABOUT.storyParagraphs,
    stats: Array.isArray(cmsAbout.stats) && cmsAbout.stats.length > 0 ? cmsAbout.stats : DEFAULT_ABOUT.stats,
    values: Array.isArray(cmsAbout.values) && cmsAbout.values.length > 0 ? cmsAbout.values : DEFAULT_ABOUT.values,
    image: cmsAbout.image,
    imageAlt: cmsAbout.imageAlt || "The Editing Table Studio",
    ctaTitle: cmsAbout.ctaTitle || DEFAULT_ABOUT.ctaTitle,
    ctaDescription: cmsAbout.ctaDescription || DEFAULT_ABOUT.ctaDescription,
    primaryCtaText: cmsAbout.primaryCtaText || DEFAULT_ABOUT.primaryCtaText,
    primaryCtaLink: cmsAbout.primaryCtaLink || DEFAULT_ABOUT.primaryCtaLink,
    secondaryCtaText: cmsAbout.secondaryCtaText || DEFAULT_ABOUT.secondaryCtaText,
    secondaryCtaLink: cmsAbout.secondaryCtaLink || DEFAULT_ABOUT.secondaryCtaLink
  };

  const values = about.values;
  const stats = about.stats;

  return (
    <div className="pt-28 pb-16">
      <section className="relative py-20 bg-sage-secondary/40 border-b border-sage-border/60">
        <Container className="max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-card/80 px-4 py-1.5 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-site" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-site">{about.heroLabel}</span>
          </div>
          <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-normal text-forest leading-[1.08]">
            {about.heroTitle}
          </h1>
          <p className="text-lg sm:text-xl text-sage-muted max-w-2xl mx-auto leading-relaxed">{about.heroDescription}</p>
        </Container>
      </section>

      <section className="py-24">
        <Container className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <SectionHeading label={about.storyLabel} title={about.storyTitle} align="left" />
            {about.storyParagraphs.map((paragraph, index) => (
              <p key={index} className="text-sage-muted leading-relaxed">{paragraph}</p>
            ))}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-sage-border/60">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="font-serif text-3xl text-forest">{stat.value}</p>
                  <p className="text-xs text-sage-muted uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden border border-sage-light/40 bg-sage-card p-3 shadow-editorial">
            <ImageWithFallback
              src={mediaUrl(about.image)}
              alt={about.imageAlt}
              className="rounded-2xl w-full h-[450px] object-cover"
            />
          </div>
        </Container>
      </section>

      <section className="py-20 bg-sage-secondary/30 border-y border-sage-border/60">
        <Container>
          <div className="grid gap-8 md:grid-cols-3">
            {values.map((value) => {
              const Icon = valueIcons[value.icon] || Target;
              return (
                <div key={value.title} className="rounded-3xl border border-sage-border bg-sage-card p-8 space-y-4 shadow-soft">
                  <div className="h-12 w-12 rounded-2xl bg-sage-light/15 flex items-center justify-center text-site">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="font-serif text-2xl text-forest">{value.title}</h2>
                  <p className="text-sm text-sage-muted leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <ProcessSection />
      <WhyChooseUsSection />

      <section className="py-20 text-center">
        <Container className="max-w-2xl space-y-6">
          <h2 className="font-serif text-4xl sm:text-5xl text-forest font-normal">{about.ctaTitle}</h2>
          <p className="text-sage-muted">{about.ctaDescription}</p>
          <div className="flex justify-center gap-4 pt-4">
            <Button href={about.primaryCtaLink} variant="primary">{about.primaryCtaText}</Button>
            <Button href={about.secondaryCtaLink} variant="secondary">{about.secondaryCtaText}</Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
