import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getFetchedContent } from "@/api/fetcher.api";
import { useAuth } from "@/auth/AuthContext";
import {
  PageHeader,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Dialog,
} from "@/components/WorkspaceUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function FetcherList() {
  const { isAuthenticated, auth } = useAuth();
  const [records, setRecords] = useState(null),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [selected, setSelected] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setQuery(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    getFetchedContent({ page, limit: 12, search: query })
      .then((r) => {
        if (active) {
          setRecords(r.data.data || []);
          setPages(r.data.pagination?.pages || 1);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("Your content library could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [page, query, isAuthenticated, auth?.memberUrn, retry]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Your next idea is in here."
        eyebrow="CONTENT LIBRARY"
        description="A collection of articles to inspire your next conversation."
      >
        <Button asChild>
          <Link to="/fetcher">＋ Collect articles</Link>
        </Button>
      </PageHeader>
      <div className="filter-toolbar surface p-4 flex flex-wrap gap-3 items-center">
        <Input
          className="sm:max-w-sm"
          aria-label="Search articles"
          placeholder="Search by title or source…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-xs text-muted-foreground sm:ml-auto">
          Curate → Create → Share
        </span>
      </div>
      {error && (
        <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
      )}
      {!records ? (
        !error && <LoadingSkeleton />
      ) : !records.length ? (
        <section className="surface">
          <EmptyState
            title={
              query ? "No matching articles" : "Build your inspiration library"
            }
            description="Collect articles from your favorite sources, or try a different search."
          >
            <Button asChild variant="outline">
              <Link to="/fetcher">Explore sources</Link>
            </Button>
          </EmptyState>
        </section>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {records.map((item) => (
            <article key={item._id} className="surface p-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-primary bg-accent px-2 py-1 rounded">
                  {item.source || "Article"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : ""}
                </span>
              </div>
              <h2 className="font-semibold leading-6 text-sm">{item.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-3 leading-6">
                {item.description ||
                  item.text ||
                  "Open the article for more context."}
              </p>
              <div className="card-actions flex flex-wrap gap-2 mt-auto pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(item)}
                >
                  Read article
                </Button>
                <Button size="sm" asChild>
                  <Link to={"/studio?articleId=" + item._id}>
                    Create draft →
                  </Link>
                </Button>
              </div>
              {item.aiGenerated && (
                <p className="text-xs text-muted-foreground">
                  An AI post already exists for this article.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => {
              setRecords(null);
              setPage((n) => n - 1);
            }}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => {
              setRecords(null);
              setPage((n) => n + 1);
            }}
          >
            Next
          </Button>
        </div>
      )}
      {selected && (
        <Dialog title={selected.title} onClose={() => setSelected(null)}>
          <p className="text-xs text-muted-foreground mb-5">
            {selected.source}
            {selected.expiresAt
              ? " · Expires " +
                new Date(selected.expiresAt).toLocaleDateString()
              : ""}
          </p>
          <p className="text-sm whitespace-pre-wrap leading-7 mb-6">
            {selected.description ||
              selected.text ||
              "No article content available."}
          </p>
          <div className="flex flex-wrap gap-3">
            {selected.url && (
              <Button asChild variant="outline">
                <a href={selected.url} target="_blank" rel="noreferrer">
                  Read source ↗
                </a>
              </Button>
            )}
            <Button asChild>
              <Link to={"/studio?articleId=" + selected._id}>
                Generate with AI
              </Link>
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}