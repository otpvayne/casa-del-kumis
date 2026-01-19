export type UserRole = "PROPIETARIO" | "ADMIN" | "OPERATIVO" | "DESARROLLADOR" | "SOPORTE";

export type UserStatus = "ACTIVO" | "INACTIVO";

export type User = {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  estado: UserStatus;
  created_at: string;
  updated_at: string;
};