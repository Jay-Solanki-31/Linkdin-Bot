import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Download,
  FileText,
  Zap,
  PackageOpen,
} from "lucide-react";

export default function Sidebar() {
  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Fetcher", path: "/fetcher", icon: Download },
    { label: "Records", path: "/records", icon: FileText },
    // { label: "Fetched", path: "/fetched", icon: FileText },
    { label: "AI Posts", path: "/posts", icon: Zap },
    { label: "Queue", path: "/queue", icon: PackageOpen },
  ];

  return (
    <aside className="w-64 min-h-screen bg-background border-r border-border/40 p-6 flex flex-col">
      <div className="mb-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">LB</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold">LinkedIn Bot</h2>
            <p className="text-xs text-muted-foreground">Automation</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `px-3.5 py-2.5 rounded-md flex items-center gap-3 text-sm font-medium ${
                isActive
                  ? "bg-blue-600/10 text-blue-600"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="pt-6 border-t text-xs text-muted-foreground">
        © {new Date().getFullYear()} LinkedIn Bot
      </div>
    </aside>
  );
}
