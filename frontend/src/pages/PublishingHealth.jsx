import { useEffect, useState } from "react";
import api from "@/api";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PostStatus,
  Dialog,
  ConfirmationDialog,
} from "@/components/WorkspaceUI";
const base = "/api/publishing-health";
const date = (value) => (value ? new Date(value).toLocaleString() : "—");
export default function PublishingHealth() {
  const { auth, isAuthenticated } = useAuth();
  // Identity-keyed subtree prevents a render of the previous account's incidents.
  return isAuthenticated && auth?.memberUrn ? (
    <HealthView key={auth.memberUrn} />
  ) : (
    <ErrorState message="Session expired. Reconnect LinkedIn." />
  );
}
export function HealthView() {
  const [filter, setFilter] = useState(""),
    [mode, setMode] = useState(""),
    [period, setPeriod] = useState(""),
    [page, setPage] = useState(1);
  const [snapshot, setSnapshot] = useState(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState(null),
    [detail, setDetail] = useState(null),
    [historyPage, setHistoryPage] = useState(1);
  const [confirmation, setConfirmation] = useState(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let alive = true,
      loading = false,
      timer;
    const controller = new AbortController();
    async function load() {
      if (loading || document.hidden) return;
      loading = true;
      const params = {
        page,
        ...(mode ? { mode } : {}),
        ...(filter === "ai"
          ? { stage: "ai", status: "failed" }
          : filter === "linkedin"
            ? { stage: "linkedin", status: "failed" }
            : filter
              ? { status: filter }
              : {}),
        ...(period
          ? {
              from: new Date(
                Date.now() - Number(period) * 86400000,
              ).toISOString(),
            }
          : {}),
      };
      try {
        const [summary, incidents, details, history] = await Promise.all([
          api.get(`${base}/summary`, { signal: controller.signal }),
          api.get(`${base}/incidents`, { params, signal: controller.signal }),
          selected
            ? api.get(`${base}/posts/${selected}`, {
                signal: controller.signal,
              })
            : null,
          selected
            ? api.get(`${base}/posts/${selected}/history`, {
                params: { page: historyPage },
                signal: controller.signal,
              })
            : null,
        ]);
        if (alive) {
          setSnapshot({ summary: summary.data, incidents: incidents.data });
          setDetail(
            details ? { ...details.data, history: history.data } : null,
          );
          setError("");
        }
      } catch (e) {
        if (alive && e.code !== "ERR_CANCELED")
          setError(
            e.response?.status === 401
              ? "Session expired. Reconnect LinkedIn."
              : "Publishing health is unavailable. Please try again.",
          );
      } finally {
        loading = false;
        if (alive) timer = setTimeout(load, 30000);
      }
    }
    const visible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        load();
      }
    };
    load();
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive = false;
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [filter, mode, period, page, refresh, selected, historyPage]);
  async function recover() {
    setBusy(true);
    setNotice("");
    try {
      const result = await api.post(
        `${base}/posts/${confirmation.id}/${confirmation.action}`,
        {},
      );
      setNotice(result.data.message);
      setConfirmation(null);
      setRefresh((v) => v + 1);
    } catch (e) {
      setNotice(
        e.response?.data?.message ||
          "Request unavailable. Refresh to check current state.",
      );
    } finally {
      setBusy(false);
    }
  }
  const actions = (post) => (
    <div className="flex flex-wrap gap-2">
      {post.eligibility.recoveryPending && (
        <span role="status" className="text-sm text-muted-foreground">
          Recovery pending
        </span>
      )}
      {post.eligibility.retryGeneration && (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setConfirmation({ id: post.id, action: "retry-generation" })
          }
        >
          Retry Generation
        </Button>
      )}
      {post.eligibility.reconcileSchedule && (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setConfirmation({ id: post.id, action: "reconcile-schedule" })
          }
        >
          Reconcile Schedule
        </Button>
      )}
    </div>
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Publishing Health"
        description="Monitor generation, scheduling and publishing activity."
      >
        <Button variant="outline" onClick={() => setRefresh((v) => v + 1)}>
          Refresh
        </Button>
      </PageHeader>
      <p className="text-xs text-muted-foreground">
        Last updated: {date(snapshot?.summary.asOf)} · Summary: all retained
        posts. Filters apply to the activity list.
      </p>
      {error && (
        <ErrorState message={error} onRetry={() => setRefresh((v) => v + 1)} />
      )}
      {notice && (
        <p role="status" className="surface p-4 text-sm">
          {notice}
        </p>
      )}
      {!snapshot && !error && <LoadingSkeleton />}
      {snapshot && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              ["Queued", "queued"],
              ["Scheduled", "scheduled"],
              ["Published", "published"],
              ["Failed", "failed"],
              ["Needs Review", "review_required"],
            ].map(([label, key]) => (
              <StatCard
                key={key}
                label={label}
                value={snapshot.summary.counts[key]}
              />
            ))}
          </div>
          <div className="surface p-4 flex flex-wrap gap-4">
            <label>
              Status{" "}
              <select
                aria-label="Status filter"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              >
                {[
                  ["", "All"],
                  ["ai", "AI failures"],
                  ["linkedin", "Publishing failures"],
                  ["review_required", "Needs Review"],
                  ["scheduled", "Scheduled"],
                  ["posted", "Published"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mode{" "}
              <select
                aria-label="Creation mode"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All modes</option>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label>
              Updated{" "}
              <select
                aria-label="Date range"
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All available</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </label>
          </div>
          {!snapshot.incidents.data.length ? (
            <EmptyState
              title={
                filter || mode || period
                  ? "No incidents match these filters"
                  : "No posts yet"
              }
              description="Activity will appear as posts are generated, scheduled and published."
            />
          ) : (
            <div className="space-y-3">
              {snapshot.incidents.data.map((post) => (
                <article
                  key={post.id}
                  className="surface p-5 flex flex-col md:flex-row md:items-center gap-4 md:justify-between"
                >
                  <div className="min-w-0">
                    <button
                      className="font-semibold text-left break-words"
                      onClick={() => {
                        setSelected(post.id);
                        setHistoryPage(1);
                      }}
                    >
                      {post.title}
                    </button>
                    <p className="text-xs text-muted-foreground mt-1">
                      {post.creationMode} ·{" "}
                      {post.failedStage || "No failure recorded"} · Last
                      failure: {date(post.lastFailedAt)}
                    </p>
                    {post.errorMessage && (
                      <p className="text-sm mt-2">{post.errorMessage}</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <PostStatus status={post.status} />
                    {actions(post)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelected(post.id);
                        setHistoryPage(1);
                      }}
                    >
                      View details
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((v) => v - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} · {snapshot.incidents.total} posts
            </span>
            <Button
              variant="outline"
              disabled={page * 20 >= snapshot.incidents.total}
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
      {selected && !confirmation && (
        <Dialog
          title="Post activity"
          onClose={() => {
            setSelected(null);
            setDetail(null);
          }}
        >
          {detail?.data.id === selected ? (
            <div className="space-y-4">
              <h3 className="font-semibold break-words">{detail.data.title}</h3>
              <PostStatus status={detail.data.status} />
              <p>{detail.data.errorMessage}</p>
              <p className="text-sm">
                Recovery attempts: {detail.data.recoveryAttempts}
              </p>
              {[
                ["Created", "createdAt"],
                ["Scheduled", "publishAt"],
                ["Publish attempted", "publishAttemptedAt"],
                ["Published", "postedAt"],
                ["Last failure", "lastFailedAt"],
                ["Last recovery", "lastRecoveryAt"],
              ].map(([label, key]) => (
                <p key={key} className="text-xs text-muted-foreground">
                  {label}: {date(detail.data[key])}
                </p>
              ))}
              {actions(detail.data)}
              <h3 className="font-semibold">Lifecycle timeline</h3>
              {detail.history.data.length ? (
                <ol className="space-y-2">
                  {detail.history.data.map((event, i) => (
                    <li key={i} className="text-sm">
                      {event.eventType.replaceAll("_", " ")} · {event.actorType}{" "}
                      <span className="text-muted-foreground">
                        {date(event.createdAt)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No activity recorded. Older posts may predate activity
                  tracking.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage((v) => v - 1)}
                >
                  Previous events
                </Button>
                <Button
                  variant="outline"
                  disabled={historyPage * 20 >= detail.history.total}
                  onClick={() => setHistoryPage((v) => v + 1)}
                >
                  More events
                </Button>
              </div>
            </div>
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={() => setRefresh((v) => v + 1)}
            />
          ) : (
            <LoadingSkeleton />
          )}
        </Dialog>
      )}
      {confirmation && (
        <ConfirmationDialog
          title={
            confirmation.action === "retry-generation"
              ? "Retry generation?"
              : "Reconcile schedule?"
          }
          description="This requests recovery using the current post and account. Acceptance does not confirm completion. Check the activity history for the result."
          confirmLabel="Request recovery"
          busy={busy}
          onClose={() => setConfirmation(null)}
          onConfirm={recover}
        >
          {notice && (
            <p role="alert" className="text-sm mb-3">
              {notice}
            </p>
          )}
        </ConfirmationDialog>
      )}
    </div>
  );
}
