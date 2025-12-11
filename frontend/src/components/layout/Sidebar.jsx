import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const navItems = [
    { label: "Dashboard", path: "/" },
    { label: "Fetcher", path: "/fetcher" },
    { label: "FetcherRecords", path: "/records" },
    { label: "AI Posts", path: "/posts" },
    { label: "LinkedIn", path: "/linkedin" },
    { label: "Settings", path: "/settings" },
  ];

  return (
    <aside className="w-64 h-screen bg-gray-900 text-white p-4">
      <h2 className="text-xl font-bold mb-6">LinkedIn Bot</h2>
      <nav className="flex flex-col gap-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `p-2 rounded-md transition ${
                isActive ? "bg-blue-600" : "hover:bg-gray-700"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
