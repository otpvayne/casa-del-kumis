import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "auth_token";

export type JwtPayload = {
  sub: string | number;
  email?: string;
  rol?: string; // tu backend usa Rol enum, suele venir como string
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
  if (!payload?.exp) return false; // si no hay exp, no bloqueamos
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

export function logout() {
  clearToken();
}
