// app/admin/users/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { userService, User, CreateUserPayload, UpdateUserPayload } from '@/services/userService';
import { UserModal } from '@/components/admin/UserModal';
import { AlertModal } from '@/components/ui/AlertModal';
import { APP_TEXTS } from '@/app/constants/texts';

export default function AdminUsersPage() {
  const T = APP_TEXTS.adminUsers;

  // 1. TODOS LOS HOOKS DECLARADOS AL INICIO
  const { hasRole, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Helper para extraer el detalle del error JSON
  const cleanErrorMessage = (rawError: string): string => {
    try {
      const jsonMatch = rawError.match(/\{.*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.detail) return parsed.detail;
      }
    } catch {
      // Si falla el parseo, se mantiene el mensaje original
    }
    return rawError;
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userService.getUsers({
        page,
        limit: 10,
        search,
        role: roleFilter,
      });
      setUsers(res.users);
      setTotal(res.total);
    } catch (err: any) {
      setError(cleanErrorMessage(err.message || T.defaultLoadError));
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, T.defaultLoadError]);

  useEffect(() => {
    if (!authLoading && hasRole('Admin')) {
      loadUsers();
    }
  }, [authLoading, loadUsers, hasRole]);

  // 2. CONDICIONES DE GUARDA Y RETORNOS PREVIOS
  if (authLoading) return <div className="p-8 text-xs text-emerald-500">{APP_TEXTS.auth.loadingSession}</div>;

  if (!hasRole('Admin')) {
    return (
      <div className="p-8 text-center text-red-400">
        <h1 className="text-lg font-bold">{T.accessDeniedTitle}</h1>
        <p className="text-xs mt-2 text-[color:var(--text-muted)]">
          {T.accessDeniedMessage}
        </p>
        <Link href="/" className="inline-block mt-4 text-xs text-emerald-400 underline">
          {T.backToHome}
        </Link>
      </div>
    );
  }

  const handleCreateOrUpdate = async (data: CreateUserPayload | UpdateUserPayload) => {
    if (userToEdit) {
      await userService.updateUser(userToEdit.id, data as UpdateUserPayload);
    } else {
      await userService.createUser(data as CreateUserPayload);
    }
    loadUsers();
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await userService.toggleUserStatus(user.id, !user.is_active);
      loadUsers();
    } catch (err: any) {
      const readableMessage = cleanErrorMessage(err.message || T.defaultToggleError);
      setAlertMessage(readableMessage);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sidebar-bg)] p-8 text-[color:var(--text-secondary)]">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-xs text-emerald-400 hover:underline mb-2 block">
            {T.backToDashboard}
          </Link>
          <h1 className="text-2xl font-extrabold text-emerald-400">{T.pageTitle}</h1>
          <p className="text-xs text-[color:var(--text-muted)]">
            {T.pageSubtitle}
          </p>
        </div>
        <button
          onClick={() => {
            setUserToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg transition-all shadow-lg"
        >
          {T.newUserBtn}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder={T.searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-xs focus:outline-none focus:border-emerald-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-xs focus:outline-none focus:border-emerald-500"
        >
          <option value="">{T.allRolesOption}</option>
          <option value="Admin">Admin</option>
          <option value="Editor">Editor</option>
          <option value="Viewer">Viewer</option>
        </select>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-[color:var(--border-color)] bg-[var(--panel-bg)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[color:var(--border-color)] text-[11px] uppercase tracking-wider text-[color:var(--text-muted)] bg-[var(--sidebar-bg)]">
              <th className="p-3">{T.table.headers.name}</th>
              <th className="p-3">{T.table.headers.email}</th>
              <th className="p-3">{T.table.headers.role}</th>
              <th className="p-3">{T.table.headers.status}</th>
              <th className="p-3 text-right">{T.table.headers.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border-color)] text-xs">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-[color:var(--text-muted)]">
                  {T.table.loading}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-[color:var(--text-muted)]">
                  {T.table.empty}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--panel-hover)] transition-colors">
                  <td className="p-3 font-semibold text-[color:var(--text-secondary)]">{u.name}</td>
                  <td className="p-3 text-[color:var(--text-muted)]">{u.email}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'Admin'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : u.role === 'Editor'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {u.is_active ? T.table.status.active : T.table.status.inactive}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setUserToEdit(u);
                        setIsModalOpen(true);
                      }}
                      className="text-xs font-semibold text-emerald-400 hover:underline"
                    >
                      {T.table.actions.edit}
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`text-xs font-semibold hover:underline ${
                        u.is_active ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {u.is_active ? T.table.actions.deactivate : T.table.actions.activate}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mt-4 text-xs text-[color:var(--text-muted)]">
        <span>Total: {total} usuarios</span>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 rounded bg-[var(--panel-bg)] border border-[color:var(--border-color)] disabled:opacity-40"
          >
            {T.pagination.previous}
          </button>
          <span className="py-1">{T.pagination.pageLabel} {page}</span>
          <button
            disabled={page * 10 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded bg-[var(--panel-bg)] border border-[color:var(--border-color)] disabled:opacity-40"
          >
            {T.pagination.next}
          </button>
        </div>
      </div>

      {/* Modal de Edición/Creación */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateOrUpdate}
        userToEdit={userToEdit}
      />

      {/* Modal de Alerta estilizada */}
      <AlertModal
        isOpen={!!alertMessage}
        message={alertMessage || ''}
        onClose={() => setAlertMessage(null)}
      />
    </div>
  );
}