// components/ui/AlertModal.tsx
'use client';

import React from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

interface AlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
}) => {
  const T = APP_TEXTS.adminUsers.alertModal;
  const modalTitle = title || T.defaultTitle;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-md bg-[var(--sidebar-bg)] border border-[color:var(--border-color)] rounded-xl p-6 shadow-2xl transform transition-all scale-100">
        
        {/* Cabecera con Icono de Advertencia */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <span className="text-amber-400 text-lg font-bold">⚠️</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[color:var(--text-secondary)]">
              {modalTitle}
            </h3>
            <p className="text-[11px] text-[color:var(--text-muted)]">{T.subtitle}</p>
          </div>
        </div>

        {/* Mensaje de Error Limpio */}
        <div className="mb-6 p-3 rounded-lg bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-xs text-[color:var(--text-muted)] leading-relaxed">
          {message}
        </div>

        {/* Botón de Aceptar */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg transition-colors shadow-md"
          >
            {T.understandBtn}
          </button>
        </div>

      </div>
    </div>
  );
};