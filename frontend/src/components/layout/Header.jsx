export default function Header() {
  return (
    <header
      role="banner"
      className="min-h-20 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 
                 border-b border-slate-700 flex items-center px-6 shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 
                        flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-lg">L</span>
        </div>

        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 
                       bg-clip-text text-transparent">
          LinkedIn Bot
        </h1>
      </div>
    </header>
  );
}
