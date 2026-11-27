import BeforeAfterSection from "../components/landing/BeforeAfterSection.jsx";
import ColourShowcaseSection from "../components/landing/ColourShowcaseSection.jsx";
import ContactSection from "../components/landing/ContactSection.jsx";
import FeaturedPortfolioSection from "../components/landing/FeaturedPortfolioSection.jsx";
import GlobalReachSection from "../components/landing/GlobalReachSection.jsx";
import HeroSection from "../components/landing/HeroSection.jsx";
import ProcessSection from "../components/landing/ProcessSection.jsx";
import StatsSection from "../components/landing/StatsSection.jsx";
import TestimonialsSection from "../components/landing/TestimonialsSection.jsx";
import WhyChooseUsSection from "../components/landing/WhyChooseUsSection.jsx";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <GlobalReachSection />
      <FeaturedPortfolioSection />
      <ColourShowcaseSection />
      <BeforeAfterSection />
      <ProcessSection />
      <StatsSection />
      <WhyChooseUsSection />
      <TestimonialsSection />
      <ContactSection />
    </>
  );
}
