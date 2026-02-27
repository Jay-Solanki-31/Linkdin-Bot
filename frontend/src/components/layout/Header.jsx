import ThemeToggle from "@/components/ThemeToggle";
import LinkedInStatus from "@/components/LinkedInStatus";

export default function Header() {
  return (
    <header
      role="banner"
      className="w-full bg-background border-b border-border/40 flex items-center px-8 py-4 transition-all duration-300"
    >
      <div className="flex items-center gap-2.5 ml-auto">
        <ThemeToggle />
        <LinkedInStatus/>
      </div>
    </header>
  );
}
