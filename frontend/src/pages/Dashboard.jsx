import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboard } from "@/api/dashboard.api";
import { useAuth } from "@/auth/AuthContext";
import {
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/components/WorkspaceUI";
import { TrendChart } from "@/components/charts/TrenderChart";
import { Button } from "@/components/ui/button";
export default function Dashboard() {
  const { isAuthenticated, auth } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    const load = async () => {
      try {
        const res = await fetchDashboard();
        if (active) {
          setData(res.data);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAuthenticated, auth?.memberUrn, retry]);
  if (error) return <ErrorState onRetry={() => setRetry((n) => n + 1)} />;
  if (!data) return <LoadingSkeleton />;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Make your next post count."
        description="A little inspiration. A clear plan. Your LinkedIn workspace at a glance."
      >
        <Button asChild>
          <Link to="/studio">＋ Create a post</Link>
        </Button>
      </PageHeader>
      <div className="hero-panel">
        <div>
          <p className="!text-xs !mt-0 tracking-widest">FROM IDEA TO IMPACT</p>
          <h2 className="mt-3">Good ideas deserve to be shared.</h2>
          <p>
            Turn something worth reading into something worth saying. Create a
            draft, add your perspective, and plan your next post.
          </p>
        </div>
        <Button
          asChild
          className="bg-white text-blue-800 hover:bg-blue-50 shrink-0"
        >
          <Link to="/studio">Open AI Studio →</Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Articles collected"
          value={data.stats?.totalFetched}
          detail="Your content library"
        />
        <StatCard
          label="Collected today"
          value={data.stats?.todayFetched}
          detail="New inspiration"
        />
        <StatCard
          label="Generated posts"
          value={data.stats?.aiGeneratedCount}
          detail="Across all post statuses"
        />
        <StatCard
          label="Processing"
          value={data.queue?.running ? "Active" : "Idle"}
          detail="Checked every 60 seconds"
        />
      </div>
      <div className="grid xl:grid-cols-[1.7fr_1fr] gap-6">
        <section className="surface p-6">
          <div className="flex justify-between gap-3 mb-6">
            <div>
              <h2 className="section-title">Your content momentum</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Articles collected over the last 30 days
              </p>
            </div>
            <span className="text-xs text-muted-foreground">30 days</span>
          </div>
          {data.chartData?.length ? (
            <>
              <TrendChart data={data.chartData} />
              <p className="text-xs text-muted-foreground mt-4">
                Daily article counts.{" "}
                {data.chartData.reduce((sum, row) => sum + row.value, 0)}{" "}
                collected in this period.
              </p>
            </>
          ) : (
            <EmptyState
              title="Your momentum starts here"
              description="Collect articles to see daily activity."
            />
          )}
        </section>
        <section className="surface p-6">
          <h2 className="section-title mb-5">A workspace that works for you</h2>
          {[
            [
              "01",
              "Find your inspiration",
              "Collect articles from your favorite sources.",
              "/fetcher",
            ],
            [
              "02",
              "Make it your own",
              "Generate and refine a draft in Studio.",
              "/studio",
            ],
            [
              "03",
              "Plan ahead",
              "Review your publishing calendar.",
              "/calendar",
            ],
          ].map(([n, title, description, to]) => (
            <Link
              key={n}
              to={to}
              className="flex gap-3 py-4 border-b last:border-0"
            >
              <span className="text-xs text-primary bg-accent rounded-lg p-2 h-fit">
                {n}
              </span>
              <div>
                <h3 className="text-sm font-medium">{title} →</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-5">
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </section>
      </div>
      <section className="surface">
        <div className="p-6 flex justify-between">
          <h2 className="section-title">Fresh from your sources</h2>
          <Link className="text-xs text-primary" to="/records">
            View library →
          </Link>
        </div>
        {data.recentActivity?.length ? (
          data.recentActivity.map((item, i) => (
            <div
              key={item._id || i}
              className="px-6 py-4 border-t flex items-center gap-4"
            >
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.source}{" "}
                  {item.createdAt &&
                    "· " + new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link
                  to={item._id ? "/studio?articleId=" + item._id : "/records"}
                >
                  Create draft
                </Link>
              </Button>
            </div>
          ))
        ) : (
          <EmptyState
            title="A fresh start"
            description="Collect your first articles to build a library of ideas."
          />
        )}
      </section>
    </div>
  );
}
