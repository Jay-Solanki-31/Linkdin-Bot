import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export default function QueueMonitor() {
  const queueData = [
    {
      name: "Fetcher Queue",
      pending: 12,
      active: 3,
      completed: 245,
      failed: 2,
      status: "running"
    },
    {
      name: "AI Processing Queue",
      pending: 8,
      active: 2,
      completed: 156,
      failed: 0,
      status: "running"
    },
    {
      name: "Publisher Queue",
      pending: 0,
      active: 0,
      completed: 89,
      failed: 1,
      status: "idle"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-4xl font-bold text-slate-900">Queue Monitor</h1>
        <p className="text-slate-500">Real-time job queue status and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-700 text-sm font-semibold uppercase tracking-wider">
                Total Jobs
              </CardTitle>
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">492</p>
            <p className="text-xs text-slate-400 mt-2">Across all queues</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-700 text-sm font-semibold uppercase tracking-wider">
                Active Jobs
              </CardTitle>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-600">5</p>
            <p className="text-xs text-slate-400 mt-2">Currently processing</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-700 text-sm font-semibold uppercase tracking-wider">
                Failed Jobs
              </CardTitle>
              <Activity className="w-5 h-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-red-600">3</p>
            <p className="text-xs text-slate-400 mt-2">Need attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {queueData.map((queue, idx) => (
          <Card key={idx} className="border-0 shadow-lg bg-white overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${queue.status === "running" ? "from-green-500 to-emerald-600" : "from-slate-400 to-slate-500"}`}></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{queue.name}</h3>
                  <Badge className={`mt-2 ${queue.status === "running" ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-slate-400"} text-white`}>
                    {queue.status === "running" ? "🟢 Running" : "🔴 Idle"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-slate-600 font-semibold mb-2">PENDING</p>
                  <p className="text-2xl font-bold text-blue-600">{queue.pending}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs text-slate-600 font-semibold mb-2">ACTIVE</p>
                  <p className="text-2xl font-bold text-green-600">{queue.active}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-xs text-slate-600 font-semibold mb-2">COMPLETED</p>
                  <p className="text-2xl font-bold text-purple-600">{queue.completed}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-xs text-slate-600 font-semibold mb-2">FAILED</p>
                  <p className="text-2xl font-bold text-red-600">{queue.failed}</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Queue Progress</span>
                  <span className="text-sm text-slate-500">{Math.round((queue.completed / (queue.completed + queue.pending)) * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: `${Math.round((queue.completed / (queue.completed + queue.pending)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}