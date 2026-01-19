import { Sucursal } from "../types/sucursal.types";
import { Link } from "react-router-dom";

interface Props {
  data: Sucursal[];
}

export function SucursalesTable({ data }: Props) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Código</th>
          <th>Ciudad</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {data.map(s => (
          <tr key={s.id}>
            <td>{s.nombre}</td>
            <td>{s.codigo}</td>
            <td>{s.ciudad}</td>
            <td>{s.estado ? "Activa" : "Inactiva"}</td>
            <td className="flex gap-2">
              <Link to={`/sucursales/${s.id}/edit`}>Editar</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
