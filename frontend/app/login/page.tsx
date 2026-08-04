// app/login/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { APP_TEXTS } from "@/app/constants/texts";
import { authService } from "@/services/authService";

export default function LoginPage() {
  const T = APP_TEXTS.login;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const data = await authService.login({ username, password });
      if (!data.access_token) {
        throw new Error(T.invalidSessionResponseError);
      }
      login(data.access_token);
    } catch (err: any) {
      setErrorMsg(err.message || T.genericError);
    } finally {
      setLoading(false);
    }
  };

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
              placeholder="admin@kabinett.com"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-[color:var(--text-subtle)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1.5 uppercase tracking-wider">
              {T.passwordLabel}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-all placeholder:text-[color:var(--text-subtle)]"
            />
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