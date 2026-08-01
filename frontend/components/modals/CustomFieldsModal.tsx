'use client';

import React from 'react';

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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-[#0d1322] border border-slate-800 p-6 rounded-xl w-full max-w-md space-y-5 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-200">Gestionar Campos Personalizados</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm font-bold">
            ✕
          </button>
        </div>

        {/* 1. LISTA DE CAMPOS EXISTENTES */}
        {customFields.length > 0 && (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">
              Campos Activos ({customFields.length})
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {customFields.map((field) => {
                const type = field.field_type || field.type;
                return (
                  <div
                    key={field.id}
                    className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-slate-200">{field.name}</span>
                      <span className="ml-2 text-[10px] text-slate-500 capitalize">({type})</span>
                    </div>

                    {onDeleteField && (
                      <button
                        type="button"
                        onClick={() => onDeleteField(field.id)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors text-xs shrink-0"
                        title="Eliminar campo"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. FORMULARIO PARA CREAR NUEVO CAMPO */}
        <form onSubmit={onSubmit} className="space-y-4 pt-2 border-t border-slate-800/80">
          <label className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Crear Nuevo Campo
          </label>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Nombre del Campo</label>
            <input
              type="text"
              placeholder="Ej: Año de Composición, Editorial..."
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Tipo de Dato</label>
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500"
            >
              <option value="text">Texto</option>
              <option value="number">Número</option>
              <option value="select">Desplegable (Selección)</option>
              <option value="boolean">Verdadero / Falso</option>
            </select>
          </div>

          {newFieldType === 'select' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Opciones (separadas por coma)</label>
              <input
                type="text"
                placeholder="Opción 1, Opción 2, Opción 3"
                value={newFieldOptions}
                onChange={(e) => setNewFieldOptions(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
            >
              Guardar Campo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};