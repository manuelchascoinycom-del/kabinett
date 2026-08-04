// context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP_TEXTS } from "@/app/constants/texts";

interface AuthContextType {
  token: string | null;
  userRole: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Función auxiliar para decodificar la carga útil del JWT sin librerías externas
function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Al cargar la app, comprobar si hay token guardado
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      const decoded = parseJwt(storedToken);
      if (decoded && decoded.role) {
        setUserRole(decoded.role);
      }
    }
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    const decoded = parseJwt(newToken);
    if (decoded && decoded.role) {
      setUserRole(decoded.role);
    }
    router.push("/"); // Redirigir al dashboard tras login exitoso
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUserRole(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        userRole,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(APP_TEXTS.auth.errors.useAuthOutsideProvider);
  }
  return context;
};
