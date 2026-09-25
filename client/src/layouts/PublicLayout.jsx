import { LazyMotion, domAnimation, m } from "framer-motion";
import { Outlet } from "react-router-dom";
import Footer from "../components/layout/Footer.jsx";
import Navbar from "../components/layout/Navbar.jsx";

export default function PublicLayout() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="relative flex min-h-dvh flex-col overflow-x-hidden text-forest">
        <Navbar />
        <m.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          id="main-content"
          className="flex-1"
        >
          <Outlet />
        </m.main>
        <Footer />
      </div>
    </LazyMotion>
  );
}
