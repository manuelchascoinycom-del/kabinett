import React from 'react';

interface CustomFieldsModalProps {
  isOpen: boolean;
  newFieldName: string;
  setNewFieldName: (name: string) => void;
  newFieldType: 'text' | 'number' | 'select' | 'boolean';
  setNewFieldType: (type: 'text' | 'number' | 'select' | 'boolean') => void;
  newFieldOptions: string;
  setNewFieldOptions: (options: string) => void;
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
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="bg-[#0d1322] border border-slate-800 p-6 rounded-xl w-full max-w-md space-y-4"
      >
        <h3 className="text-sm font-bold text-slate-200">Campos Personalizados</h3>

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

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg font-medium"
          >
            Cerrar
          </button>
          <button type="submit" className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg">
            Guardar Campo
          </button>
        </div>
      </form>
    </div>
  );
};