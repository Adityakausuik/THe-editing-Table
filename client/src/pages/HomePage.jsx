import BeforeAfterSection from "../components/landing/BeforeAfterSection.jsx";
import ContactSection from "../components/landing/ContactSection.jsx";
import CTASection from "../components/landing/CTASection.jsx";
import GlobalReachSection from "../components/landing/GlobalReachSection.jsx";
import HeroSection from "../components/landing/HeroSection.jsx";
import PhotoShowcaseSection from "../components/landing/PhotoShowcaseSection.jsx";
import ProcessSection from "../components/landing/ProcessSection.jsx";
import ServicesSection from "../components/landing/ServicesSection.jsx";
import StatsSection from "../components/landing/StatsSection.jsx";
import TestimonialsSection from "../components/landing/TestimonialsSection.jsx";
import WhyChooseUsSection from "../components/landing/WhyChooseUsSection.jsx";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <GlobalReachSection />
      <ServicesSection />
      <PhotoShowcaseSection />
      <BeforeAfterSection />
      <ProcessSection />
      <StatsSection />
      <WhyChooseUsSection />
      <TestimonialsSection />
      <CTASection />
      <ContactSection />
    </>
  );
}
