import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSucursalById, updateSucursal } from "../api/sucursales.api";
import type { Sucursal } from "../types/sucursal.types";

export default function EditSucursalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucursal, setSucursal] = useState<Sucursal | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    codigo: "",
    direccion: "",
    ciudad: "",
    estado: true,
  });

  useEffect(() => {
    if (!id) return;
    
    async function loadSucursal() {
      try {
        const data = await getSucursalById(Number(id));
        setSucursal(data);
        setForm({
          nombre: data.nombre,
          codigo: data.codigo,
          direccion: data.direccion,
          ciudad: data.ciudad,
          estado: data.estado,
        });
      } catch (err: any) {
        console.error("Error cargando sucursal:", err);
        setError("No se pudo cargar la sucursal");
      } finally {
        setLoading(false);
      }
    }

    loadSucursal();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.nombre.trim() || !form.codigo.trim()) {
      setError("Nombre y código son obligatorios");
      return;
    }

    if (!id) return;

    setSaving(true);
    try {
      await updateSucursal(Number(id), form);
      navigate("/sucursales");
    } catch (err: any) {
      console.error("Error actualizando sucursal:", err);
      setError(err.response?.data?.message || "Error al actualizar la sucursal");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-white/60">Cargando sucursal...</p>
      </div>
    );
  }

  if (error && !sucursal) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          ⚠️ {error}
        </div>
        <button
          onClick={() => navigate("/sucursales")}
          className="text-sky-400 hover:text-sky-300"
        >
          ← Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/sucursales")}
          className="text-white/60 hover:text-white transition"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-semibold">Editar Sucursal</h1>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
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

          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Código <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="codigo"
              value={form.codigo}
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

          {/* Ciudad */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Ciudad
            </label>
            <input
              type="text"
              name="ciudad"
              value={form.ciudad}
              onChange={handleChange}
              placeholder="Ej: Bogotá"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="estado"
              checked={form.estado}
              onChange={handleChange}
              className="w-4 h-4 rounded bg-white/5 border border-white/10 text-sky-500 focus:ring-2 focus:ring-sky-500/50"
            />
            <label className="text-sm font-medium text-white/80">
              Sucursal activa
            </label>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate("/sucursales")}
            className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-sky-500 text-black font-semibold hover:bg-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}