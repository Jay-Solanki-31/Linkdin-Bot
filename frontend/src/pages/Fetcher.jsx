import { useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const sources = [
  { id: "github", label: "GitHub", icon: "🐙", color: "from-gray-600 to-gray-800 dark:from-gray-700 dark:to-gray-900", lightBg: "from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700" },
  { id: "devto", label: "Dev.to", icon: "📝", color: "from-slate-500 to-slate-700 dark:from-slate-600 dark:to-slate-900", lightBg: "from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700" },
  { id: "medium", label: "Medium", icon: "📰", color: "from-slate-500 to-slate-700 dark:from-slate-600 dark:to-slate-900", lightBg: "from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700" },
  { id: "npm", label: "NPM", icon: "📦", color: "from-red-500 to-red-600 dark:from-red-600 dark:to-red-700", lightBg: "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20" },
  { id: "hackernews", label: "Hacker News", icon: "🔥", color: "from-orange-500 to-orange-600", lightBg: "from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20" },
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
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-foreground">Content Sources</h1>
        <p className="bg-muted">Fetch articles from multiple platforms with a single click</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sources.map((s) => (
          <Card key={s.id} className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-background group">
            <div className={`h-1 bg-gradient-to-r ${s.color}`}></div>
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className={`text-4xl p-3 rounded-xl bg-gradient-to-br ${s.lightBg}`}>
                  {s.icon}
                </div>
                <div>
                  <CardTitle className="text-foreground">{s.label}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Fetch trending content</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className={`w-full bg-gradient-to-r ${s.color} hover:shadow-lg transition-all duration-300`}
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

      <Card className="border-0 shadow-lg bg-gradient-to-br from-muted to-card">
        <CardHeader>
          <CardTitle className="text-foreground">💡 Quick Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>✓ Click any source to fetch latest articles automatically</li>
            <li>✓ Articles are stored in the database and ready for AI processing</li>
            <li>✓ Check the Records tab to view all fetched content</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
