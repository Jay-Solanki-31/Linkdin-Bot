import { useEffect, useState } from "react";
import { getAnalyticsPosts, getAnalyticsHistory } from "@/api/analytics.api";
import useMediaQuery from "@/hooks/useMediaQuery";
import { useAuth } from "@/auth/AuthContext";
import {
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Dialog,
  DateRangeFilter,
} from "@/components/WorkspaceUI";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
export default function Analytics() {
  const touch = useMediaQuery("(pointer: coarse)");
  const { isAuthenticated, auth } = useAuth();
  const [posts, setPosts] = useState(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null),
    [history, setHistory] = useState(null),
    [range, setRange] = useState("all");
  const [rangeEnd] = useState(() => Date.now());
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    getAnalyticsPosts()
      .then((r) => {
        if (active) {
          setPosts(r.data || []);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("Analytics could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated, auth?.memberUrn, retry]);
  async function open(post) {
    setSelected(post);
    setHistory(null);
    try {
      const r = await getAnalyticsHistory(post.linkedinPostUrn);
      setHistory(r.data || []);
    } catch {
      setHistory([]);
      setError("Snapshot history could not be loaded. Please try again.");
    }
  }
  const rows = (history || []).filter(
    (r) =>
      range === "all" ||
      new Date(r.collectedAt) >= new Date(rangeEnd - Number(range) * 86400000),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Understand what resonates."
        eyebrow="ANALYTICS"
        description="Performance snapshots collected periodically by your browser extension. Updates are not live."
      />
      <div className="rounded-xl border bg-accent/40 p-4 text-sm text-muted-foreground">
        Some collected metrics may be missing or recorded as zero. Open a post
        to inspect its snapshots. Verified impressions and engagement rate are
        currently unavailable.
      </div>
      {error && (
        <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
      )}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          label="Published posts"
          value={posts?.length}
          detail="Posts available to inspect"
        />
        <StatCard
          label="Impressions"
          value="Unavailable"
          detail="Metric availability is not supplied"
        />
        <StatCard
          label="Engagement rate"
          value="Unavailable"
          detail="Requires verified impressions"
        />
      </div>
      {!posts ? (
        !error && <LoadingSkeleton />
      ) : !posts.length ? (
        <section className="surface">
          <EmptyState
            title="Your story is just getting started"
            description="Publish a post, then collect performance snapshots with the browser extension. Your results will appear here."
          />
        </section>
      ) : (
        <section className="surface">
          <div className="p-6 border-b">
            <h2 className="section-title">Published posts</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Inspect recorded history for each post.
            </p>
          </div>
          {posts.map((post) => (
            <div
              key={post.linkedinPostUrn}
              className="analytics-post-row p-5 border-b last:border-0 flex items-center justify-between gap-4"
            >
              <div>
                <h3 className="text-sm font-medium">
                  {post.title || "Untitled post"}
                </h3>
                {post.linkedinPostUrl && (
                  <a
                    href={post.linkedinPostUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary"
                  >
                    Open on LinkedIn ↗
                  </a>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => open(post)}>
                View snapshots
              </Button>
            </div>
          ))}
        </section>
      )}
      {selected && (
        <Dialog
          title={selected.title || "Post snapshots"}
          onClose={() => setSelected(null)}
        >
          <DateRangeFilter value={range} onChange={setRange} />
          {history === null ? (
            <p role="status" className="py-8">
              Loading snapshots…
            </p>
          ) : !rows.length ? (
            <EmptyState
              title="No recorded snapshots"
              description="No snapshots are available in this date range. Collect metrics with the browser extension or select a wider range."
            />
          ) : (
            <>
              <p className="text-xs text-muted-foreground my-4">
                {rows.length} snapshots · Last collected{" "}
                {new Date(rows[rows.length - 1].collectedAt).toLocaleString()}.
                Recorded counts may include default zero values for missing
                metrics.
              </p>
              <div
                className="h-64 min-w-0"
                role="group"
                aria-label="Recorded likes, comments, and reposts by collection date"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    accessibilityLayer
                    data={rows.map((r) => ({
                      ...r,
                      date: new Date(r.collectedAt).toLocaleString(),
                    }))}
                  >
                    <CartesianGrid stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" hide />
                    <YAxis width={30} />
                    <Tooltip
                      trigger={touch ? "click" : "hover"}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        color: "hsl(var(--foreground))",
                        maxWidth: "min(240px, 70vw)",
                        overflowWrap: "anywhere",
                      }}
                    />
                    <Legend />
                    {[
                      ["likes", "#5275ed"],
                      ["comments", "#159970"],
                      ["reposts", "#c98425"],
                    ].map(([key, color]) => (
                      <Line
                        key={key}
                        dataKey={key}
                        stroke={color}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto mt-5">
                <table className="w-full text-xs">
                  <caption className="text-left py-2">
                    Recorded snapshot values (accessible chart data)
                  </caption>
                  <thead>
                    <tr>
                      {["Collected", "Likes", "Comments", "Reposts"].map(
                        (t) => (
                          <th key={t} scope="col" className="text-left p-2">
                            {t}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r._id || i} className="border-t">
                        <td className="p-2">
                          {new Date(r.collectedAt).toLocaleString()}
                        </td>
                        {["likes", "comments", "reposts"].map((k) => (
                          <td className="p-2" key={k}>
                            {r[k] ?? "Unavailable"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}