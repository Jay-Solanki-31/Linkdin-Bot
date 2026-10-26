import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/api";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PageHeader,
  PostPreview,
  PostStatus,
  ConfirmationDialog,
  Dialog,
  ErrorState,
} from "@/components/WorkspaceUI";
export default function Studio() {
  const [params] = useSearchParams();
  const { auth, isAuthenticated } = useAuth();
  const [articles, setArticles] = useState([]),
    [selected, setSelected] = useState(null);
  const [topic, setTopic] = useState(""),
    [articleId, setArticleId] = useState(params.get("articleId") || "");
  const [customPrompt, setCustomPrompt] = useState(""),
    [localTime, setLocalTime] = useState(""),
    [timezone, setTimezone] = useState("Asia/Kolkata");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  const [confirmation, setConfirmation] = useState(null),
    [scheduling, setScheduling] = useState(false);
  const [retry, setRetry] = useState(0);
  const [publishRequested, setPublishRequested] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const [a, s] = await Promise.all([
          api.get("/api/fetch", {
            params: { limit: 50 },
            signal: controller.signal,
          }),
          api.get("/api/automation/settings", { signal: controller.signal }),
        ]);
        if (active) {
          setArticles(a.data.data || a.data.items || []);
          setTimezone(s.data.timezone || "Asia/Kolkata");
          setError("");
        }
        if (params.get("postId")) {
          const p = await api.get("/api/ai-posts/" + params.get("postId"), {
            signal: controller.signal,
          });
          if (active) setSelected(p.data.data);
        }
      } catch (e) {
        if (active && !e.authHandled)
          setError("Could not load Studio. Please try again.");
      }
    }
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [isAuthenticated, auth?.memberUrn, params, retry]);
  useEffect(() => {
    if (!isAuthenticated || !selected?._id) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const { data } = await api.get("/api/ai-posts/" + selected._id);
        if (active)
          setSelected((prev) =>
            dirty ? { ...data.data, text: prev.text } : data.data,
          );
      } catch (e) {
        if (active && !e.authHandled)
          setError(
            "Status could not be refreshed. Check your connection before publishing.",
          );
      }
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAuthenticated, selected?._id, dirty]);
  async function run(operation, { save = false, clear = false } = {}) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const { data } = await operation();
      if (data.data) {
        setSelected(data.data);
        setDirty(false);
      }
      if (save) setDirty(false);
      setMessage(data.warning || data.message || "Changes saved.");
      if (clear) {
        setConfirmation(null);
        setScheduling(false);
      }
      return true;
    } catch (e) {
      if (!e.authHandled)
        setError(
          e.response?.data?.message ||
            "Request failed. Check the latest status before trying again.",
        );
      return false;
    } finally {
      setBusy(false);
    }
  }
  const editable = selected && ["draft", "queued"].includes(selected.status);
  const ready =
    editable &&
    Boolean(selected.text?.trim()) &&
    !dirty &&
    !selected.testMode &&
    !publishRequested;
  return (
    <div className="space-y-6 studio-page">
      <PageHeader
        title="Your ideas. Your voice."
        eyebrow="AI POST STUDIO"
        description="Find an angle, shape your message, and share something worth reading."
      />
      <div role="status" aria-live="polite" className="text-sm text-primary">
        {message}
      </div>
      {error && (
        <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
      )}
      <div className="studio-layout grid xl:grid-cols-[1.1fr_1fr] gap-6 items-start">
        <div className="space-y-6">
          <section className="surface p-5 sm:p-6 space-y-5">
            <div className="flex gap-3 items-center">
              <span className="avatar small">✦</span>
              <div>
                <h2 className="section-title">Start with an idea</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  A new perspective is a great place to begin.
                </p>
              </div>
            </div>
            <label className="field">
              Article
              <select
                value={articleId}
                onChange={(e) => setArticleId(e.target.value)}
              >
                <option value="">Use a custom topic</option>
                {articles.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.title}
                  </option>
                ))}
              </select>
              <span className="block mt-2 text-xs text-muted-foreground">
                Showing up to 50 articles. You can also start from the Content
                Library.
              </span>
            </label>
            {!articleId && (
              <label className="field">
                Topic
                <Input
                  placeholder="What would you like to share?"
                  value={topic}
                  maxLength={2000}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </label>
            )}
            <label className="field">
              Custom AI instructions
              <textarea
                rows={3}
                placeholder="Add your perspective, tone, or a specific takeaway…"
                value={customPrompt}
                maxLength={4000}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </label>
            <Button
              className="w-full"
              disabled={
                busy || Boolean(selected) || (!articleId && !topic.trim())
              }
              onClick={() =>
                run(() =>
                  api.post("/api/ai-posts/generate", {
                    articleId: articleId || undefined,
                    topic,
                    customPrompt,
                  }),
                )
              }
            >
              {busy ? "Working…" : "✦ Generate draft"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Generation runs in the background. Your post stays a draft until
              you publish or schedule it.
            </p>
            {selected && (
              <Button
                variant="ghost"
                disabled={busy || dirty}
                onClick={() => {
                  setSelected(null);
                  setMessage("");
                  setPublishRequested(false);
                }}
              >
                Start a new draft
              </Button>
            )}
          </section>
          {selected && (
            <section
              className="surface p-5 sm:p-6 space-y-4"
              aria-label="Draft editor"
            >
              <div className="flex justify-between gap-3">
                <h2 className="section-title">Make it yours</h2>
                <PostStatus status={selected.status} />
              </div>
              {selected.status === "generating" || !selected.text ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Waiting for generation. Status refreshes every 5 seconds.
                </p>
              ) : null}
              <label className="field">
                Post text
                <textarea
                  id="studio-post-text"
                  aria-describedby="studio-character-count"
                  rows={10}
                  maxLength={3000}
                  disabled={!editable || busy}
                  value={selected.text || ""}
                  onChange={(e) => {
                    setSelected({ ...selected, text: e.target.value });
                    setDirty(true);
                  }}
                />
              </label>
              <p
                id="studio-character-count"
                className="text-xs text-muted-foreground text-right"
              >
                {selected.text?.length || 0} / 3,000 characters
                {dirty ? " · Unsaved changes" : ""}
              </p>
              {selected.status === "review_required" && (
                <p role="alert" className="text-sm text-destructive">
                  The publishing outcome needs review. Check LinkedIn before
                  taking further action to avoid a duplicate post.
                </p>
              )}
              {selected.status === "publishing" && (
                <p role="status" className="text-sm">
                  Publishing is in progress. Wait for a confirmed outcome.
                </p>
              )}
              {selected.status === "failed" && (
                <p role="alert" className="text-sm text-destructive">
                  Processing failed. Review the post in AI Posts.
                </p>
              )}
              <div className="studio-actions flex flex-wrap gap-2">
                <Button
                  disabled={busy || !editable || !selected.text?.trim()}
                  onClick={() =>
                    run(
                      () =>
                        api.patch("/api/ai-posts/" + selected._id, {
                          text: selected.text,
                        }),
                      { save: true },
                    )
                  }
                >
                  Save draft
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    busy ||
                    dirty ||
                    selected.status !== "draft" ||
                    selected.creationMode !== "manual"
                  }
                  onClick={() => setConfirmation("regenerate")}
                >
                  Regenerate
                </Button>
              </div>
              <div className="studio-actions border-t pt-4 flex flex-wrap gap-2">
                <Button
                  disabled={busy || !ready}
                  onClick={() => setConfirmation("publish")}
                >
                  Publish now
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !ready}
                  onClick={() => setScheduling(true)}
                >
                  Schedule post
                </Button>
                {selected.status === "queued" && (
                  <Button
                    variant="ghost"
                    disabled={busy || dirty}
                    onClick={() => setConfirmation("cancel")}
                  >
                    Cancel schedule
                  </Button>
                )}
              </div>
              {publishRequested && (
                <p role="status" className="text-sm text-primary">
                  Publishing requested. Wait for a confirmed outcome before
                  taking further action.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Save your edits before publishing or scheduling. Test posts
                cannot be published.
              </p>
            </section>
          )}
        </div>
        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="flex justify-between items-center">
            <h2 className="section-title">Post preview</h2>
            <span className="text-xs text-muted-foreground">LINKEDIN</span>
          </div>
          <PostPreview post={selected} />
          <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground leading-6">
            <p className="font-medium text-foreground mb-1">
              A good post sounds like you.
            </p>
            Add a specific example, share what you learned, and give your reader
            something to think about.
          </div>
        </aside>
      </div>
      {confirmation && (
        <ConfirmationDialog
          title={
            confirmation === "publish"
              ? "Publish this post on LinkedIn?"
              : confirmation === "cancel"
                ? "Cancel this scheduled post?"
                : "Generate a new version?"
          }
          description={
            confirmation === "publish"
              ? "Your saved draft will be queued for publishing to your connected LinkedIn account. The queue will report the final result."
              : confirmation === "cancel"
                ? "The scheduled publishing job will be cancelled and the post will return to a draft."
                : "This replaces the saved text with a new AI generated draft."
          }
          confirmLabel={
            confirmation === "publish"
              ? "Confirm publishing"
              : confirmation === "cancel"
                ? "Cancel schedule"
                : "Regenerate draft"
          }
          busy={busy}
          onClose={() => setConfirmation(null)}
          onConfirm={async () => {
            const action = confirmation;
            const success = await run(
              () =>
                api.post("/api/ai-posts/" + selected._id + "/" + action, {
                  customPrompt,
                }),
              { clear: true },
            );
            if (success && action === "publish") setPublishRequested(true);
          }}
        />
      )}
      {scheduling && (
        <Dialog
          title="Plan the perfect moment"
          busy={busy}
          onClose={() => setScheduling(false)}
        >
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                if (new Date(localTime).toString() === "Invalid Date")
                  throw new Error();
                new Intl.DateTimeFormat("en", { timeZone: timezone });
              } catch {
                setError("Enter a valid date and IANA timezone.");
                return;
              }
              run(
                () =>
                  api.post("/api/ai-posts/" + selected._id + "/schedule", {
                    localTime,
                    timezone,
                  }),
                { clear: true },
              );
            }}
          >
            <label className="field">
              Local publishing time
              <Input
                required
                type="datetime-local"
                value={localTime}
                onChange={(e) => setLocalTime(e.target.value)}
              />
            </label>
            <label className="field">
              IANA timezone
              <Input
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </label>
            <p className="text-sm text-muted-foreground">
              Your saved draft will be queued for this local time in {timezone}.
              The server validates the time and reports any conflicts.
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy || !localTime || !timezone.trim()}
            >
              {busy ? "Scheduling…" : "Confirm schedule"}
            </Button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
