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
      className="w-64 min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 
                 text-white p-6 border-r border-slate-700 shadow-xl"
    >
      <div className="mb-8 pb-6 border-b border-slate-700">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 
                       bg-clip-text text-transparent">
          Bot Control
        </h2>
        <p className="text-sm text-slate-400 mt-1">Manage your automation</p>
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
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
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
