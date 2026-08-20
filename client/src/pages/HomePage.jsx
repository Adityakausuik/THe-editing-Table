import BeforeAfterSection from "../components/landing/BeforeAfterSection.jsx";
import ContactSection from "../components/landing/ContactSection.jsx";
import CTASection from "../components/landing/CTASection.jsx";
import HeroSection from "../components/landing/HeroSection.jsx";
import PortfolioSection from "../components/landing/PortfolioSection.jsx";
import ProcessSection from "../components/landing/ProcessSection.jsx";
import ServicesSection from "../components/landing/ServicesSection.jsx";
import StatsSection from "../components/landing/StatsSection.jsx";
import TestimonialsSection from "../components/landing/TestimonialsSection.jsx";
import TrustStrip from "../components/landing/TrustStrip.jsx";
import WeddingGallerySection from "../components/landing/WeddingGallerySection.jsx";
import WhyChooseUsSection from "../components/landing/WhyChooseUsSection.jsx";
import WorkingPartnersSection from "../components/landing/WorkingPartnersSection.jsx";

import PhotoShowcaseSection from "../components/landing/PhotoShowcaseSection.jsx";
import VideoShowcaseSection from "../components/landing/VideoShowcaseSection.jsx";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <PhotoShowcaseSection />
      <WorkingPartnersSection />
      <TrustStrip />
      <ServicesSection />
      <PortfolioSection />
      <VideoShowcaseSection />
      <BeforeAfterSection />
      <ProcessSection />
      <StatsSection />
      <WhyChooseUsSection />
      <WeddingGallerySection />
      <TestimonialsSection />
      <CTASection />
      <ContactSection />
    </>
  );
}
