import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

function QueueMonitorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => ( 
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-3 w-24 mb-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-2 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {[1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-4 w-48 mb-6" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function QueueMonitor() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadQueueData() {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();

        if (!mounted) return;
        if (Array.isArray(data.queue)) {
          setQueues(data.queue);
        } else {
          setQueues([]);
        }
      } catch (err) {
        console.error("Failed to load queue data", err);
        if (mounted) toast.error("Failed to load queue data");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadQueueData();

    const interval = setInterval(loadQueueData, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) return <QueueMonitorSkeleton />;

  const totalJobs = queues.reduce(
    (sum, q) =>
      sum +
      (q.pending ?? 0) +
      (q.active ?? 0) +
      (q.completed ?? 0) +
      (q.failed ?? 0),
    0
  );

  const activeJobs = queues.reduce((sum, q) => sum + (q.active ?? 0), 0);

  const failedJobs = queues.reduce((sum, q) => sum + (q.failed ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Queue Monitor</h1>
        <p className="text-sm text-muted-foreground mt-1">Live BullMQ queue activity and performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Total Jobs
              </CardTitle>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{totalJobs}</p>
            <p className="text-xs text-muted-foreground mt-1">All queues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Active Jobs
              </CardTitle>
              <Activity className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeJobs}</p>
            <p className="text-xs text-muted-foreground mt-1">Currently processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Failed Jobs
              </CardTitle>
              <Activity className="w-4 h-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{failedJobs}</p>
            <p className="text-xs text-muted-foreground mt-1">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Cards */}
      <div className="space-y-4">
        {queues.map((queue, idx) => {
          const total = (queue.completed ?? 0) + (queue.pending ?? 0);
          const progress =
            total === 0 ? 0 : Math.round((queue.completed / total) * 100);

          return (
            <Card key={idx} className="overflow-hidden">
              <div
                className={`h-1 ${
                  queue.status === "running"
                    ? "bg-gradient-to-r from-green-500 to-emerald-600"
                    : "bg-muted/30"
                }`}
              />

              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {queue.name}
                    </h3>
                    <Badge
                      className={`mt-2 text-xs ${
                        queue.status === "running"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {queue.status === "running" ? "🟢 Running" : "🔴 Idle"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Stat label="PENDING" value={queue.pending} color="blue" />
                  <Stat label="ACTIVE" value={queue.active} color="green" />
                  <Stat
                    label="COMPLETED"
                    value={queue.completed}
                    color="purple"
                  />
                  <Stat label="FAILED" value={queue.failed} color="red" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-medium text-foreground">
                      Queue Progress
                    </span>
                    <span className="text-xs text-muted-foreground">{progress}%</span>
                  </div>

                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  const colors = {
    blue: "bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400",
    green: "bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400",
    purple: "bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400",
    red: "bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
  };

  return (
    <div className={`p-3 rounded-lg ${colors[color]}`}>
      <p className="text-xs font-semibold mb-1 text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
