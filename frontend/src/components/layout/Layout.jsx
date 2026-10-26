import { useAuth } from "@/auth/AuthContext";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet, useLocation } from "react-router-dom";
import useMediaQuery from "@/hooks/useMediaQuery";
export default function Layout({ children }) {
  const { auth } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const desktop = useMediaQuery("(min-width: 1024px)");
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="app-body" inert={open && !desktop}>
        <Header open={open} onMenu={() => setOpen(!open)} />
        <main
          id="main-content"
          className="workspace-content"
          key={auth?.memberUrn || auth?.linkedinMemberUrn || "account"}
        >
          <div key={location.pathname}>{children || <Outlet />}</div>
        </main>
      </div>
    </div>
  );
}
