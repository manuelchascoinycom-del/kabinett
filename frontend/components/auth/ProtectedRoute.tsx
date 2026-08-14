// components/auth/ProtectedRoute.tsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { APP_TEXTS } from "@/app/constants/texts";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && pathname !== "/login") {
        const callbackUrl = encodeURIComponent(pathname);
        router.replace(`/login?callbackUrl=${callbackUrl}`);
      } else if (isAuthenticated && pathname === "/login") {
        router.replace("/");
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)] text-[color:var(--text-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-[color:var(--text-muted)] animate-pulse">
            {APP_TEXTS.auth.loadingSession}
          </p>
        </div>
      </div>
    );
  }

  // Si está autenticado e intenta ver /login, evitamos el renderizado
  if (isAuthenticated && pathname === "/login") {
    return null;
  }

  // Si NO está autenticado e intenta ver una ruta protegida, evitamos el renderizado
  if (!isAuthenticated && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
};