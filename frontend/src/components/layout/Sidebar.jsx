import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Download,
  FileText,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Fetcher", path: "/fetcher", icon: Download },
    { label: "Records", path: "/records", icon: FileText },
    { label: "AI Posts", path: "/posts", icon: Zap },
  ]

  return (
    <aside
      className={cn(
        "min-h-screen bg-background border-r border-border/40 flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">LB</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold">LinkedIn Bot</h2>
              <p className="text-xs text-muted-foreground">Automation</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-muted/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 flex-1 px-4">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "px-3.5 py-2.5 rounded-md flex items-center gap-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue-600/10 text-blue-600"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  collapsed && "justify-center px-2.5"
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className={cn("pt-6 border-t text-xs text-muted-foreground", collapsed ? "px-2 text-center" : "px-6")}>
        {!collapsed && `© ${new Date().getFullYear()} LinkedIn Bot`}
        {collapsed && "©"}
      </div>
    </aside>
  )
}
