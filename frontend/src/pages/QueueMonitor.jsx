import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

function QueueMonitorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {[1, 2].map((i) => (
        <Card key={i} className="border-0 shadow-lg bg-white p-6">
          <Skeleton className="h-5 w-48 mb-6" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-16 w-full" />
            ))}
          </div>
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900">Queue Monitor</h1>
        <p className="text-slate-500 mt-2">
          Live BullMQ queue activity and performance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase text-slate-600">
                Total Jobs
              </CardTitle>
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">{totalJobs}</p>
            <p className="text-xs text-slate-400 mt-2">All queues</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase text-slate-600">
                Active Jobs
              </CardTitle>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">{activeJobs}</p>
            <p className="text-xs text-slate-400 mt-2">Currently processing</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase text-slate-600">
                Failed Jobs
              </CardTitle>
              <Activity className="w-5 h-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-red-600">{failedJobs}</p>
            <p className="text-xs text-slate-400 mt-2">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Cards */}
      <div className="space-y-6">
        {queues.map((queue, idx) => {
          const total = (queue.completed ?? 0) + (queue.pending ?? 0);
          const progress =
            total === 0 ? 0 : Math.round((queue.completed / total) * 100);

          return (
            <Card
              key={idx}
              className="border-0 shadow-lg bg-white overflow-hidden"
            >
              <div
                className={`h-1 ${
                  queue.status === "running"
                    ? "bg-gradient-to-r from-green-500 to-emerald-600"
                    : "bg-slate-400"
                }`}
              />

              <CardContent className="pt-6">
                <div className="flex justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {queue.name}
                    </h3>
                    <Badge
                      className={`mt-2 ${
                        queue.status === "running"
                          ? "bg-green-600"
                          : "bg-slate-500"
                      } text-white`}
                    >
                      {queue.status === "running" ? "🟢 Running" : "🔴 Idle"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <Stat label="PENDING" value={queue.pending} color="blue" />
                  <Stat label="ACTIVE" value={queue.active} color="green" />
                  <Stat
                    label="COMPLETED"
                    value={queue.completed}
                    color="purple"
                  />
                  <Stat label="FAILED" value={queue.failed} color="red" />
                </div>

                <div className="mt-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      Queue Progress
                    </span>
                    <span className="text-sm text-slate-500">{progress}%</span>
                  </div>

                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
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
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    red: "bg-red-50 border-red-200 text-red-600",
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color]}`}>
      <p className="text-xs font-semibold mb-1 text-slate-600">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
