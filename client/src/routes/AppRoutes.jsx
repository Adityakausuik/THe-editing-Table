import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "../layouts/ErrorLayout.jsx";
import PublicLayout from "../layouts/PublicLayout.jsx";
import ScrollToTop from "./ScrollToTop.jsx";
import { AdminProvider } from "../admin/AdminContext.jsx";

// Public Pages (Lazy Loaded)
const HomePage = lazy(() => import("../pages/HomePage.jsx"));
const AboutPage = lazy(() => import("../pages/AboutPage.jsx"));
const ServicesPage = lazy(() => import("../pages/ServicesPage.jsx"));
const ServiceDetailPage = lazy(() => import("../pages/ServiceDetailPage.jsx"));
const PortfolioPage = lazy(() => import("../pages/PortfolioPage.jsx"));
const WeddingGalleryPage = lazy(() => import("../pages/WeddingGalleryPage.jsx"));
const ContactPage = lazy(() => import("../pages/ContactPage.jsx"));
const BlogListingPage = lazy(() => import("../pages/BlogListingPage.jsx"));
const BlogDetailPage = lazy(() => import("../pages/BlogDetailPage.jsx"));
const BrandCollaborationsPage = lazy(() => import("../pages/BrandCollaborationsPage.jsx"));
const BrandCollaborationDetailPage = lazy(() => import("../pages/BrandCollaborationDetailPage.jsx"));
const FounderPage = lazy(() => import("../pages/FounderPage.jsx"));
const TeamPage = lazy(() => import("../pages/TeamPage.jsx"));
const TeamDetailPage = lazy(() => import("../pages/TeamDetailPage.jsx"));
const CareersPage = lazy(() => import("../pages/CareersPage.jsx"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage.jsx"));

// Admin CMS Pages (Lazy Loaded)
const AdminLoginPage = lazy(() => import("../admin/AdminLoginPage.jsx"));
const AdminLayout = lazy(() => import("../admin/AdminLayout.jsx"));
const DashboardOverview = lazy(() => import("../admin/modules/DashboardOverview.jsx"));
const HeroCMS = lazy(() => import("../admin/modules/HeroCMS.jsx"));
const PartnersCMS = lazy(() => import("../admin/modules/PartnersCMS.jsx"));
const ServicesCMS = lazy(() => import("../admin/modules/ServicesCMS.jsx"));
const PortfolioCMS = lazy(() => import("../admin/modules/PortfolioCMS.jsx"));
const VideoShowcaseCMS = lazy(() => import("../admin/modules/VideoShowcaseCMS.jsx"));
const PhotoShowcaseCMS = lazy(() => import("../admin/modules/PhotoShowcaseCMS.jsx"));
const WeddingGalleryCMS = lazy(() => import("../admin/modules/WeddingGalleryCMS.jsx"));
const CollaborationsCMS = lazy(() => import("../admin/modules/CollaborationsCMS.jsx"));
const BlogCMS = lazy(() => import("../admin/modules/BlogCMS.jsx"));
const TeamCMS = lazy(() => import("../admin/modules/TeamCMS.jsx"));
const CareersCMS = lazy(() => import("../admin/modules/CareersCMS.jsx"));
const EnquiriesCMS = lazy(() => import("../admin/modules/EnquiriesCMS.jsx"));
const ContactSettingsCMS = lazy(() => import("../admin/modules/ContactSettingsCMS.jsx"));
const ReviewsCMS = lazy(() => import("../admin/modules/ReviewsCMS.jsx"));
const MediaLibraryCMS = lazy(() => import("../admin/modules/MediaLibraryCMS.jsx"));
const SettingsCMS = lazy(() => import("../admin/modules/SettingsCMS.jsx"));
const UsersCMS = lazy(() => import("../admin/modules/UsersCMS.jsx"));
const AuditLogsCMS = lazy(() => import("../admin/modules/AuditLogsCMS.jsx"));
const SecurityProfile = lazy(() => import("../admin/modules/SecurityProfile.jsx"));
const TwoFactorAdmin = lazy(() => import("../admin/modules/TwoFactorAdmin.jsx"));
const SecurityPolicyCMS = lazy(() => import("../admin/modules/SecurityPolicyCMS.jsx"));

function LoadingFallback() {
  return (
    <div className="min-h-svh flex items-center justify-center bg-sage-bg text-site font-serif text-2xl">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(72,125,72)] border-t-transparent" />
        <span className="text-xs uppercase tracking-widest text-sage-muted">Loading Suite...</span>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <AdminProvider>
        <ScrollToTop />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Layout & Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/aboutus" element={<AboutPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/servicesdetails/:slug" element={<ServiceDetailPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/wedimages" element={<WeddingGalleryPage />} />
              <Route path="/wedding-gallery" element={<WeddingGalleryPage />} />
              <Route path="/contactus" element={<ContactPage />} />
              <Route path="/blog" element={<BlogListingPage />} />
              <Route path="/blog/:slug" element={<BlogDetailPage />} />
              <Route path="/brand-collaborations" element={<BrandCollaborationsPage />} />
              <Route path="/brand-collaborations/:slug" element={<BrandCollaborationDetailPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/team/:slug" element={<TeamDetailPage />} />
              <Route path="/founder" element={<FounderPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Admin CMS Routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardOverview />} />
              <Route path="hero" element={<HeroCMS />} />
              <Route path="partners" element={<PartnersCMS />} />
              <Route path="services" element={<ServicesCMS />} />
              <Route path="portfolio" element={<PortfolioCMS />} />
              <Route path="video-showcase" element={<VideoShowcaseCMS />} />
              <Route path="photo-showcase" element={<PhotoShowcaseCMS />} />
              <Route path="wedding-gallery" element={<WeddingGalleryCMS />} />
              <Route path="collaborations" element={<CollaborationsCMS />} />
              <Route path="blog" element={<BlogCMS />} />
              <Route path="team" element={<TeamCMS />} />
              <Route path="careers" element={<CareersCMS />} />
              <Route path="contact-settings" element={<ContactSettingsCMS />} />
              <Route path="enquiries" element={<EnquiriesCMS />} />
              <Route path="reviews" element={<ReviewsCMS />} />
              <Route path="media" element={<MediaLibraryCMS />} />
              <Route path="settings" element={<SettingsCMS />} />
              <Route path="users" element={<UsersCMS />} />
              <Route path="audit-logs" element={<AuditLogsCMS />} />
              <Route path="security" element={<SecurityProfile />} />
              <Route path="security/two-factor" element={<TwoFactorAdmin />} />
              <Route path="security/policy" element={<SecurityPolicyCMS />} />
            </Route>
          </Routes>
        </Suspense>
      </AdminProvider>
    </ErrorBoundary>
  );
}
