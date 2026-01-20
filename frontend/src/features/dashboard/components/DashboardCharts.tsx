import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: {
    name: string;
    total: number;
  }[];
};

export function DashboardCharts({ data }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 h-80">
      <h3 className="text-sm text-white/70 mb-4">
        Actividad por módulo
      </h3>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
