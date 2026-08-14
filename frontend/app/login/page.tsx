"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { APP_TEXTS } from "@/app/constants/texts";
import { authService } from "@/services/authService";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const T = APP_TEXTS.login;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Hooks de navegación y parámetros
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Obtener callbackUrl de la URL, por defecto la raíz "/"
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // 2. Redirección si el usuario ya está autenticado
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(callbackUrl);
    }
  }, [isAuthenticated, isLoading, router, callbackUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const data = await authService.login({ username, password });
      if (!data.access_token) {
        throw new Error(T.invalidSessionResponseError);
      }
      
      // Se guarda el token y el useEffect redirigirá a callbackUrl cuando isAuthenticated pase a true
      login(data.access_token);
    } catch (err: any) {
      setErrorMsg(err.message || T.genericError);
    } finally {
      setLoading(false);
    }
  };

  // 3. Evitar renderizar el formulario mientras redirige
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)] p-4 transition-colors">
      <div className="w-full max-w-md bg-[var(--sidebar-bg)] border border-[color:var(--border-color)] rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Marca y Subtítulo */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            {APP_TEXTS.common.appName}
          </h1>
          <p className="text-xs text-[color:var(--text-muted)]">
            {APP_TEXTS.common.subtitle}
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMsg && (
          <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1.5 uppercase tracking-wider">
              {T.usernameLabel}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={T.usernamePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-[color:var(--text-subtle)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1.5 uppercase tracking-wider">
              {T.passwordLabel}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={T.passwordPlaceholder}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-[color:var(--text-subtle)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] cursor-pointer transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex justify-center items-center"
          >
            {loading ? T.submittingBtn : T.submitBtn}
          </button>
        </form>
      </div>
    </div>
  );
}