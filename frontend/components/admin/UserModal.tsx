// components/admin/UserModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { User, CreateUserPayload, UpdateUserPayload } from '@/services/userService';
import { APP_TEXTS } from '@/app/constants/texts';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  userToEdit?: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userToEdit,
}) => {
  const T = APP_TEXTS.adminUsers.modal;
  const isEditing = !!userToEdit;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Viewer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('Viewer');
    }
    setError(null);
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEditing && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateUserPayload | UpdateUserPayload = isEditing
        ? {
            name,
            email,
            role,
            ...(password ? { password } : {}),
          }
        : {
            name,
            email,
            password,
            role,
          };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--sidebar-bg)] border border-[color:var(--border-color)] rounded-xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-emerald-400 mb-4">
          {isEditing ? T.editTitle : T.createTitle}
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
              {T.nameLabel}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-xs text-[color:var(--text-secondary)] focus:outline-none focus:border-emerald-500"
              placeholder={T.namePlaceholder}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
              {T.emailLabel}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-xs text-[color:var(--text-secondary)] focus:outline-none focus:border-emerald-500"
              placeholder={T.emailPlaceholder}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
              {isEditing ? T.passwordPlaceholderEdit : T.passwordLabel}
            </label>
            <input
              type="password"
              required={!isEditing}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-xs text-[color:var(--text-secondary)] focus:outline-none focus:border-emerald-500"
              placeholder={T.passwordPlaceholderCreate}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
              {T.roleLabel}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-xs text-[color:var(--text-secondary)] focus:outline-none focus:border-emerald-500"
            >
              <option value="Viewer">Viewer (Solo lectura)</option>
              <option value="Editor">Editor (Crear y editar documentos)</option>
              <option value="Admin">Admin (Control Total)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[color:var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[color:var(--text-muted)] hover:text-white transition-colors"
            >
              {T.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? T.savingBtn : T.saveBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};