import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getArchivoBancoById } from "../api/banco.api";
import type { ArchivoBanco, RegistroBancoDetalle } from "../types/banco.types";

export default function BancoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [archivo, setArchivo] = useState<ArchivoBanco | null>(null);
  const [registros, setRegistros] = useState<RegistroBancoDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadDetalle() {
      try {
        const data = await getArchivoBancoById(Number(id));
        setArchivo(data.archivo);
        setRegistros(data.registros);
      } catch (err: any) {
        console.error("Error cargando detalle:", err);
        setError(err.response?.data?.message || "Error al cargar el archivo");
      } finally {
        setLoading(false);
      }
    }

    loadDetalle();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p className="text-white/60">Cargando detalles del archivo...</p>
        </div>
      </div>
    );
  }

  if (error || !archivo) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/banco")}
          className="text-white/60 hover:text-white transition"
        >
          ← Volver a Banco
        </button>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-300">⚠️ {error || "No se pudo cargar el archivo"}</p>
        </div>
      </div>
    );
  }

  // Calcular estadísticas
  const totalValorNeto = registros.reduce((sum, r) => sum + (parseFloat(r.valor_neto || "0")), 0);
  const totalComisiones = registros.reduce((sum, r) => sum + (parseFloat(r.valor_comision || "0")), 0);
  const countVisa = registros.filter(r => r.franquicia === "VISA").length;
  const countMastercard = registros.filter(r => r.franquicia === "MASTERCARD").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/banco")}
          className="text-white/60 hover:text-white transition"
        >
          ← Volver
        </button>
        <div>
          <h1 className="text-2xl font-semibold">Detalle del Archivo</h1>
          <p className="text-sm text-white/60 mt-1">{archivo.nombre_original}</p>
        </div>
      </div>

      {/* Info del archivo */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
        <h2 className="text-lg font-semibold mb-4">Información del Archivo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-white/60">Fecha del Archivo</p>
            <p className="font-medium mt-1">
              {new Date(archivo.fecha_archivo).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div>
            <p className="text-white/60">Estado</p>
            <p className="mt-1">
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                archivo.estado === 'PROCESADO'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : archivo.estado === 'ERROR'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}>
                {archivo.estado}
              </span>
            </p>
          </div>
          <div>
            <p className="text-white/60">Fecha de Carga</p>
            <p className="font-medium mt-1">
              {new Date(archivo.created_at).toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4">
          <p className="text-sm text-white/60">Total Registros</p>
          <p className="text-2xl font-bold mt-2">{registros.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4">
          <p className="text-sm text-white/60">Valor Neto Total</p>
          <p className="text-2xl font-bold mt-2 text-emerald-400">
            ${totalValorNeto.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4">
          <p className="text-sm text-white/60">Comisiones</p>
          <p className="text-2xl font-bold mt-2 text-amber-400">
            ${totalComisiones.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4">
          <p className="text-sm text-white/60">Franquicias</p>
          <p className="text-sm font-medium mt-2">
            <span className="text-blue-400">VISA: {countVisa}</span>
            {" | "}
            <span className="text-amber-400">MC: {countMastercard}</span>
          </p>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold">Transacciones ({registros.length})</h2>
        </div>

        {registros.length === 0 ? (
          <div className="p-12 text-center text-white/40">
            No hay registros en este archivo
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="text-left p-3">Fecha Vale</th>
                  <th className="text-left p-3">Terminal</th>
                  <th className="text-left p-3">Autorización</th>
                  <th className="text-left p-3">Tarjeta</th>
                  <th className="text-left p-3">Franquicia</th>
                  <th className="text-right p-3">Consumo</th>
                  <th className="text-right p-3">Comisión</th>
                  <th className="text-right p-3">Neto</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((reg, index) => (
                  <tr key={index} className="border-t border-white/10 hover:bg-white/5 transition">
                    <td className="p-3 text-white/70">
                      {reg.fecha_vale 
                        ? new Date(reg.fecha_vale).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
                        : '-'
                      }
                    </td>
                    <td className="p-3 font-mono text-sky-400">{reg.terminal || '-'}</td>
                    <td className="p-3 font-mono text-xs">{reg.numero_autoriza || '-'}</td>
                    <td className="p-3 font-mono text-xs text-white/50">
                      {reg.tarjeta_socio || '-'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        reg.franquicia === 'VISA' 
                          ? 'bg-blue-500/20 text-blue-300'
                          : reg.franquicia === 'MASTERCARD'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {reg.franquicia}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">
                      ${parseFloat(reg.valor_consumo || "0").toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right text-amber-400">
                      ${parseFloat(reg.valor_comision || "0").toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-400">
                      ${parseFloat(reg.valor_neto || "0").toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}