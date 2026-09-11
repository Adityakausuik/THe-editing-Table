import { AnimatePresence, m } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useSiteSettings } from "../../lib/useSiteSettings.js";
import BrandLogo from "../ui/BrandLogo.jsx";
import Container from "../ui/Container.jsx";

const DEFAULT_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/aboutus", label: "About" },
  { href: "/founder", label: "Founder" },
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/team", label: "Team" },
  { href: "/careers", label: "Careers" },
  { href: "/blog", label: "Blog" },
  { href: "/contactus", label: "Contact" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { settings } = useSiteSettings();
  const cmsNav = settings.publicContent?.navigation;
  const siteLinks = Array.isArray(cmsNav) && cmsNav.length > 0
    ? cmsNav
    : DEFAULT_NAV_LINKS;

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", isOpen);
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const closeMenu = () => setIsOpen(false);

  return (
    <header
      className={`liquid-header fixed inset-x-0 top-0 z-50 ${isScrolled ? "is-scrolled py-2.5" : "py-4"}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Container className="liquid-header__bar relative z-50 flex items-center justify-between gap-3">
        <NavLink to="/" className="liquid-header__brand group flex min-w-0 items-center" aria-label="The Editing Table home" onClick={closeMenu}>
          <BrandLogo />
        </NavLink>

        <nav className="liquid-nav-row hidden items-center min-[1180px]:flex" aria-label="Primary navigation">
          {siteLinks.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.href === "/"}
              className={({ isActive }) =>
                `liquid-nav-link ${isActive ? "is-active" : ""}`
              }
            >
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden min-[1180px]:block">
          <NavLink
            to="/contactus"
            className={({ isActive }) => `liquid-nav-link liquid-nav-cta ${isActive ? "is-active" : ""}`}
          >
            <span>Start a Project</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </NavLink>
        </div>

        <button
          className="liquid-menu-button inline-flex h-11 w-11 items-center justify-center min-[1180px]:hidden"
          type="button"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      <AnimatePresence>
        {isOpen ? (
          <m.div
            id="mobile-navigation"
            className="liquid-mobile-panel fixed inset-0 z-40 overflow-y-auto px-4 sm:px-6 min-[1180px]:hidden"
            style={{ paddingTop: "var(--public-header-offset, 5.5rem)", paddingBottom: "env(safe-area-inset-bottom, 1.5rem)" }}
            initial={{ opacity: 0, y: "-10%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-10%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <nav className="mx-auto flex max-w-md flex-col gap-2.5 py-4" aria-label="Mobile navigation">
              {siteLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  end={link.href === "/"}
                  className={({ isActive }) =>
                    `liquid-mobile-link ${isActive ? "is-active" : ""}`
                  }
                  onClick={closeMenu}
                >
                  <span>{link.label}</span>
                </NavLink>
              ))}
              <NavLink
                to="/contactus"
                className={({ isActive }) => `liquid-mobile-link liquid-mobile-cta mt-2 ${isActive ? "is-active" : ""}`}
                onClick={closeMenu}
              >
                <span>Start a Project</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </NavLink>
            </nav>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
