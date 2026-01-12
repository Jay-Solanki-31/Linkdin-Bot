import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Zap, Activity } from "lucide-react";
import {DashboardSkeleton} from "@/components/ui/PostSkeleton";
import { toast } from "sonner";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const res = await axios.get("/api/dashboard");
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.log("Dashboard Load Error:", err);
      toast.error("Failed to load dashboard data");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      < DashboardSkeleton />
    );
  }

  const stats = [
    {
      title: "Total Fetched Articles",
      value: data.stats.totalFetched,
      icon: TrendingUp,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "AI Generated Posts",
      value: data.stats.aiGeneratedCount,
      icon: Zap,
      gradient: "from-purple-500 to-pink-600",
      bgGradient: "from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-800/20",
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Queue Status",
      value: data.queue.running ? "Running" : "Idle",
      icon: Activity,
      gradient: "from-green-500 to-emerald-600",
      bgGradient: "from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20",
      color: "text-green-600 dark:text-green-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="bg-muted mt-2">
            Welcome back! Here's your automation overview
          </p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card
              key={idx}
              className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-background"
            >
              <div className={`h-2 bg-gradient-to-r ${stat.gradient}`}></div>

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="bg-muted text-sm font-semibold uppercase tracking-wider">
                    {stat.title}
                  </CardTitle>
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-br ${stat.bgGradient}`}
                  >
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p
                  className={`text-4xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Live updated</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* RECENT ACTIVITY */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-muted to-card">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-muted-foreground">
                    {item.title.slice(0, 60)}...
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SYSTEM HEALTH */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-muted to-card">
          <CardHeader>
            <CardTitle className="text-foreground">System Health</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {/* Redis connection */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium bg-muted">
                    Redis Connection
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      data.system.redisConnected
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {data.system.redisConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full w-full ${
                      data.system.redisConnected
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  ></div>
                </div>
              </div>

              {/* Queue */}
                      <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium bg-muted">
                        Queue Status
                        </span>
                        <span
                        className={`text-sm ${
                          data.queue.running
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-blue-600 dark:text-blue-400"
                        } font-semibold`}
                        >
                        {data.queue.running ? "Running" : "Idle"}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted  rounded-full overflow-hidden">
                        <div
                        className={`h-full ${
                          data.queue.running
                          ? "w-full bg-blue-500"
                          : "w-1/4 bg-blue-500"
                        }`}
                        ></div>
                      </div>
                      </div>

              {/* Last run */}
              {/* <div className="text-sm text-muted-foreground mt-4">
                <p>
                  <strong>Last Run:</strong>{" "}
                  {new Date(data.system.lastRun).toLocaleString()}
                </p>
                <p>
                  <strong>Next Run:</strong>{" "}
                  {data.system.nextRun
                    ? new Date(data.system.nextRun).toLocaleString()
                    : "Calculating..."}
                </p>
              </div> */}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
