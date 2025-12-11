import { useState } from "react";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const sources = [
  { id: "github", label: "GitHub" },
  { id: "devto", label: "Dev.to" },
  { id: "medium", label: "Medium" },
  { id: "npm", label: "NPM" },
  { id: "hackernews", label: "Hacker News" },
];

export default function Fetcher() {
  const [loadingSource, setLoadingSource] = useState(null);

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  const handleFetch = async (source) => {
    setLoadingSource(source);

    try {
      const res = await axios.post(`http://localhost:5000/api/${source}`);

      // give UI time to update
      await wait(250);

      toast.success(res.data.message || "Fetch started");
    } catch (error) {
      await wait(150);
      toast.error(error.response?.data?.message || "Something went wrong");
    }

    setLoadingSource(null);
  };

  return (
    <div className="grid md:grid-cols-3 gap-6 p-6">
      {sources.map((s) => (
        <Card key={s.id} className="shadow-md border">
          <CardHeader>
            <CardTitle>{s.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleFetch(s.id)}
              disabled={loadingSource === s.id}
            >
              {loadingSource === s.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                "Fetch Now"
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
