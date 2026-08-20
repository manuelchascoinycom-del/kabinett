import React from 'react';
import { TagInput } from '@/components/ui/TagInput';
import { APP_TEXTS } from '@/app/constants/texts';

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
    type?: string;
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

  const T = APP_TEXTS.modals.editMetadata;

  return (
    <div className="app-overlay fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="app-modal p-6 rounded-xl w-full max-w-lg space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-[color:var(--border-color)] pb-3">
          <h3 className="text-sm font-bold text-[color:var(--text-strong)] truncate max-w-[320px]">
            {T.titlePrefix} {editForm.title || editingItem.file?.name}
          </h3>
          <button
            onClick={onClose}
            className="text-[color:var(--text-subtle)] hover:text-[color:var(--text-secondary)] text-sm font-bold"
          >
            {APP_TEXTS.common.closeIcon}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-[color:var(--text-muted)] uppercase tracking-wider block mb-1">
              {T.titleLabel}
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="app-input w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-xs text-[color:var(--text-primary)] outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[color:var(--text-muted)] uppercase tracking-wider block mb-1">
              {T.composerLabel}
            </label>
            <input
              type="text"
              value={editForm.composer}
              onChange={(e) => setEditForm({ ...editForm, composer: e.target.value })}
              className="app-input w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-xs text-[color:var(--text-primary)] outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              {T.tagsLabel}
            </label>
            <TagInput
              tags={editForm.tags}
              allTags={globalTags}
              onChange={(newTags) => {
                console.log('Nuevas etiquetas:', newTags);
                setEditForm({ ...editForm, tags: newTags });
              }}
            />
          </div>

          {customFields.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[color:var(--border-color)]">
              <label className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">
                {T.customFieldsLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {customFields.map((field) => {
                  const fieldType = field.field_type || field.type;
                  const value = editForm.custom[field.name] || '';

                  return (
                    <div key={field.id}>
                      <label className="text-[10px] text-[color:var(--text-muted)] block mb-0.5">{field.name}</label>

                      {fieldType === 'select' ? (
                        <select
                          value={value}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              custom: { ...editForm.custom, [field.name]: e.target.value },
                            })
                          }
                          className="w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] rounded px-2.5 py-1.5 text-xs text-[color:var(--text-primary)] outline-none focus:border-purple-500"
                        >
                          <option value="">{APP_TEXTS.common.selectPlaceholder}</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={fieldType === 'number' ? 'number' : 'text'}
                          value={value}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              custom: { ...editForm.custom, [field.name]: e.target.value },
                            })
                          }
                          className="w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] rounded px-2.5 py-1.5 text-xs text-[color:var(--text-primary)] outline-none focus:border-purple-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[color:var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[var(--panel-bg-muted)] text-[color:var(--text-secondary)] text-xs rounded-lg hover:bg-[var(--panel-hover)] border border-[color:var(--border-color)] transition-colors font-medium"
          >
            {T.cancelBtn}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
          >
            {T.confirmBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
