import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getToken, getUserFromToken, clearToken, type JwtPayload } from "../lib/auth";

type AuthContextType = {
  user: JwtPayload | null;
  isAuthenticated: boolean;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const userData = getUserFromToken();
      setUser(userData);
    } else {
      setUser(null);
    }
  }, []);

  const logout = () => {
    clearToken();
    localStorage.removeItem("user");
    setUser(null);
    // En lugar de navigate, redirigimos con window.location
    window.location.href = "/login";
  };

  // Verifica si el usuario tiene TODOS los roles especificados
  const hasRole = (roles: string[]): boolean => {
    if (!user?.rol) return false;
    return roles.includes(user.rol);
  };

  // Verifica si el usuario tiene AL MENOS UNO de los roles
  const hasAnyRole = (roles: string[]): boolean => {
    if (!user?.rol) return false;
    return roles.some(r => r === user.rol);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        logout,
        hasRole,
        hasAnyRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}