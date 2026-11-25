import { AnimatePresence, m } from "framer-motion";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import BrandLogo from "../ui/BrandLogo.jsx";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services", hasChevron: true },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/about", label: "About" },
  { href: "/careers", label: "Careers" },
  { href: "/blog", label: "Blogs" },
  { href: "/contactus", label: "Contact" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

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
      className={`liquid-header pointer-events-auto fixed inset-x-0 top-0 z-50 transition-all duration-200 border-b bg-[#F8FBF7] ${
        isScrolled
          ? "border-[#E3ECE0] shadow-[0_2px_12px_rgba(40,60,35,0.04)]"
          : "border-[#E3ECE0]/70"
      }`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-[72px] flex items-center justify-between gap-4">
        {/* Left Side: Original Logo Asset */}
        <NavLink
          to="/"
          className="flex items-center shrink-0 group py-1"
          aria-label="The Editing Table home"
          onClick={closeMenu}
        >
          <BrandLogo className="h-8 sm:h-9 w-auto" />
        </NavLink>

        {/* Right Side Navigation (Desktop min-[1080px]) */}
        <nav
          className="hidden min-[1080px]:flex items-center gap-7 lg:gap-8 xl:gap-9"
          aria-label="Primary navigation"
        >
          {NAV_LINKS.map((link) => {
            const isServices = link.hasChevron;
            return (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.href === "/"}
                className={({ isActive }) =>
                  `group relative inline-flex items-center gap-1 py-1 text-[14px] lg:text-[15px] font-medium no-liquid-control transition-colors duration-200 ${
                    isActive
                      ? "text-[#1B3322] font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#487D48] after:rounded-full"
                      : "text-[#2C3B28] hover:text-[#487D48]"
                  }`
                }
              >
                <span>{link.label}</span>
                {isServices && (
                  <ChevronDown className="h-3 w-3 stroke-[2.2] opacity-60 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
                )}
              </NavLink>
            );
          })}

          {/* Start a Project CTA Button at Extreme Right */}
          <NavLink
            to="/contactus"
            className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-[#487D48] px-5 py-2 text-[14px] font-medium text-white shadow-sm hover:bg-[#3D6E3D] hover:shadow transition-all duration-200 no-liquid-control shrink-0"
          >
            <span>Start a Project</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[2.2]" aria-hidden="true" />
          </NavLink>
        </nav>

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#1B3322] hover:bg-[#1B3322]/5 transition-colors min-[1080px]:hidden no-liquid-control touch-manipulation"
          type="button"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            id="mobile-navigation"
            style={{ backgroundColor: "#F8FBF7" }}
            className="fixed inset-x-0 top-[64px] sm:top-[72px] bottom-0 z-40 bg-[#F8FBF7] border-b border-[#E3ECE0] px-6 py-6 overflow-y-auto overflow-x-hidden min-[1080px]:hidden flex flex-col justify-between shadow-2xl"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <nav className="flex flex-col gap-3 py-2" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  end={link.href === "/"}
                  className={({ isActive }) =>
                    `flex items-center justify-between py-2.5 min-h-[44px] text-[17px] font-medium transition-colors no-liquid-control ${
                      isActive
                        ? "text-[#1B3322] font-semibold border-b-2 border-[#487D48] w-fit"
                        : "text-[#2C3B28] hover:text-[#487D48]"
                    }`
                  }
                  onClick={closeMenu}
                >
                  <span>{link.label}</span>
                  {link.hasChevron && <ChevronDown className="h-4 w-4 opacity-60" />}
                </NavLink>
              ))}
            </nav>

            <div className="pt-6 pb-6 border-t border-[#E3ECE0]">
              <NavLink
                to="/contactus"
                className="flex items-center justify-center gap-2 rounded-full bg-[#487D48] px-6 py-3.5 text-[15px] font-medium text-white shadow-sm hover:bg-[#3D6E3D] transition-all no-liquid-control"
                onClick={closeMenu}
              >
                <span>Start a Project</span>
                <ArrowRight className="h-4 w-4" />
              </NavLink>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
