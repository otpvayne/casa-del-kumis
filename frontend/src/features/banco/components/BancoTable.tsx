import { useBanco } from "../hooks/useBanco";
import { useNavigate } from "react-router-dom";

export default function BancoTable() {
  const { data, loading, error, reload } = useBanco();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto mb-4"></div>
        <p className="text-white/60">Cargando archivos del banco...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-300">⚠️ {error}</p>
        <button
          onClick={reload}
          className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] overflow-hidden">
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">📋 Archivos del Banco</h2>
          <p className="text-sm text-white/60 mt-1">
            {data.length} archivo{data.length !== 1 ? 's' : ''} cargado{data.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-white/40 mb-2">No hay archivos bancarios cargados</p>
          <p className="text-sm text-white/30">
            Sube tu primer archivo Excel para comenzar
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="text-left p-4">Archivo</th>
                <th className="text-left p-4">Fecha Archivo</th>
                <th className="text-left p-4">Estado</th>
                <th className="text-left p-4">Registros</th>
                <th className="text-left p-4">Subido</th>
                <th className="text-right p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((archivo) => (
                <tr 
                  key={archivo.id} 
                  className="border-t border-white/10 hover:bg-white/5 transition"
                >
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{archivo.nombre_original}</p>
                      <p className="text-xs text-white/40 mt-1">
                        ID: {archivo.id}
                      </p>
                    </div>
                  </td>
                  
                  <td className="p-4 text-white/70">
                    {new Date(archivo.fecha_archivo).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      archivo.estado === 'PROCESADO'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : archivo.estado === 'ERROR'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {archivo.estado}
                    </span>
                  </td>
                  
                  <td className="p-4">
                    <span className="text-sky-400 font-semibold">
                      {archivo._count?.registros_banco_detalle ?? '-'}
                    </span>
                  </td>
                  
                  <td className="p-4 text-white/60 text-xs">
                    {new Date(archivo.created_at).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  
                  <td className="p-4 text-right">
                    <button
                      onClick={() => navigate(`/banco/${archivo.id}`)}
                      className="text-sky-400 hover:text-sky-300 transition text-sm font-medium"
                    >
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}