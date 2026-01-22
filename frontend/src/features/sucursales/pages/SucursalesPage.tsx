import { useEffect, useState } from "react";
import { getSucursales, deleteSucursal, createSucursal, updateSucursal } from "../api/sucursales.api";
import type { Sucursal } from "../types/sucursal.types";
import { useAuth } from "../../../contexts/AuthContext";
import { Can } from "../../../components/Can";

export default function SucursalesPage() {
  const [data, setData] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const [form, setForm] = useState({
    nombre: "",
    codigo_comercio_redeban: "",
    codigo_referencia_banco: "",
    direccion: "",
    estado: "ACTIVO" as "ACTIVO" | "INACTIVO",
  });

  async function loadSucursales() {
    setLoading(true);
    try {
      const sucursales = await getSucursales();
      setData(sucursales);
    } catch (error) {
      console.error("Error cargando sucursales:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSucursales();
  }, []);

  async function handleDelete(id: number, nombre: string) {
    if (!confirm(`¿Eliminar sucursal "${nombre}"?`)) return;

    try {
      await deleteSucursal(id);
      setData(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error eliminando sucursal:", error);
      alert("Error al eliminar la sucursal");
    }
  }

  function openModal(sucursal?: Sucursal) {
    if (sucursal) {
      setEditingSucursal(sucursal);
      setForm({
        nombre: sucursal.nombre,
        codigo_comercio_redeban: sucursal.codigo_comercio_redeban,
        codigo_referencia_banco: sucursal.codigo_referencia_banco,
        direccion: sucursal.direccion,
        estado: sucursal.estado as "ACTIVO" | "INACTIVO",
      });
    } else {
      setEditingSucursal(null);
      setForm({
        nombre: "",
        codigo_comercio_redeban: "",
        codigo_referencia_banco: "",
        direccion: "",
        estado: "ACTIVO",
      });
    }
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingSucursal(null);
    setError(null);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? "ACTIVO" : "INACTIVO") : value,
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.nombre.trim() || !form.codigo_comercio_redeban.trim() || !form.codigo_referencia_banco.trim()) {
      setError("Nombre y códigos son obligatorios");
      return;
    }

    setSaving(true);
    try {
      if (editingSucursal) {
        const updated = await updateSucursal(editingSucursal.id, form);
        setData(prev => prev.map(s => s.id === updated.id ? updated : s));
      } else {
        const created = await createSucursal(form);
        setData(prev => [...prev, created]);
      }
      closeModal();
      loadSucursales();
    } catch (err: any) {
      console.error("Error guardando sucursal:", err);
      setError(err.response?.data?.message || "Error al guardar la sucursal");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-white/60">Cargando sucursales...</p>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Sucursales</h1>
        
        <Can roles={["ADMIN", "PROPIETARIO", "DESARROLLADOR", "SOPORTE"]}>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 rounded-xl bg-sky-500 text-black font-semibold hover:bg-sky-400 transition"
          >
             Nueva sucursal
          </button>
        </Can>
      </div>

      {/* Mensaje para OPERATIVO */}
      {user?.rol === "OPERATIVO" && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-300">
          ℹ️ <strong>Modo solo lectura:</strong> Puedes ver las sucursales para seleccionarlas al crear vouchers, pero no editarlas.
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-white/10 rounded-xl overflow-hidden">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Código Comercio</th>
              <th className="text-left p-3">Código Banco</th>
              <th className="text-left p-3">Dirección</th>
              <th className="text-left p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-white/40">
                  No hay sucursales registradas
                </td>
              </tr>
            )}

            {data.map((s) => (
              <tr key={s.id} className="border-t border-white/10 hover:bg-white/5 transition">
                <td className="p-3 font-medium">{s.nombre}</td>
                <td className="p-3 text-white/70">{s.codigo_comercio_redeban}</td>
                <td className="p-3 text-white/70">{s.codigo_referencia_banco}</td>
                <td className="p-3 text-white/70">{s.direccion}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      s.estado === "ACTIVO"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {s.estado === "ACTIVO" ? "Activa" : "Inactiva"}
                  </span>
                </td>

                <td className="p-3 text-right space-x-3">
                  <Can roles={["ADMIN", "PROPIETARIO", "DESARROLLADOR", "SOPORTE"]}>
                    <button
                      onClick={() => openModal(s)}
                      className="text-sky-400 hover:text-sky-300 transition"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => handleDelete(s.id, s.nombre)}
                      className="text-red-500 hover:text-red-400 transition"
                    >
                      Eliminar
                    </button>
                  </Can>

                  <Can roles={["OPERATIVO"]}>
                    <span className="text-white/40 text-xs italic">Solo lectura</span>
                  </Can>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                {editingSucursal ? "Editar sucursal" : "Nueva sucursal"}
              </h2>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Nombre <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej: CASA DEL KUMIS CENTRO"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    required
                  />
                </div>

                {/* Código Comercio REDEBAN */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Código Comercio REDEBAN <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="codigo_comercio_redeban"
                    value={form.codigo_comercio_redeban}
                    onChange={handleChange}
                    placeholder="Ej: 0063286892"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    required
                  />
                </div>

                {/* Código Referencia Banco */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Código Referencia Banco <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="codigo_referencia_banco"
                    value={form.codigo_referencia_banco}
                    onChange={handleChange}
                    placeholder="Ej: 0063286892"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    required
                  />
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    placeholder="Ej: CALLE 38 31 A 10"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Estado <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    required
                  >
                    <option value="ACTIVO">Activa</option>
                    <option value="INACTIVO">Inactiva</option>
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-sky-500 text-black font-semibold rounded-lg hover:bg-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Guardando..." : editingSucursal ? "Actualizar" : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}