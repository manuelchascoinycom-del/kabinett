import React from 'react';
import { TagInput } from '@/components/ui/TagInput';

interface EditMetadataModalProps {
  isOpen: boolean;
  editingItem: any;
  editForm: {
    title: string;
    composer: string;
    tags: string[];
    custom: Record<string, any>;
  };
  globalTags: string[];
  customFields: Array<{
    id: string;
    name: string;
    field_type?: string;
    type?: string; // Por retrocompatibilidad de nombres
    options?: string[];
  }>;
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  onConfirm: () => void;
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  isOpen,
  editingItem,
  editForm,
  globalTags,
  customFields,
  setEditForm,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !editingItem) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-[#0d1322] border border-slate-800 p-6 rounded-xl w-full max-w-lg space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-100 truncate max-w-[320px]">
            Revisar Metadatos: {editForm.title || editingItem.file?.name}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Título de la Obra
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Compositor / Autor
            </label>
            <input
              type="text"
              value={editForm.composer}
              onChange={(e) => setEditForm({ ...editForm, composer: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Etiquetas (#Tags)
            </label>
            <TagInput
              tags={editForm.tags}
              allTags={globalTags}
              onChange={(newTags) => setEditForm({ ...editForm, tags: newTags })}
            />
          </div>

          {customFields.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">
                Campos Personalizados
              </label>
              <div className="grid grid-cols-2 gap-2">
                {customFields.map((field) => {
                  const fieldType = field.field_type || field.type;
                  const value = editForm.custom[field.name] || '';

                  return (
                    <div key={field.id}>
                      <label className="text-[10px] text-slate-400 block mb-0.5">{field.name}</label>
                      
                      {/* 1. Si el tipo es SELECT / Desplegable */}
                      {fieldType === 'select' ? (
                        <select
                          value={value}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              custom: { ...editForm.custom, [field.name]: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500"
                        >
                          <option value="">-- Seleccionar --</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        /* 2. Para el resto de tipos (text, number, boolean) */
                        <input
                          type={fieldType === 'number' ? 'number' : 'text'}
                          value={value}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              custom: { ...editForm.custom, [field.name]: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-purple-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
          >
            Confirmar y Guardar Metadatos
          </button>
        </div>
      </div>
    </div>
  );
};