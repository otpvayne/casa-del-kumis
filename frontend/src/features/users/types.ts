export type User = {
  id: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "OPERATIVO" | "PROPIETARIO";
  estado: "ACTIVO" | "INACTIVO";
  created_at: string;
  updated_at: string;
};
