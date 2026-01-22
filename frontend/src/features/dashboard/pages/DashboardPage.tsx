import { useEffect, useMemo, useState } from "react";
import { getDashboardData } from "../services/dashboard.service";
import { KpiCard } from "../components/KpiCard";
import { DashboardHeader } from "../components/DashboardHeader";
import { DashboardCharts } from "../components/DashboardCharts";
import type { DashboardData } from "../types/dashboard.types";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .catch((err) => {
        console.error("Error cargando dashboard:", err);
        setError("Error al cargar los datos del dashboard");
      })
      .finally(() => setLoading(false));
  }, []);

  const estadoVouchersData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Confirmados", value: data.estadoVouchers.confirmados },
      { name: "Pendientes", value: data.estadoVouchers.pendientes },
      { name: "Borradores", value: data.estadoVouchers.borradores },
    ];
  }, [data]);

  const estadoConciliacionesData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Generadas", value: data.estadoConciliaciones.generadas },
      { name: "Otras", value: data.estadoConciliaciones.otras },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4" />
          <p className="text-white/60">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-300">
          {error || "No se pudieron cargar los datos"}
        </p>
      </div>
    );
  }

  const COLORS_VOUCHERS = ["#10b981", "#f59e0b", "#6b7280"];
  const COLORS_CONCILIACIONES = ["#0ea5e9", "#6b7280"];

  const tasaConfirmacion =
    data.kpis.totalVouchers > 0
      ? Math.round((data.estadoVouchers.confirmados / data.kpis.totalVouchers) * 100)
      : 0;

  const alertaPendientes = data.estadoVouchers.pendientes > 0;
  const alertaConciliacionesFueraMargen = data.kpis.conciliacionesConDiferencia > 0;

  return (
    <div className="space-y-6">
      <DashboardHeader />

      {/* KPIs (8 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Vouchers"
          value={data.kpis.totalVouchers}
          subtitle={`${data.kpis.vouchersHoy} creados hoy`}
          icon="📄"
        />
        <KpiCard
          title="Tasa de Confirmación"
          value={tasaConfirmacion}
          subtitle={`${data.estadoVouchers.confirmados} confirmados`}
          icon="✅"
          badge={{
            label: `${data.estadoVouchers.pendientes} pendientes`,
            tone: alertaPendientes ? "warning" : "neutral",
          }}
        />
        <KpiCard
          title="Conciliaciones"
          value={data.kpis.totalConciliaciones}
          subtitle={`${data.kpis.conciliacionesHoy} generadas hoy`}
          icon="🧾"
          badge={{
            label: `${data.kpis.conciliacionesConDiferencia} fuera de margen`,
            tone: alertaConciliacionesFueraMargen ? "danger" : "success",
          }}
        />
        <KpiCard
          title="Sucursales"
          value={data.kpis.totalSucursales}
          subtitle={`${data.kpis.sucursalesActivas} activas`}
          icon="🏪"
        />

        <KpiCard
          title="Archivos RedeBan"
          value={data.kpis.totalRedeBanArchivos}
          subtitle={`${data.kpis.redebanHoy} cargados hoy`}
          icon="🏦"
        />
        <KpiCard
          title="Archivos Banco"
          value={data.kpis.totalBancoArchivos}
          subtitle={`${data.kpis.bancoHoy} cargados hoy`}
          icon="💳"
        />
        <KpiCard
          title="Usuarios"
          value={data.kpis.totalUsuarios}
          subtitle={`${data.kpis.usuariosActivos} activos`}
          icon="👥"
        />
        <KpiCard
          title="Salud del sistema"
          value={alertaConciliacionesFueraMargen ? 0 : 1}
          subtitle={alertaConciliacionesFueraMargen ? "Revisar conciliaciones" : "Sin alertas críticas"}
          icon="🩺"
          badge={{
            label: alertaConciliacionesFueraMargen ? "Atención" : "OK",
            tone: alertaConciliacionesFueraMargen ? "danger" : "success",
          }}
        />
      </div>

      {/* Alertas */}
      {alertaPendientes && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-300">
                Tienes {data.estadoVouchers.pendientes} voucher
                {data.estadoVouchers.pendientes !== 1 ? "s" : ""} pendiente
                {data.estadoVouchers.pendientes !== 1 ? "s" : ""} de confirmación
              </p>
              <p className="text-sm text-amber-200/70">
                Confirma los vouchers para poder conciliar correctamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {alertaConciliacionesFueraMargen && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-semibold text-red-300">
                Hay {data.kpis.conciliacionesConDiferencia} conciliación
                {data.kpis.conciliacionesConDiferencia !== 1 ? "es" : ""} fuera de margen
              </p>
              <p className="text-sm text-red-200/70">
                Revisa diferencias vs margen permitido (posibles fallos de carga o comisión).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad por módulo */}
        <DashboardCharts data={data.actividadPorModulo} />

        {/* Estado de Conciliaciones (pie) */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
          <h3 className="text-lg font-semibold mb-4">Estado de Conciliaciones</h3>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={estadoConciliacionesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={95}
                dataKey="value"
              >
                {estadoConciliacionesData.map((_, index) => (
                  <Cell key={`cell-conc-${index}`} fill={COLORS_CONCILIACIONES[index % COLORS_CONCILIACIONES.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "10px",
                  color: "#fff",
                }}
              />
              <Legend wrapperStyle={{ color: "#ffffff60" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vouchers por Sucursal */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
        <h3 className="text-lg font-semibold mb-4">Vouchers por Sucursal (Top 10)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data.vouchersPorSucursal}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="sucursal"
              stroke="#ffffff60"
              tick={{ fill: "#ffffff60", fontSize: 12 }}
              angle={-35}
              textAnchor="end"
              height={90}
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

      {/* Estado de Vouchers + Tendencia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de Vouchers */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
          <h3 className="text-lg font-semibold mb-4">Estado de Vouchers</h3>

          <div className="mb-4 grid grid-cols-3 gap-2 text-sm">
            <div className="bg-emerald-500/20 rounded-lg p-3 text-center">
              <p className="text-emerald-300 font-semibold text-2xl">
                {data.estadoVouchers.confirmados}
              </p>
              <p className="text-white/60 text-xs mt-1">Confirmados</p>
            </div>
            <div className="bg-amber-500/20 rounded-lg p-3 text-center">
              <p className="text-amber-300 font-semibold text-2xl">
                {data.estadoVouchers.pendientes}
              </p>
              <p className="text-white/60 text-xs mt-1">Pendientes</p>
            </div>
            <div className="bg-gray-500/20 rounded-lg p-3 text-center">
              <p className="text-gray-300 font-semibold text-2xl">
                {data.estadoVouchers.borradores}
              </p>
              <p className="text-white/60 text-xs mt-1">Borradores</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={estadoVouchersData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={95}
                dataKey="value"
              >
                {estadoVouchersData.map((_, index) => (
                  <Cell key={`cell-v-${index}`} fill={COLORS_VOUCHERS[index % COLORS_VOUCHERS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "10px",
                  color: "#fff",
                }}
              />
              <Legend wrapperStyle={{ color: "#ffffff60" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tendencia de vouchers */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
          <h3 className="text-lg font-semibold mb-4">Tendencia de Vouchers (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.vouchersPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="mes" stroke="#ffffff60" tick={{ fill: "#ffffff60" }} />
              <YAxis stroke="#ffffff60" tick={{ fill: "#ffffff60" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "10px",
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ fill: "#0ea5e9", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla resumen por sucursal */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold">Top 10 Sucursales</h3>
          <p className="text-sm text-white/50 mt-1">Ranking por cantidad de vouchers</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="text-left p-4">Posición</th>
                <th className="text-left p-4">Sucursal</th>
                <th className="text-right p-4">Total Vouchers</th>
              </tr>
            </thead>
            <tbody>
              {data.vouchersPorSucursal.map((sucursal, index) => (
                <tr
                  key={index}
                  className="border-t border-white/10 hover:bg-white/5 transition"
                >
                  <td className="p-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-sky-500/20 text-sky-300 font-semibold">
                      {index + 1}
                    </span>
                  </td>
                  <td className="p-4 font-medium">{sucursal.sucursal}</td>
                  <td className="p-4 text-right font-semibold text-sky-400">
                    {sucursal.total.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
