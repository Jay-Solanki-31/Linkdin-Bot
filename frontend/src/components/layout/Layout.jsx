import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar />

      <div className="flex flex-col flex-1">
        <Header />

        <main
          className="
            flex-1 overflow-y-auto p-8
            bg-gradient-to-br
            from-background
            via-muted
            to-background
            transition-all duration-300
          "
        >

          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
