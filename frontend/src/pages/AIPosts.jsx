import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAIPosts, deleteAIPost } from "@/api/aiPosts.api";
import { useAuth } from "@/auth/AuthContext";
import {
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PostStatus,
  ConfirmationDialog,
} from "@/components/WorkspaceUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function AIPosts() {
  const { isAuthenticated, auth } = useAuth();
  const [posts, setPosts] = useState(null),
    [meta, setMeta] = useState(null),
    [counts, setCounts] = useState({});
  const [page, setPage] = useState(1),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState("");
  const [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [target, setTarget] = useState(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    async function load() {
      try {
        const r = await fetchAIPosts({ page, limit: 12 });
        if (active) {
          setPosts(r.data.data || []);
          setMeta(r.data.pagination);
          setCounts(r.data.statusCounts || {});
          setError("");
        }
      } catch {
        if (active) setError("Could not load your posts.");
      }
    }
    load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAuthenticated, auth?.memberUrn, page, retry]);
  async function remove() {
    setBusy(true);
    try {
      await deleteAIPost(target._id);
      setTarget(null);
      setPosts(null);
      setRetry((n) => n + 1);
    } catch (e) {
      setError(e.response?.data?.message || "Could not delete this post.");
      setTarget(null);
    } finally {
      setBusy(false);
    }
  }
  const shown = (posts || []).filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      (p.title || p.topic || p.text || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Every post, in one place."
        eyebrow="AI POSTS"
        description="From first draft to published. Keep your content moving."
      >
        <Button asChild>
          <Link to="/studio">＋ Create a post</Link>
        </Button>
      </PageHeader>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          label="Published"
          value={counts.posted ?? 0}
          detail="Confirmed published posts"
        />
        <StatCard
          label="Scheduled"
          value={counts.queued ?? 0}
          detail="Waiting in the publishing queue"
        />
        <StatCard
          label="Needs attention"
          value={(counts.failed || 0) + (counts.review_required || 0)}
          detail="Failed or awaiting outcome review"
        />
      </div>
      <div className="filter-toolbar surface p-4 flex flex-wrap gap-3 items-center">
        <Input
          className="sm:max-w-xs"
          aria-label="Search posts on this page"
          placeholder="Search this page…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="text-xs text-muted-foreground">
          Status{" "}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {[
              "all",
              "draft",
              "generating",
              "queued",
              "publishing",
              "posted",
              "failed",
              "review_required",
            ].map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-muted-foreground sm:ml-auto">
          Filters apply to this page
        </span>
      </div>
      {error && (
        <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
      )}
      {!posts ? (
        !error && <LoadingSkeleton />
      ) : !shown.length ? (
        <section className="surface">
          <EmptyState
            title="Room for your next idea"
            description="Create a post or adjust the filters on this page."
          >
            <Button asChild>
              <Link to="/studio">Open Studio</Link>
            </Button>
          </EmptyState>
        </section>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {shown.map((post) => (
            <article
              className="surface flex flex-col overflow-hidden"
              key={post._id}
            >
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt=""
                  loading="lazy"
                  className="post-card-image w-full h-40 object-contain bg-muted"
                />
              )}
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <PostStatus status={post.status} />
                  <span className="text-xs text-muted-foreground">
                    {post.testMode
                      ? "Test only"
                      : post.creationMode || "automatic"}
                  </span>
                </div>
                <h2 className="font-semibold text-sm">
                  {post.title || post.topic || "Untitled draft"}
                </h2>
                <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {post.text || "Waiting for generation…"}
                </p>
                {post.publishAt && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.publishAt).toLocaleString(undefined, {
                      timeZone: post.timezone || "Asia/Kolkata",
                    })}
                    <br />
                    {post.timezone || "Asia/Kolkata"}
                  </p>
                )}
                {post.status === "review_required" && (
                  <p role="alert" className="text-xs text-destructive">
                    Check LinkedIn before retrying. The publishing outcome is
                    uncertain.
                  </p>
                )}
                <div className="card-actions flex flex-wrap gap-2 mt-auto pt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link to={"/studio?postId=" + post._id}>View / edit</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={
                      !["draft", "queued", "failed"].includes(post.status) ||
                      busy
                    }
                    onClick={() => setTarget(post)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            disabled={page <= 1 || busy}
            onClick={() => {
              setPosts(null);
              setPage((p) => p - 1);
            }}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= meta.totalPages || busy}
            onClick={() => {
              setPosts(null);
              setPage((p) => p + 1);
            }}
          >
            Next
          </Button>
        </div>
      )}
      {target && (
        <ConfirmationDialog
          title="Delete this post?"
          description="This permanently removes the post and its queued jobs. This cannot be undone."
          confirmLabel="Delete post"
          busy={busy}
          onClose={() => setTarget(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
