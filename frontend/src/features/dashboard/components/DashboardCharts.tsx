import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Props = {
  data: {
    name: string;
    total: number;
  }[];
  title?: string;
};

export function DashboardCharts({ data, title }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 h-[360px]">
      <h3 className="text-lg font-semibold mb-4">
        {title ?? "Actividad por módulo"}
      </h3>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis
            dataKey="name"
            stroke="#ffffff60"
            tick={{ fill: "#ffffff60", fontSize: 12 }}
          />
          <YAxis stroke="#ffffff60" tick={{ fill: "#ffffff60" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "10px",
              color: "#fff",
            }}
          />
          <Bar dataKey="total" fill="#0ea5e9" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
