'use client';

import React from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

export interface CustomFieldItem {
  id: string;
  name: string;
  field_type?: 'text' | 'number' | 'select' | 'boolean' | string;
  type?: string;
  options?: string[];
}

interface CustomFieldsModalProps {
  isOpen: boolean;
  newFieldName: string;
  setNewFieldName: (name: string) => void;
  newFieldType: 'text' | 'number' | 'select' | 'boolean';
  setNewFieldType: (type: 'text' | 'number' | 'select' | 'boolean') => void;
  newFieldOptions: string;
  setNewFieldOptions: (options: string) => void;
  customFields?: CustomFieldItem[];
  onDeleteField?: (fieldId: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CustomFieldsModal: React.FC<CustomFieldsModalProps> = ({
  isOpen,
  newFieldName,
  setNewFieldName,
  newFieldType,
  setNewFieldType,
  newFieldOptions,
  setNewFieldOptions,
  customFields = [],
  onDeleteField,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const { customFields: T } = APP_TEXTS.modals;

  return (
    <div className="app-overlay fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="app-modal p-6 rounded-xl w-full max-w-md space-y-5 shadow-2xl">
        <div className="flex justify-between items-center border-b border-[color:var(--border-color)] pb-3">
          <h3 className="text-sm font-bold text-[color:var(--text-strong)]">{T.title}</h3>
          <button onClick={onClose} className="text-[color:var(--text-subtle)] hover:text-[color:var(--text-secondary)] text-sm font-bold">
            {APP_TEXTS.common.closeIcon}
          </button>
        </div>

        {customFields.length > 0 && (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">
              {T.activeFieldsCount.replace('{count}', String(customFields.length))}
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {customFields.map((field) => {
                const type = field.field_type || field.type;
                return (
                  <div
                    key={field.id}
                    className="flex items-center justify-between bg-[var(--panel-bg-muted)] border border-[color:var(--border-color)] rounded-lg p-2 text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-[color:var(--text-primary)]">{field.name}</span>
                      <span className="ml-2 text-[10px] text-[color:var(--text-subtle)] capitalize">({type})</span>
                    </div>

                    {onDeleteField && (
                      <button
                        type="button"
                        onClick={() => onDeleteField(field.id)}
                        className="text-[color:var(--text-subtle)] hover:text-[color:var(--danger)] p-1 transition-colors text-xs shrink-0"
                        title={T.deleteFieldTooltip}
                      >
                        {APP_TEXTS.sidebar.deleteIcon}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 pt-2 border-t border-[color:var(--border-color)]">
          <label className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            {T.createNewFieldLabel}
          </label>

          <div>
            <label className="text-xs text-[color:var(--text-muted)] block mb-1">{T.fieldNameLabel}</label>
            <input
              type="text"
              placeholder={T.fieldNamePlaceholder}
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="app-input w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-[color:var(--text-muted)] block mb-1">{T.fieldTypeLabel}</label>
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as any)}
              className="w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500"
            >
              <option value="text">{T.fieldTypeOptions.text}</option>
              <option value="number">{T.fieldTypeOptions.number}</option>
              <option value="select">{T.fieldTypeOptions.select}</option>
              <option value="boolean">{T.fieldTypeOptions.boolean}</option>
            </select>
          </div>

          {newFieldType === 'select' && (
            <div>
              <label className="text-xs text-[color:var(--text-muted)] block mb-1">{T.optionsLabel}</label>
              <input
                type="text"
                placeholder={T.optionsPlaceholder}
                value={newFieldOptions}
                onChange={(e) => setNewFieldOptions(e.target.value)}
                className="app-input w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[color:var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[var(--panel-bg-muted)] text-[color:var(--text-secondary)] text-xs rounded-lg font-medium hover:bg-[var(--panel-hover)] border border-[color:var(--border-color)] transition-colors"
            >
              {T.closeBtn}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
            >
              {T.saveFieldBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
