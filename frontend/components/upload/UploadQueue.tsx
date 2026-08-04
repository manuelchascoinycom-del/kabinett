// components/upload/UploadQueue.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { TagInput } from '@/components/ui/TagInput';
import { APP_TEXTS } from '@/app/constants/texts';
import { HasRole } from '@/components/auth/HasRole';

interface Metadata {
  title: string;
  composer: string;
  tags: string[];
}

interface CustomField {
  id: string;
  name: string;
  type?: string;
  field_type?: string;
  options?: string[];
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  backendId?: string;
  suggestedMetadata?: Metadata;
  customMetadata?: Record<string, any>;
}

interface UploadQueueProps {
  items: UploadItem[];
  globalTags?: string[];
  customFields?: CustomField[];
  onStartUpload: () => void;
  onUploadSingleItem: (item: UploadItem) => void;
  onRemoveItem: (id: string) => void;
  onConfirmItem: (
    backendId: string,
    metadata: Metadata,
    customMetadata: Record<string, any>,
    queueId: string
  ) => void;
}

const UploadQueueItem: React.FC<{
  item: UploadItem;
  globalTags?: string[];
  customFields?: CustomField[];
  onUploadSingleItem: (item: UploadItem) => void;
  onRemoveItem: (id: string) => void;
  onConfirmItem: (
    backendId: string,
    metadata: Metadata,
    customMetadata: Record<string, any>,
    queueId: string
  ) => void;
}> = ({ item, globalTags = [], customFields = [], onUploadSingleItem, onRemoveItem, onConfirmItem }) => {
  const [title, setTitle] = useState(item.suggestedMetadata?.title || item.file.name);
  const [composer, setComposer] = useState(item.suggestedMetadata?.composer || '');
  const [tags, setTags] = useState<string[]>(item.suggestedMetadata?.tags || []);
  const [customMetadata, setCustomMetadata] = useState<Record<string, any>>(
    item.customMetadata || {}
  );

  useEffect(() => {
    if (item.suggestedMetadata) {
      if (item.suggestedMetadata.title) setTitle(item.suggestedMetadata.title);
      if (item.suggestedMetadata.composer) setComposer(item.suggestedMetadata.composer);
      if (item.suggestedMetadata.tags) setTags(item.suggestedMetadata.tags);
    }
    if (item.customMetadata) {
      setCustomMetadata(item.customMetadata);
    }
  }, [item.suggestedMetadata, item.customMetadata]);

  const handleCustomFieldChange = (fieldName: string, value: string) => {
    setCustomMetadata((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleConfirm = () => {
    if (!item.backendId) {
      console.error(APP_TEXTS.common.confirmBackendIdError);
      return;
    }
    onConfirmItem(item.backendId, { title, composer, tags }, customMetadata, item.id);
  };

  const T = APP_TEXTS.upload.queue;
  const M = T.metadataReview;
  const E = T.error;

  return (
    <div className="bg-[var(--panel-bg-muted)] border border-[color:var(--border-color)] rounded-xl p-3.5 space-y-3 shadow-md">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate max-w-[60%]">
          <span className="text-[color:var(--text-muted)]">{T.fileIcon}</span>
          <span className="text-[color:var(--text-primary)] truncate font-semibold">{item.file.name}</span>
        </div>

        <div className="flex items-center gap-2">
          {item.status === 'pending' && <span className="text-[11px] text-[color:var(--text-muted)]">{T.pendingStatus}</span>}
          {item.status === 'uploading' && (
            <div className="flex items-center gap-2">
              <div className="w-16 bg-[var(--panel-hover)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">{item.progress}%</span>
            </div>
          )}

          {item.status === 'pending' && (
            <HasRole allowedRoles={['Editor', 'Admin']}>
              <button
                onClick={() => onUploadSingleItem(item)}
                className="px-2.5 py-1 bg-[var(--panel-bg)] hover:bg-[var(--panel-hover)] text-[color:var(--accent)] border border-[color:var(--accent-border)] text-[11px] font-semibold rounded-md transition-colors"
              >
                {T.uploadSingleIcon} {T.uploadSingleBtn}
              </button>
            </HasRole>
          )}

          <button
            onClick={() => onRemoveItem(item.id)}
            className="text-[color:var(--text-subtle)] hover:text-[color:var(--danger)] font-bold px-1 transition-colors"
            title={T.discardTooltip}
          >
            {APP_TEXTS.common.closeIcon}
          </button>
        </div>
      </div>

      {item.status === 'error' && (
        <div className="pt-2 border-t border-[color:var(--danger-border)]">
          <div className="p-3 bg-[var(--danger-surface)] border border-[color:var(--danger-border)] rounded-lg flex items-start justify-between gap-2">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[color:var(--danger)] flex items-center gap-1.5">
                {E.icon} {E.title}
              </span>
              <p className="text-[11px] text-[color:var(--text-secondary)] leading-relaxed">
                {item.errorMessage || E.defaultMessage}
              </p>
            </div>
            <button
              onClick={() => onRemoveItem(item.id)}
              className="px-2.5 py-1 bg-[var(--danger-soft)] hover:bg-[var(--danger-surface)] text-[color:var(--danger)] text-[10px] font-medium rounded transition-colors whitespace-nowrap border border-[color:var(--danger-border)]"
            >
              {E.discardBtn}
            </button>
          </div>
        </div>
      )}

      {item.status === 'success' && item.backendId && (
        <HasRole allowedRoles={['Editor', 'Admin']}>
          <div className="pt-2 border-t border-[color:var(--border-color)] space-y-2.5 bg-[var(--panel-bg)] p-3 rounded-lg border border-[color:var(--accent-border)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[color:var(--accent)] flex items-center gap-1">
                {M.icon} {M.title}
              </span>
              <span className="text-[10px] text-[color:var(--text-muted)] italic">{M.hint}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[color:var(--text-muted)] font-medium block mb-1">{M.titleLabel}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={M.titlePlaceholder}
                  className="app-input w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] text-xs rounded px-2.5 py-1.5 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-[color:var(--text-muted)] font-medium block mb-1">{M.composerLabel}</label>
                <input
                  type="text"
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder={M.composerPlaceholder}
                  className="app-input w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] text-xs rounded px-2.5 py-1.5 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[color:var(--text-muted)] font-medium block mb-1">{M.tagsLabel}</label>
              <TagInput tags={tags} allTags={globalTags} onChange={setTags} />
            </div>

            {customFields.length > 0 && (
              <div className="pt-2 border-t border-[color:var(--border-color)]">
                <span className="text-[10px] font-bold text-[color:var(--text-muted)] block mb-2">{M.customFieldsLabel}</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {customFields.map((field) => {
                    const fieldType = field.field_type || field.type;
                    const value = customMetadata[field.name] || '';

                    return (
                      <div key={field.id}>
                        <label className="text-[10px] text-[color:var(--text-muted)] font-medium block mb-1">
                          {field.name}
                        </label>

                        {fieldType === 'select' ? (
                          <select
                            value={value}
                            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                            className="w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] text-xs rounded px-2.5 py-1.5 outline-none focus:border-emerald-500"
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
                            onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                            placeholder={APP_TEXTS.common.customFieldExample.replace('{fieldName}', field.name)}
                            className="app-input w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] text-xs rounded px-2.5 py-1.5 outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={handleConfirm}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow"
              >
                {M.confirmBtn}
              </button>
            </div>
          </div>
        </HasRole>
      )}
    </div>
  );
};

export const UploadQueue: React.FC<UploadQueueProps> = ({
  items,
  globalTags = [],
  customFields = [],
  onStartUpload,
  onUploadSingleItem,
  onRemoveItem,
  onConfirmItem,
}) => {
  if (items.length === 0) return null;

  const T = APP_TEXTS.upload.queue;

  return (
    <div className="bg-[var(--panel-bg)] border border-[color:var(--accent-border)] rounded-xl p-4 mb-6 shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-bold text-[color:var(--accent)] flex items-center gap-2">
          <span>{T.containerIcon}</span> {T.containerTitle.replace('{count}', String(items.length))}
        </h4>
        {items.some((i) => i.status === 'pending') && (
          <HasRole allowedRoles={['Editor', 'Admin']}>
            <button
              onClick={onStartUpload}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-md"
            >
              {T.uploadAllIcon} {APP_TEXTS.common.uploadAll}
            </button>
          </HasRole>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <UploadQueueItem
            key={item.id}
            item={item}
            globalTags={globalTags}
            customFields={customFields}
            onUploadSingleItem={onUploadSingleItem}
            onRemoveItem={onRemoveItem}
            onConfirmItem={onConfirmItem}
          />
        ))}
      </div>
    </div>
  );
};