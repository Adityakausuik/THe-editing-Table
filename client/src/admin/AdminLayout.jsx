import {
  Briefcase,
  Camera,
  FileText,
  Grid,
  Image,
  Images,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Phone,
  RotateCcw,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
  X
} from "lucide-react";
import { useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import BrandLogo from "../components/ui/BrandLogo.jsx";
import { useAdmin } from "./AdminContext.jsx";

const navSections = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard Overview", path: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Hero & Home CMS", path: "/admin/hero", icon: Sparkles }
    ]
  },
  {
    title: "Content Modules",
    items: [
      { label: "Working Partners", path: "/admin/partners", icon: Briefcase },
      { label: "Services Suite", path: "/admin/services", icon: Grid },
      { label: "Portfolio Showcase", path: "/admin/portfolio", icon: Images },
      { label: "Video Showcase", path: "/admin/video-showcase", icon: Video },
      { label: "Photo Showcase", path: "/admin/photo-showcase", icon: Camera },
      { label: "Wedding Gallery", path: "/admin/wedding-gallery", icon: Image },
      { label: "Brand Collaborations", path: "/admin/collaborations", icon: Briefcase },
      { label: "Blog Journal", path: "/admin/blog", icon: FileText },
      { label: "Team Members", path: "/admin/team", icon: Users },
      { label: "Careers & Jobs", path: "/admin/careers", icon: Briefcase }
    ]
  },
  {
    title: "Studio Management",
    items: [
      { label: "Contact Settings", path: "/admin/contact-settings", icon: Phone },
      { label: "Contact Enquiries", path: "/admin/enquiries", icon: Mail },
      { label: "Client Endorsements", path: "/admin/reviews", icon: Star },
      { label: "Media Library", path: "/admin/media", icon: Images },
      { label: "Website Settings", path: "/admin/settings", icon: Settings },
      { label: "My Security", path: "/admin/security", icon: ShieldCheck },
      { label: "Two-Factor Management", path: "/admin/security/two-factor", icon: Shield, roles: ["admin", "superadmin"] },
      { label: "Security Policy", path: "/admin/security/policy", icon: Settings, roles: ["superadmin"] },
      { label: "Admin Users", path: "/admin/users", icon: Shield, roles: ["superadmin"] },
      { label: "Security Audit Logs", path: "/admin/audit-logs", icon: RotateCcw, roles: ["superadmin"] }
    ]
  }
];

export default function AdminLayout() {
  const { user, authLoading, isAuthenticated, logoutUser } = useAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  if (authLoading) {
    return <div className="min-h-svh flex items-center justify-center bg-sage-bg text-sage-muted">Checking session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = async () => {
    await logoutUser();
    navigate("/admin/login");
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-sage-bg text-forest flex flex-col lg:flex-row">
      {/* Mobile Topbar */}
      <header className="lg:hidden shrink-0 flex items-center justify-between border-b border-sage-border bg-sage-card/90 p-4 backdrop-blur-md">
        <BrandLogo imageClassName="h-8" />
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="h-10 w-10 flex items-center justify-center rounded-xl border border-sage-border bg-sage-bg text-forest"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar Navigation - Fixed 100% Height */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-sage-border bg-sage-card p-4 transition-transform duration-300 lg:static lg:h-full lg:translate-x-0 flex flex-col justify-between overflow-hidden shrink-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden space-y-3">
          {/* Header & Logo (Pinned Top) */}
          <div className="space-y-3 shrink-0">
            <div className="flex items-center justify-between px-1">
              <BrandLogo imageClassName="h-8" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="lg:hidden text-sage-muted hover:text-forest"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Profile Badge */}
            <div className="rounded-2xl border border-sage-light/30 bg-sage-secondary/60 p-2.5 flex items-center gap-2.5 shadow-soft">
              <div className="h-8 w-8 rounded-full bg-[rgb(72,125,72)] text-white flex items-center justify-center font-serif font-bold text-xs shrink-0">
                {user?.name?.charAt(0) || "A"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-forest truncate">{user?.name || "Admin"}</p>
                <p className="text-[10px] text-site uppercase tracking-wider font-bold">
                  {user?.role || "superadmin"}
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Nav List (Middle Scroll) */}
          <nav className="flex-1 overflow-y-auto space-y-3 pr-0.5 no-scrollbar">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-site">
                  {section.title}
                </p>
                {section.items.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-xl px-3 py-2 text-[11.5px] font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-[rgb(72,125,72)] text-white font-semibold shadow-soft"
                            : "text-sage-muted hover:bg-sage-secondary/70 hover:text-forest"
                        }`
                      }
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bottom Actions (Pinned Bottom) */}
          <div className="pt-2 border-t border-sage-border/60 space-y-1.5 shrink-0">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-sage-border bg-sage-card px-3.5 py-1.5 text-[11px] font-semibold text-forest hover:border-[rgb(72,125,72)] hover:text-site transition"
            >
              Preview Live Site ↗
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 px-3.5 py-1.5 text-[11px] font-semibold hover:bg-rose-100 transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area - Independent Scroll Container (Hidden Scrollbar Track) */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-sage-bg no-scrollbar">
        <Outlet />
      </main>
    </div>
  );
}
