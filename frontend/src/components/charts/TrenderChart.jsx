import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useMediaQuery from "@/hooks/useMediaQuery";

export function TrendChart({ data, title, color = "#3b82f6" }) {
  const touch = useMediaQuery("(pointer: coarse)");
  return (
    <div
      className="w-full h-64"
      role="group"
      aria-label="Daily collected article counts over the past 30 days"
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            trigger={touch ? "click" : "hover"}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--foreground))",
              maxWidth: "min(240px, 70vw)",
              overflowWrap: "anywhere",
            }}
          />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}