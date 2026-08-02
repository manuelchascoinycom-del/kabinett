'use client';

import React from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = APP_TEXTS.common.areYouSure,
  message,
  confirmText = APP_TEXTS.common.confirm,
  cancelText = APP_TEXTS.common.cancel,
  isDanger = true,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="app-overlay fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="app-modal p-6 rounded-xl w-full max-w-sm space-y-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-full shrink-0 ${
            isDanger ? 'bg-[var(--danger-soft)] text-[color:var(--danger)] border border-[color:var(--danger-border)]' : 'bg-[var(--accent-soft)] text-[color:var(--accent)] border border-[color:var(--accent-border)]'
          }`}>
            {isDanger ? APP_TEXTS.modals.confirmModal.dangerIcon : APP_TEXTS.modals.confirmModal.infoIcon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[color:var(--text-strong)]">{title}</h3>
            <p className="text-xs text-[color:var(--text-muted)] leading-relaxed mt-1">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[color:var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[var(--panel-bg-muted)] hover:bg-[var(--panel-hover)] border border-[color:var(--border-color)] text-[color:var(--text-secondary)] text-xs rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-3.5 py-1.5 font-bold text-xs rounded-lg transition-colors shadow ${
              isDanger
                ? 'bg-red-500 hover:bg-red-400 text-slate-950'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
