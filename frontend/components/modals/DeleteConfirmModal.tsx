// components/common/DeleteConfirmModal.tsx
'use client';

import React from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  documentTitle: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  documentTitle,
  isDeleting = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const T = APP_TEXTS.modals.deleteDocument;

  return (
    <div className="fixed inset-[0] z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-[var(--sidebar-bg)] border border-[color:var(--border-color)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scaleIn">
        
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[color:var(--text-strong)]">{T.title}</h3>
            <p className="text-xs text-[color:var(--text-muted)]">{T.subtitle}</p>
          </div>
        </div>

        {/* Mensaje de confirmación */}
        <p className="text-xs text-[color:var(--text-primary)] leading-relaxed bg-[var(--panel-bg)] p-3.5 rounded-xl border border-[color:var(--border-color)]">
          {T.messagePrefix}{" "}
          <strong className="text-[color:var(--text-strong)] font-semibold">"{documentTitle}"</strong>?
        </p>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 bg-[var(--panel-bg-muted)] hover:bg-[var(--panel-hover)] text-[color:var(--text-secondary)] text-xs font-semibold rounded-xl border border-[color:var(--border-color)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {T.cancelBtn}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isDeleting ? T.deletingBtn : T.confirmBtn}
          </button>
        </div>

      </div>
    </div>
  );
};