import { useState } from "react";
import { Sucursal } from "../types/sucursal.types";

interface Props {
  initialData?: Partial<Sucursal>;
  onSubmit: (data: Omit<Sucursal, "id">) => void;
}

export function SucursalForm({ initialData = {}, onSubmit }: Props) {
  const [form, setForm] = useState({
    nombre: initialData.nombre ?? "",
    codigo: initialData.codigo ?? "",
    direccion: initialData.direccion ?? "",
    ciudad: initialData.ciudad ?? "",
    estado: initialData.estado ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" />
      <input name="codigo" value={form.codigo} onChange={handleChange} placeholder="Código" />
      <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección" />
      <input name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Ciudad" />
      <label>
        <input type="checkbox" name="estado" checked={form.estado} onChange={handleChange} />
        Activa
      </label>

      <button type="submit" className="btn-primary">
        Guardar
      </button>
    </form>
  );
}
