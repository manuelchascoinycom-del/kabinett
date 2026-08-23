'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { APP_TEXTS } from '@/app/constants/texts';

interface BatchAiConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const BatchAiConfirmModal: React.FC<BatchAiConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const T = APP_TEXTS.sidebar.batchAi;

  // createPortal saca el modal del DOM local y lo monta directamente en el body
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-[var(--sidebar-bg)] border border-[color:var(--border-color)] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-scaleIn">
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[color:var(--text-strong)]">{T.confirmTitle}</h3>
          </div>
        </div>

        <p className="text-xs text-[color:var(--text-primary)] leading-relaxed bg-[var(--panel-bg)] p-3.5 rounded-xl border border-[color:var(--border-color)]">
          {T.confirmMessage}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-[var(--panel-bg-muted)] hover:bg-[var(--panel-hover)] text-[color:var(--text-secondary)] text-xs font-semibold rounded-xl border border-[color:var(--border-color)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {T.cancelBtn}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? "..." : T.confirmBtn}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};