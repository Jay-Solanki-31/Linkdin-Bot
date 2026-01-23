import { useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Github, BookOpen, Newspaper, Package, Hash, Mail, Zap } from "lucide-react";
import { SiReddit } from "react-icons/si";
const sources = [
  { id: "github", label: "GitHub", icon: <Github className="w-6 h-6" />, color: "from-slate-900 to-slate-700 dark:from-zinc-400 dark:to-zinc-600", lightBg: "from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-black" },
  { id: "devto", label: "Dev.to", icon: <BookOpen className="w-6 h-6" />,color: "from-zinc-900 to-black dark:from-neutral-400 dark:to-neutral-600", lightBg: "from-zinc-100 to-zinc-200 dark:from-neutral-900 dark:to-black" },
  { id: "medium", label: "Medium", icon: <Newspaper className="w-6 h-6" />, color: "from-emerald-600 to-emerald-800 dark:from-emerald-400 dark:to-emerald-200", lightBg: "from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900" },
  { id: "npm", label: "NPM", icon: <Package className="w-6 h-6" />, color: "from-red-600 to-red-500 dark:from-red-400 dark:to-red-300", lightBg: "from-red-50 to-red-100 dark:from-red-950 dark:to-red-900" },
  { id: "hashnode", label: "Hashnode", icon: <Hash className="w-6 h-6" />, color: "from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-300", lightBg: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900" },
  { id: "nodeweekly", label: "Node Weekly", icon: <Mail className="w-6 h-6" />, color: "from-green-600 to-green-700 dark:from-green-400 dark:to-green-300", lightBg: "from-green-50 to-green-100 dark:from-green-950 dark:to-green-900" },
  { id: "reddit", label: "Reddit", icon: <SiReddit className="w-6 h-6" />, color: "from-orange-600 to-orange-500 dark:from-orange-400 dark:to-orange-300", lightBg: "from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900" }, 
];
export default function Fetcher() {
  const [loadingSource, setLoadingSource] = useState(null);

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

const handleFetch = async (source) => {
  setLoadingSource(source);

  try {
    const res = await axios.post(`/api/${source}`);

    await wait(350); 

    setLoadingSource(null);
    toast.success(res.data.message || "Fetch started");
  } catch (error) {
    await wait(300);

    setLoadingSource(null);
    toast.error(error.response?.data?.message || "Something went wrong");
  }
};

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Content Sources</h1>
        <p className="text-sm text-muted-foreground mt-1">Fetch articles from multiple platforms</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sources.map((s) => (
          <Card key={s.id} className="overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${s.color}`}></div>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`text-3xl p-3 rounded-lg bg-gradient-to-br ${s.lightBg} flex-shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <CardTitle className="text-base text-foreground">{s.label}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Trending content</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
        ))}
      </div>

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
  );
}
