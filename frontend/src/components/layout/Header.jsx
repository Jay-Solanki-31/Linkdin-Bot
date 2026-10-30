import AccountIdentity from "@/components/AccountIdentity";
import ThemeToggle from "@/components/ThemeToggle";
import LinkedInStatus from "@/components/LinkedInStatus";
import { Menu } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
const names = {
  "/": "Overview", "/studio": "AI Post Studio", "/records": "Content Library",
  "/posts": "AI Posts", "/calendar": "Calendar", "/analytics": "Analytics",
  "/fetcher": "Content Sources", "/settings": "Settings",
};
export default function Header({ open, onMenu }) {
  const { pathname } = useLocation();
  return (
    <header className="app-topbar">
      <button className="lg:hidden p-2" aria-label="Open navigation" aria-expanded={open} aria-controls="workspace-navigation" onClick={onMenu}>
        <Menu size={20} />
      </button>
      <nav aria-label="Breadcrumb" className="text-sm">
        <span className="text-muted-foreground hidden sm:inline">Workspace <span className="mx-3">/</span></span>
        {names[pathname] || "Overview"}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:block"><LinkedInStatus /></div>
        <ThemeToggle />
        <details className="relative">
          <summary className="cursor-pointer list-none" aria-label="Account menu"><AccountIdentity compact /></summary>
          <div className="absolute right-0 mt-3 w-64 rounded-lg border bg-background p-4 shadow-lg z-50">
            <AccountIdentity />
            <Link to="/settings" className="mt-3 block text-sm text-primary">Account settings</Link>
          </div>
        </details>
      </div>
    </header>
  );
}
