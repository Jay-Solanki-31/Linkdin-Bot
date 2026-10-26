import { useState } from "react";
import { Link } from "react-router-dom";
import { Github, BookOpen, Newspaper, Mail, Download } from "lucide-react";
import { SiReddit, SiYcombinator } from "react-icons/si";
import { startFetch } from "@/api/fetcher.api";
import { PageHeader } from "@/components/WorkspaceUI";
import { Button } from "@/components/ui/button";
const sources = [
  [
    "github",
    "GitHub",
    "Discover projects and ideas from the developer community.",
    Github,
  ],
  [
    "devto",
    "Dev.to",
    "Practical insights and stories from fellow developers.",
    BookOpen,
  ],
  [
    "medium",
    "Medium",
    "Longer reads and new perspectives on technology.",
    Newspaper,
  ],
  [
    "hackernews",
    "Hacker News",
    "Explore the conversations shaping the tech world.",
    SiYcombinator,
  ],
  [
    "nodeweekly",
    "Node Weekly",
    "Stay close to the JavaScript and Node.js ecosystem.",
    Mail,
  ],
  [
    "reddit",
    "Reddit",
    "Find discussions and ideas from the community.",
    SiReddit,
  ],
];
export default function Fetcher() {
  const [busy, setBusy] = useState(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function collect(source) {
    if (busy) return;
    setBusy(source);
    setError("");
    setMessage("");
    try {
      const { data } = await startFetch(source);
      setMessage(
        data.message ||
          "Collection queued. Articles will appear in your Content Library when processing completes.",
      );
    } catch (e) {
      if (!e.authHandled)
        setError(
          e.response?.data?.message ||
            "Collection could not start. Please try again.",
        );
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Great content starts with curiosity."
        eyebrow="CONTENT SOURCES"
        description="Bring fresh ideas into your library. Choose a source to queue article collection."
      >
        <Button variant="outline" asChild>
          <Link to="/records">Open library →</Link>
        </Button>
      </PageHeader>
      {message && (
        <p role="status" className="surface p-4 text-sm text-primary">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="surface p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {sources.map(([id, title, description, Icon]) => (
          <article key={id} className="surface p-6 flex flex-col gap-4">
            <div className="w-11 h-11 bg-accent text-primary rounded-xl grid place-content-center">
              <Icon size={22} />
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground leading-6 flex-1">
              {description}
            </p>
            <Button
              className="mt-3"
              variant="outline"
              disabled={Boolean(busy)}
              onClick={() => collect(id)}
            >
              <Download size={15} />
              {busy === id ? "Starting collection…" : "Collect articles"}
            </Button>
          </article>
        ))}
      </div>
      <section className="surface p-6">
        <h2 className="section-title">From reading to writing</h2>
        <p className="text-sm text-muted-foreground leading-7 mt-2">
          Collection runs in the background. Once articles arrive, open your
          Content Library, choose a story, and create a draft in AI Post Studio.
          Opening this page does not start collection.
        </p>
      </section>
    </div>
  );
}