import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "auth_token";

// IMPORTANTE: Exportar el tipo para que pueda ser usado en otros archivos
export type JwtPayload = {
  sub: number; // ID del usuario
  email: string;
  rol: string; // Usamos string genérico para mayor flexibilidad
  nombre?: string; // Agregamos nombre opcional
  iat?: number;
  exp?: number;
};

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("user"); // Limpiar también el user si existe
}

export function getUserFromToken(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;

  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  const payload = getUserFromToken();
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

export function logout() {
  clearToken();
}