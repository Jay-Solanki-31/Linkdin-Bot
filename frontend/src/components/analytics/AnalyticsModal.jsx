import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function AnalyticsModal({
  open,
  onClose,
  post,
  history,
}) {

  if (!open || !post) {
    return null;
  }

  const chartData =
    history.map((item) => ({
      date: new Date(
        item.collectedAt
      ).toLocaleDateString(),

      likes: item.likes,
      comments: item.comments,
      reposts: item.reposts,
    }));

  return (
    <div
      className="
        fixed inset-0 z-50
        bg-black/50
        flex items-center justify-center
      "
    >

      <div
        className="
          bg-white dark:bg-slate-900
          rounded-lg
          p-6
          w-[90%]
          max-w-5xl
          text-black dark:text-white
        "
      >

        <div className="flex justify-between mb-4">

          <h2 className="text-xl font-bold text-black dark:text-white">
            {post.title}
          </h2>

          <button
            onClick={onClose}
            className="px-3 py-1 border rounded bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700"
          >
            Close
          </button>

        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">

          <div className="border border-gray-300 dark:border-slate-600 p-4 rounded bg-gray-50 dark:bg-slate-800">
            <p className="text-gray-600 dark:text-gray-300">Likes</p>
            <h3 className="text-2xl font-bold text-black dark:text-white">{post.likes}</h3>
          </div>

          <div className="border border-gray-300 dark:border-slate-600 p-4 rounded bg-gray-50 dark:bg-slate-800">
            <p className="text-gray-600 dark:text-gray-300">Comments</p>
            <h3 className="text-2xl font-bold text-black dark:text-white">{post.comments}</h3>
          </div>

          <div className="border border-gray-300 dark:border-slate-600 p-4 rounded bg-gray-50 dark:bg-slate-800">
            <p className="text-gray-600 dark:text-gray-300">Reposts</p>
            <h3 className="text-2xl font-bold text-black dark:text-white">{post.reposts}</h3>
          </div>

          <div className="border border-gray-300 dark:border-slate-600 p-4 rounded bg-gray-50 dark:bg-slate-800">
            <p className="text-gray-600 dark:text-gray-300">Impressions</p>
            <h3 className="text-2xl font-bold text-black dark:text-white">{post.impressions}</h3>
          </div>

        </div>

        <div className="h-96 bg-gray-50 dark:bg-slate-800 rounded p-4">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >

              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />

              <XAxis
                dataKey="date"
                stroke="#666"
              />

              <YAxis stroke="#666" />

              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  color: '#ffffff'
                }}
              />

              <Line
                type="monotone"
                dataKey="likes"
                stroke="#3b82f6"
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="comments"
                stroke="#10b981"
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="reposts"
                stroke="#f59e0b"
                dot={false}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </div>

    </div>
  );
}