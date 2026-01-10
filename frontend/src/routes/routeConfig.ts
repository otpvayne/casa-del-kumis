export type AppRole =
  | "PROPIETARIO"
  | "ADMIN"
  | "OPERATIVO"
  | "DESARROLLADOR"
  | "SOPORTE";

export type NavItem = {
  label: string;
  to: string;
  roles: AppRole[]; // quién lo puede ver
};

export const navItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", roles: ["PROPIETARIO","ADMIN","OPERATIVO","DESARROLLADOR","SOPORTE"] },
  { label: "Vouchers", to: "/vouchers", roles: ["PROPIETARIO","ADMIN","OPERATIVO","DESARROLLADOR","SOPORTE"] },
  { label: "Banco", to: "/banco", roles: ["PROPIETARIO","ADMIN","DESARROLLADOR","SOPORTE"] },
  { label: "RedeBan", to: "/redeban", roles: ["PROPIETARIO","ADMIN","DESARROLLADOR","SOPORTE"] },
  { label: "Conciliaciones", to: "/conciliaciones", roles: ["PROPIETARIO","ADMIN","OPERATIVO","DESARROLLADOR","SOPORTE"] },
  { label: "Parámetros", to: "/parametros-sistema", roles: ["PROPIETARIO","ADMIN","DESARROLLADOR","SOPORTE","OPERATIVO"] },
  { label: "Sucursales", to: "/sucursales", roles: ["PROPIETARIO","ADMIN","DESARROLLADOR","SOPORTE"] },
  { label: "Usuarios", to: "/users", roles: ["PROPIETARIO","ADMIN","DESARROLLADOR","SOPORTE"] },
];
