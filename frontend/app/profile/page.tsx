// app/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { APP_TEXTS } from '@/app/constants/texts';
import { userService, UserProfile } from '@/services/userService';
import { AlertModal } from '@/components/ui/AlertModal';

export default function ProfilePage() {
  const T = APP_TEXTS.profile;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  // Formulario de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modales y Feedback
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title?: string; message: string }>({
    isOpen: false,
    message: '',
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const data = await userService.getCurrentUserProfile();
      setProfile(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : APP_TEXTS.common.error;
      showAlert('Error', message);
    } finally {
      setLoadingProfile(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    setAlertState({ isOpen: true, title, message });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);

    if (newPassword.length < 8) {
      showAlert('Error de Validación', T.changePasswordCard.errors.minLength);
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Error de Validación', T.changePasswordCard.errors.passwordsDoNotMatch);
      return;
    }

    try {
      setIsSubmitting(true);
      await userService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setSuccessMsg(T.changePasswordCard.successMessage);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : T.changePasswordCard.errors.defaultError;
      showAlert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[color:var(--text-primary)] p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[color:var(--border-color)] pb-4">
          <div>
            <h1 className="text-2xl font-bold">{T.title}</h1>
            <p className="text-sm text-[color:var(--text-muted)] mt-1">{T.subtitle}</p>
          </div>
          <Link
            href="/"
            className="text-xs px-4 py-2 rounded-lg bg-[var(--panel-bg)] hover:bg-[var(--sidebar-bg)] border border-[color:var(--border-color)] transition-colors"
          >
            ← {APP_TEXTS.adminUsers.backToHome}
          </Link>
        </div>

        {/* Tarjeta 1: Información Personal */}
        <div className="bg-[var(--sidebar-bg)] border border-[color:var(--border-color)] rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">{T.userCard.title}</h2>
          
          {loadingProfile ? (
            <p className="text-sm text-[color:var(--text-muted)]">{APP_TEXTS.adminUsers.table.loading}</p>
          ) : profile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
                  {T.userCard.nameLabel}
                </span>
                <p className="font-medium">{profile.name}</p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
                  {T.userCard.emailLabel}
                </span>
                <p className="font-medium">{profile.email}</p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
                  {T.userCard.roleLabel}
                </span>
                <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold inline-block">
                  {profile.role}
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-[color:var(--text-muted)] mb-1">
                  {T.userCard.statusLabel}
                </span>
                <span className="text-xs font-semibold text-emerald-400">
                  ● {profile.is_active ? T.userCard.statusActive : T.userCard.statusInactive}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Tarjeta 2: Cambiar Contraseña */}
        <div className="bg-[var(--sidebar-bg)] border border-[color:var(--border-color)] rounded-xl p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold">{T.changePasswordCard.title}</h2>
            <p className="text-xs text-[color:var(--text-muted)] mt-0.5">{T.changePasswordCard.subtitle}</p>
          </div>

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              ✓ {successMsg}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
                {T.changePasswordCard.currentPasswordLabel}
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={T.changePasswordCard.currentPasswordPlaceholder}
                className="w-full px-3 py-2 text-xs bg-[var(--panel-bg)] border border-[color:var(--border-color)] rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
                {T.changePasswordCard.newPasswordLabel}
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={T.changePasswordCard.newPasswordPlaceholder}
                className="w-full px-3 py-2 text-xs bg-[var(--panel-bg)] border border-[color:var(--border-color)] rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
                {T.changePasswordCard.confirmPasswordLabel}
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={T.changePasswordCard.confirmPasswordPlaceholder}
                className="w-full px-3 py-2 text-xs bg-[var(--panel-bg)] border border-[color:var(--border-color)] rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black rounded-lg transition-colors shadow-md"
              >
                {isSubmitting ? T.changePasswordCard.savingBtn : T.changePasswordCard.saveBtn}
              </button>
            </div>
          </form>
        </div>

      </div>

      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState({ isOpen: false, message: '' })}
      />
    </div>
  );
}