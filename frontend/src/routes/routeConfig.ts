import type { UserRole } from "../features/users/types";

export type NavItem = {
  label: string;
  to: string;
  icon?: string; // Opcional: emoji o clase de icono
  roles: UserRole[]; // Roles que pueden ver este item
};

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: "📊",
    roles: ["PROPIETARIO", "ADMIN", "OPERATIVO", "DESARROLLADOR", "SOPORTE"],
  },
  {
    label: "Vouchers",
    to: "/vouchers",
    icon: "🧾",
    roles: ["PROPIETARIO", "ADMIN", "OPERATIVO", "DESARROLLADOR", "SOPORTE"],
  },
  {
    label: "Banco",
    to: "/banco",
    icon: "🏦",
    roles: ["PROPIETARIO", "ADMIN", "OPERATIVO", "DESARROLLADOR", "SOPORTE"], // ✅ Agregado OPERATIVO
  },
  {
    label: "RedeBan",
    to: "/redeban",
    icon: "💳",
    roles: ["PROPIETARIO", "ADMIN", "OPERATIVO", "DESARROLLADOR", "SOPORTE"], // ✅ Agregado OPERATIVO
  },
  {
    label: "Conciliaciones",
    to: "/conciliaciones",
    icon: "✅",
    roles: ["PROPIETARIO", "ADMIN", "OPERATIVO", "DESARROLLADOR", "SOPORTE"],
  },
  {
    label: "Parámetros",
    to: "/parametros",
    icon: "⚙️",
    roles: ["PROPIETARIO", "ADMIN", "DESARROLLADOR", "SOPORTE"], // ❌ SIN OPERATIVO
  },
  {
    label: "Sucursales",
    to: "/sucursales",
    icon: "🏪",
    roles: ["PROPIETARIO", "ADMIN", "DESARROLLADOR", "SOPORTE"], // ❌ SIN OPERATIVO
  },
  {
    label: "Usuarios",
    to: "/users",
    icon: "👥",
    roles: ["PROPIETARIO", "ADMIN", "DESARROLLADOR", "SOPORTE"], // ❌ SIN OPERATIVO
  },
];