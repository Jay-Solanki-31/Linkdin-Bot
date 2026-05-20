import ThemeToggle from "@/components/ThemeToggle"
import LinkedInStatus from "@/components/LinkedInStatus"
import { useLocation } from "react-router-dom"

const routeNames = {
  "/": "Dashboard",
  "/fetcher": "Fetcher",
  "/records": "Records",
  "/posts": "AI Posts",
}

export default function Header() {
  const location = useLocation()
  const currentPage = routeNames[location.pathname] || "Dashboard"
  const breadcrumbs = location.pathname === "/" 
    ? ["Dashboard"]
    : ["Dashboard", currentPage]

  return (
    <header
      role="banner"
      className="w-full bg-background border-b border-border/40 flex items-center px-8 py-4 transition-all duration-300"
    >
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, i) => (
          <span
            key={i}
            className="flex items-center"
          >
            {i > 0 && <span className="mx-2 text-border">/</span>}
            <span className={i === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>
      
      <div className="flex items-center gap-2.5 ml-auto">
        <ThemeToggle />
        <LinkedInStatus />
      </div>
    </header>
  )
}
