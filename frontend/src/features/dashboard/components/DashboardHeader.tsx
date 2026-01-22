export function DashboardHeader() {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-white/60">Resumen general del sistema</p>
      </div>

      <div className="text-xs text-white/40">
        Datos en tiempo real (según registros cargados)
      </div>
    </div>
  );
}
