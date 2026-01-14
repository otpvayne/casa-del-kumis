import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VoucherStatusBadge from "../components/VoucherStatusBadge";
import UploadImagesModal from "../components/UploadImagesModal";
import { fetchVouchers, fetchSucursales, deleteVoucher, type Sucursal } from "../api/vouchers.api";
import type { VoucherListItem } from "../types";

export default function VouchersListPage() {
  const [items, setItems] = useState<VoucherListItem[]>([]);
  const [allItems, setAllItems] = useState<VoucherListItem[]>([]); // Guardar todos los items
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSucursales, setLoadingSucursales] = useState(true);
  const [err, setErr] = useState("");
  const [uploadFor, setUploadFor] = useState<number | null>(null);
  const [canDelete, setCanDelete] = useState(true); // Control de permisos
  
  // Estados para filtros
  const [filterSucursal, setFilterSucursal] = useState<string>("");
  const [filterFecha, setFilterFecha] = useState<string>("");
  
  const nav = useNavigate();

  // Cargar sucursales para el filtro
  useEffect(() => {
    async function loadSucursales() {
      try {
        const data = await fetchSucursales();
        setSucursales(data);
      } catch (e: any) {
        console.error("Error cargando sucursales:", e);
      } finally {
        setLoadingSucursales(false);
      }
    }
    loadSucursales();
  }, []);

  async function load() {
    try {
      setErr("");
      setLoading(true);
      
      // Siempre cargar todos los vouchers
      const data = await fetchVouchers();
      setAllItems(data);
      
      // Aplicar filtros en el frontend
      applyFilters(data);
    } catch (e: any) {
      setErr(e?.message ?? "Error cargando vouchers");
    } finally {
      setLoading(false);
    }
  }

  // Función para aplicar filtros localmente
  function applyFilters(data: VoucherListItem[] = allItems) {
    let filtered = [...data];
    
    // Filtrar por sucursal
    if (filterSucursal) {
      filtered = filtered.filter(
        (v) => String(v.sucursal_id) === filterSucursal
      );
    }
    
    // Filtrar por fecha
    if (filterFecha) {
      filtered = filtered.filter(
        (v) => v.fecha_operacion.startsWith(filterFecha)
      );
    }
    
    console.log("Filtros aplicados:", { filterSucursal, filterFecha });
    console.log("Items filtrados:", filtered.length, "de", data.length);
    
    setItems(filtered);
  }

  useEffect(() => {
    load();
  }, []); // Solo cargar una vez al inicio

  // Aplicar filtros cuando cambien
  useEffect(() => {
    if (allItems.length > 0) {
      applyFilters();
    }
  }, [filterSucursal, filterFecha, allItems]);

  async function handleDelete(voucherId: number, voucherNum: string) {
    if (!confirm(`¿Estás seguro de eliminar el voucher #${voucherNum}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteVoucher(voucherId);
      await load(); // Recargar lista
      alert("✅ Voucher eliminado correctamente");
    } catch (e: any) {
      console.error("Error completo:", e);
      
      // Manejar diferentes tipos de errores
      if (e?.response?.status === 403) {
        setCanDelete(false); // Ocultar botones de eliminar
        alert(`❌ No tienes permisos para eliminar vouchers.\n\nContacta al administrador si necesitas este acceso.`);
      } else if (e?.response?.status === 401) {
        alert("❌ Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.");
      } else {
        alert(`❌ Error al eliminar: ${e?.response?.data?.message ?? e?.message ?? "Error desconocido"}`);
      }
    }
  }

  function clearFilters() {
    setFilterSucursal("");
    setFilterFecha("");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Vouchers</h1>

        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15"
            onClick={load}
          >
             Refrescar
          </button>

          <button
            className="px-4 py-2 rounded-xl bg-white text-black font-semibold"
            onClick={() => nav("/vouchers/new")}
          >
             Crear voucher
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-4">
        <h2 className="font-semibold mb-3">Filtros</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro por Sucursal */}
          <div>
            <label className="text-sm text-white/70 block mb-1">Sucursal</label>
            {loadingSucursales ? (
              <div className="text-sm text-white/60">Cargando...</div>
            ) : (
              <select
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
                value={filterSucursal}
                onChange={(e) => setFilterSucursal(e.target.value)}
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id} className="bg-gray-900">
                    {s.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filtro por Fecha */}
          <div>
            <label className="text-sm text-white/70 block mb-1">Fecha operación</label>
            <input
              type="date"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              value={filterFecha}
              onChange={(e) => setFilterFecha(e.target.value)}
            />
          </div>

          {/* Botón Limpiar */}
          <div className="flex items-end">
            <button
              className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15"
              onClick={clearFilters}
            >
               Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="mt-6 text-white/60">Cargando...</p>}
      {err && <p className="mt-6 text-red-300">{err}</p>}

      {!loading && !err && (
        <>
          <div className="mb-3 text-sm text-white/60">
            {items.length} voucher{items.length !== 1 ? "s" : ""} encontrado{items.length !== 1 ? "s" : ""}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-white/70">
                  <th className="p-3">ID</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Sucursal</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Total</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-white/60">
                      No se encontraron vouchers con los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  items.map((v) => (
                    <tr
                      key={v.id}
                      className="border-t border-white/10 hover:bg-white/5"
                    >
                      <td className="p-3">{v.id}</td>
                      <td className="p-3">
                        {new Date(v.fecha_operacion).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {v.sucursales?.nombre ?? v.sucursal_id}
                      </td>
                      <td className="p-3">
                        <VoucherStatusBadge estado={v.estado} />
                      </td>
                      <td className="p-3">
                        ${Number(v.total_global ?? 0).toLocaleString("es-CO")}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-end">
                          <button
                            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs"
                            onClick={() => nav(`/vouchers/${v.id}`)}
                          >
                             Ver
                          </button>

                          <button
                            className="px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs"
                            onClick={() => setUploadFor(Number(v.id))}
                          >
                             Subir
                          </button>

                          {canDelete && (
                            <button
                              className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs"
                              onClick={() => handleDelete(Number(v.id), v.id)}
                              title="Eliminar voucher"
                            >
                               Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <UploadImagesModal
        open={uploadFor !== null}
        voucherId={uploadFor ?? 0}
        onClose={() => setUploadFor(null)}
        onUploaded={load}
      />
    </div>
  );
}