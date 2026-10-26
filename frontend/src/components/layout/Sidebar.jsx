import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Download,
  Library,
  WandSparkles,
  FileText,
  BarChart3,
  CalendarDays,
  Settings,
  PanelLeftClose,
} from "lucide-react";
import { useEffect, useRef } from "react";
import useMediaQuery from "@/hooks/useMediaQuery";
import LinkedInStatus from "@/components/LinkedInStatus";
const items = [
  ["Overview", "/", LayoutDashboard],
  ["AI Post Studio", "/studio", WandSparkles],
  ["Content Library", "/records", Library],
  ["AI Posts", "/posts", FileText],
  ["Calendar", "/calendar", CalendarDays],
  ["Analytics", "/analytics", BarChart3],
  ["Content Sources", "/fetcher", Download],
  ["Settings", "/settings", Settings],
];
export default function Sidebar({ open, onClose }) {
  const sidebarRef = useRef(null);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const modalOpen = open && !desktop;
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = sidebarRef.current;
    const controls = () => [
      ...panel.querySelectorAll("a[href],button:not([disabled])"),
    ];
    controls()[0]?.focus();
    const trap = (event) => {
      if (event.key !== "Tab") return;
      const elements = controls();
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    panel.addEventListener("keydown", trap);
    return () => {
      panel.removeEventListener("keydown", trap);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [modalOpen]);
  return (
    <>
      {modalOpen && (
        <button
          className="nav-overlay"
          onClick={onClose}
          aria-label="Close navigation"
          tabIndex={-1}
        />
      )}
      <aside
        ref={sidebarRef}
        role={modalOpen ? "dialog" : undefined}
        aria-modal={modalOpen ? true : undefined}
        aria-hidden={!desktop && !open ? true : undefined}
        inert={!desktop && !open}
        aria-label="Workspace navigation"
        id="workspace-navigation"
        className={`app-sidebar ${open ? "is-open" : ""}`}
      >
        <div className="brand">
          <div className="brand-icon">
            in<span>✦</span>
          </div>
          <div>
            LinkedIn Bot<p>CONTENT WORKSPACE</p>
          </div>
          <button
            className="lg:hidden ml-auto p-2"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <PanelLeftClose size={20} />
          </button>
        </div>
        <p className="eyebrow px-6 mb-3">CREATE & GROW</p>
        <nav aria-label="Main navigation">
          {items.map(([label, path, Icon]) => (
            <NavLink
              end={path === "/"}
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="text-primary">✦</span>
          <p className="font-medium mt-2">
            A little consistency.
            <br />A bigger presence.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Ideas, drafts, and your next great post. All in one place.
          </p>
          <NavLink to="/studio" onClick={onClose}>
            Create a post →
          </NavLink>
        </div>
        <div className="sidebar-footer">
          <div className="sm:hidden mb-4">
            <LinkedInStatus />
          </div>
          Your voice. Thoughtfully amplified.
        </div>
      </aside>
    </>
  );
}
