import { NavLink } from "react-router-dom";
import { LayoutDashboard, Download, FileText, Zap, Linkedin, PackageOpen, Settings } from "lucide-react";

export default function Sidebar() {
  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Fetcher", path: "/fetcher", icon: Download },
    { label: "Records", path: "/records", icon: FileText },
    { label: "AI Posts", path: "/posts", icon: Zap },
    { label: "LinkedIn", path: "/linkedin", icon: Linkedin },
    { label: "Queue", path: "/queue", icon: PackageOpen },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 min-h-screen bg-background border-r border-border/40 p-6 flex flex-col transition-all duration-300">
      <div className="mb-10 pb-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">LB</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">LinkedIn Bot</h2>
            <p className="text-xs text-muted-foreground">Automation</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-3.5 py-2.5 rounded-md flex items-center gap-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-border/40 text-xs text-muted-foreground">
        <p>© 2026 LinkedIn Bot</p>
      </div>
    </aside>
  );
}
