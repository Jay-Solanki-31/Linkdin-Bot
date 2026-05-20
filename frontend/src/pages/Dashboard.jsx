import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Zap, Activity, Circle } from "lucide-react"
import { DashboardSkeleton } from "@/components/ui/PostSkeleton"
import { toast } from "sonner"
import { fetchDashboard } from "@/api/dashboard.api"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { StatusBadge } from "@/components/ui/status-badge"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card"
import { TrendChart } from "@/components/charts/TrenderChart"

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await fetchDashboard()
        setData(res.data)
        setLoading(false)
      } catch (err) {
        console.log("Dashboard Load Error:", err)
        toast.error("Failed to load dashboard data")
        setLoading(false)
      }
    }

    loadDashboard()
    
    const interval = setInterval(loadDashboard, 60000)
    
    return () => clearInterval(interval)
  }, [])

  if (loading || !data) {
    return (
      <DashboardSkeleton />
    )
  }

  const stats = [
    {
      title: "Total Fetched Articles",
      value: data.stats.totalFetched,
      icon: TrendingUp,
      gradient: "from-blue-500 to-cyan-500",
      iconColor: "text-blue-500",
    },
    {
      title: "AI Generated Posts",
      value: data.stats.aiGeneratedCount,
      icon: Zap,
      gradient: "from-purple-500 to-pink-500",
      iconColor: "text-purple-500",
    },
    {
      title: "Queue Status",
      value: data.queue.running ? "Running" : "Idle",
      icon: Activity,
      gradient: "from-green-500 to-emerald-500",
      iconColor: "text-green-500",
    },
  ]

  const chartData = [
    { name: "Mon", value: 12 },
    { name: "Tue", value: 19 },
    { name: "Wed", value: 15 },
    { name: "Thu", value: 22 },
    { name: "Fri", value: 18 },
    { name: "Sat", value: 25 },
    { name: "Sun", value: 21 },
  ]

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your automation and system health
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className="animate-fade-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <GlassCard className="overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${stat.gradient}`}></div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient.replace("500", "100")} dark:from-opacity-20 dark:to-opacity-10`}>
                      <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                    {typeof stat.value === "number" ? <AnimatedNumber value={stat.value} /> : stat.value}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Circle className={`w-2 h-2 fill-current ${
                      data.queue.running ? "text-green-500" : "text-muted-foreground"
                    }`} />
                    <p className="text-xs text-muted-foreground">Live updated</p>
                  </div>
                </CardContent>
              </GlassCard>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg">Fetch Trends</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <TrendChart data={chartData} title="Weekly Activity" />
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg">System Health</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Redis Connectiond
                  </span>
                  <StatusBadge 
                    variant={data.system.redisConnected ? "success" : "error"}
                    pulse={!!data.system.redisConnected}
                  >
                    {data.system.redisConnected ? "Connected" : "Disconnected"}
                  </StatusBadge>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full w-full transition-all duration-500 ${data.system.redisConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Queue Status
                  </span>
                  <StatusBadge variant={data.queue.running ? "info" : "default"}>
                    {data.queue.running ? "Running" : "Idle"}
                  </StatusBadge>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${data.queue.running ? "w-full bg-blue-500" : "w-1/4 bg-blue-500"}`}></div>
                </div>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="text-lg">Recent Activity</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="space-y-3">
            {data.recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/40 hover:bg-muted/60 transition-colors">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0 animate-pulse"></div>
                <span className="text-sm text-muted-foreground">
                  {item.title.slice(0, 60)}...
                </span>
              </div>
            ))}
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}