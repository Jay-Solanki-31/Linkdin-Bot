import ThemeToggle from "@/components/ThemeToggle";
import LinkedInStatus from "@/components/LinkedInStatus";

export default function Header() {
  return (
    <header
      role="banner"
      className="
        min-h-20 w-full
        bg-gradient-to-r from-background via-muted to-background
        border-b border-border
        flex items-center
        px-6 shadow-md
        transition-all duration-300
      "
    >
      <div className="flex items-center gap-3">
        <div
          className="
            w-10 h-10 rounded-xl
            bg-gradient-to-br from-blue-500 to-cyan-500
            flex items-center justify-center
            shadow-md
          "
        >
          <span className="text-white font-bold text-lg">L</span>
        </div>

        <h1
          className="
            text-2xl font-bold
            bg-gradient-to-r from-blue-400 to-cyan-400
            bg-clip-text text-transparent
          "
        >
          LinkedIn Bot
        </h1>
      </div>

      {/* Right: Theme Toggle */}
      <div className="ml-auto flex items-center">
        <ThemeToggle />
        <LinkedInStatus/>
      </div>
    </header>
  );
}
