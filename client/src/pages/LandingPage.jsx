import { LazyMotion, domAnimation, m } from "framer-motion";
import Footer from "../components/layout/Footer.jsx";
import Navbar from "../components/layout/Navbar.jsx";
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
import WorkingPartnersSection from "../components/landing/WorkingPartnersSection.jsx";
import WhyChooseUsSection from "../components/landing/WhyChooseUsSection.jsx";

export default function LandingPage() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="relative min-h-dvh overflow-x-hidden text-primary">
        <Navbar />
        <m.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          id="main-content"
        >
          <HeroSection />
          <WorkingPartnersSection />
          <TrustStrip />
          <ServicesSection />
          <PortfolioSection />
          <BeforeAfterSection />
          <ProcessSection />
          <StatsSection />
          <WhyChooseUsSection />
          <WeddingGallerySection />
          <TestimonialsSection />
          <CTASection />
          <ContactSection />
        </m.main>
        <Footer />
      </div>
    </LazyMotion>
  );
}
