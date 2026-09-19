import BeforeAfterSection from "../components/landing/BeforeAfterSection.jsx";
import ContactSection from "../components/landing/ContactSection.jsx";
import CTASection from "../components/landing/CTASection.jsx";
import HeroSection from "../components/landing/HeroSection.jsx";
import PhotoShowcaseSection from "../components/landing/PhotoShowcaseSection.jsx";
import ProcessSection from "../components/landing/ProcessSection.jsx";
import ServicesSection from "../components/landing/ServicesSection.jsx";
import StatsSection from "../components/landing/StatsSection.jsx";
import StudioDoorIntro from "../components/landing/StudioDoorIntro.jsx";
import TestimonialsSection from "../components/landing/TestimonialsSection.jsx";
import TrustStrip from "../components/landing/TrustStrip.jsx";
import VideoShowcaseSection from "../components/landing/VideoShowcaseSection.jsx";
import WhyChooseUsSection from "../components/landing/WhyChooseUsSection.jsx";
import WorkingPartnersSection from "../components/landing/WorkingPartnersSection.jsx";

export default function HomePage() {
  return (
    <>
      <StudioDoorIntro />
      <HeroSection />
      <VideoShowcaseSection />
      <WorkingPartnersSection />
      <TrustStrip />
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
