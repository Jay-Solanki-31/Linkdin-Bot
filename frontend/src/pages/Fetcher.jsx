import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Github, BookOpen, Newspaper, Package, Hash, Mail, Zap } from "lucide-react"
import { SiReddit } from "react-icons/si"
import { startFetch } from "@/api/fetcher.api"

const sources = [
  { id: "github", label: "GitHub", icon: <Github className="w-6 h-6" />, color: "from-slate-900 to-slate-700", lightBg: "from-slate-50 to-slate-100" },
  { id: "devto", label: "Dev.to", icon: <BookOpen className="w-6 h-6" />, color: "from-zinc-900 to-black", lightBg: "from-zinc-100 to-zinc-200" },
  { id: "medium", label: "Medium", icon: <Newspaper className="w-6 h-6" />, color: "from-emerald-600 to-emerald-800", lightBg: "from-emerald-50 to-emerald-100" },
  { id: "npm", label: "NPM", icon: <Package className="w-6 h-6" />, color: "from-red-600 to-red-500", lightBg: "from-red-50 to-red-100" },
  { id: "hashnode", label: "Hashnode", icon: <Hash className="w-6 h-6" />, color: "from-blue-600 to-blue-700", lightBg: "from-blue-50 to-blue-100" },
  { id: "nodeweekly", label: "Node Weekly", icon: <Mail className="w-6 h-6" />, color: "from-green-600 to-green-700", lightBg: "from-green-50 to-green-100" },
  { id: "reddit", label: "Reddit", icon: <SiReddit className="w-6 h-6" />, color: "from-orange-600 to-orange-500", lightBg: "from-orange-50 to-orange-100" },
]

export default function Fetcher() {
  const [loadingSource, setLoadingSource] = useState(null)
  const [completedSource, setCompletedSource] = useState(null)

  const wait = (ms) => new Promise((res) => setTimeout(res, ms))

  const handleFetch = async (source) => {
    setLoadingSource(source)
    setCompletedSource(null)

    try {
      const res = await startFetch(source)
      await wait(350)

      setLoadingSource(null)
      setCompletedSource(source)
      setTimeout(() => setCompletedSource(null), 2000)
      toast.success(res.data.message || "Fetch started")
    } catch (error) {
      await wait(300)

      setLoadingSource(null)
      toast.error(error.response?.data?.message || "Something went wrong")
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Content Sources</h1>
        <p className="text-sm text-muted-foreground mt-1">Fetch articles from multiple platforms</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sources.map((s, idx) => (
          <div
            key={s.id}
            className="animate-fade-in"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className={`h-1 bg-gradient-to-r ${s.color}`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className={`text-3xl p-3 rounded-lg bg-gradient-to-br ${s.lightBg} dark:from-opacity-20 dark:to-opacity-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base text-foreground">{s.label}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Trending content</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {completedSource === s.id && (
                  <div className="absolute top-2 right-2 text-green-500 animate-scale-in">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <Button
                  className={`w-full bg-gradient-to-r ${s.color} text-white hover:shadow-lg transition-all duration-200`}
                  onClick={() => handleFetch(s.id)}
                  disabled={loadingSource === s.id}
                >
                  {loadingSource === s.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>Start Fetch</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Click any source to fetch latest articles automatically</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Articles are stored in the database and ready for AI processing</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 dark:text-blue-400">✓</span>
                <span>Check the Records tab to view all fetched content</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}