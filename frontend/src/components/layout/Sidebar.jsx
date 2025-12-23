import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const navItems = [
    { label: "Dashboard", path: "/", icon: "📊" },
    { label: "Fetcher", path: "/fetcher", icon: "🔄" },
    { label: "Records", path: "/records", icon: "📋" },
    { label: "AI Posts", path: "/posts", icon: "✨" },
    { label: "LinkedIn", path: "/linkedin", icon: "🔗" },
    { label: "Queue", path: "/queue", icon: "📦" },
    { label: "Settings", path: "/settings", icon: "⚙️" },
  ];

  return (
    <aside
      className="w-64 min-h-screen bg-gradient-to-b text-foreground from-background via-muted to-background 
                 p-6 border-r border-border shadow-xl transition-all duration-300"
    >
      <div className="mb-8 pb-6 border-b border-border">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 
                       bg-clip-text text-transparent">
          Bot Control
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your automation</p>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-4 py-3 rounded-lg transition-all duration-300 flex items-center gap-3 font-medium
              ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                  : "bg-muted hover:bg-card text-foreground hover:text-foreground"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
