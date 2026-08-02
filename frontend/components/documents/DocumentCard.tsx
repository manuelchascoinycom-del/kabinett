'use client';

import React from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

interface DocumentCardProps {
  item: {
    id: string;
    backendId?: string;
    file: { name: string; size: number };
    suggestedMetadata?: { title: string; composer: string; tags: string[] };
    confirmedMetadata?: { title: string; composer: string; tags: string[] };
    customMetadata?: Record<string, any>;
    isConfirmed?: boolean;
  };
  collections: Array<{ id: string; name: string }>;
  selectedCollectionId?: string | null;
  onRemoveFromCollection?: (docId: string, collectionId: string) => void;
  onEdit: (item: any) => void;
  onViewPdf: (backendId: string, title: string) => void;
  onAssignCollection: (backendId: string, collectionId: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  item,
  collections,
  selectedCollectionId,
  onRemoveFromCollection,
  onEdit,
  onViewPdf,
  onAssignCollection,
}) => {
  const title = item.confirmedMetadata?.title || item.suggestedMetadata?.title || item.file.name;
  const composer = item.confirmedMetadata?.composer || item.suggestedMetadata?.composer;
  const tags = item.confirmedMetadata?.tags || item.suggestedMetadata?.tags || [];

  const customEntries = item.customMetadata
    ? Object.entries(item.customMetadata).filter(([_, val]) => val !== null && val !== undefined && val !== '')
    : [];

  const T = APP_TEXTS.documentCard;

  return (
    <div className="bg-[var(--panel-bg)] border border-[color:var(--border-color)] rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-[color:var(--border-hover)] hover:bg-[var(--panel-hover)] transition-all shadow-md">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">{T.fileIcon}</span>
          <h4 className="text-xs font-bold text-[color:var(--text-strong)] truncate">{title}</h4>
          {item.isConfirmed && (
            <span className="text-[10px] bg-[var(--accent-surface)] text-[color:var(--accent)] px-2 py-0.5 rounded border border-[color:var(--accent-border)]">
              {T.confirmedBadge}
            </span>
          )}
        </div>

        {composer && <p className="text-xs text-[color:var(--text-muted)] font-medium">{T.composerLabel} {composer}</p>}

        {customEntries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {customEntries.map(([key, value]) => (
              <span
                key={key}
                className="text-[10px] bg-[var(--tag-bg)] text-[color:var(--tag-text)] px-2 py-0.5 rounded border border-[color:var(--tag-border)] font-medium"
              >
                <strong className="font-semibold capitalize">{key}:</strong> {String(value)}
              </span>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag, idx) => (
              <span key={idx} className="text-[10px] bg-[var(--panel-bg-muted)] text-[color:var(--text-secondary)] px-2 py-0.5 rounded-full border border-[color:var(--border-color)]">
                {APP_TEXTS.tagInput.tagPrefix}{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
        {selectedCollectionId && onRemoveFromCollection && (
          <button
            type="button"
            onClick={() => onRemoveFromCollection(item.id, selectedCollectionId)}
            className="px-2.5 py-1.5 bg-[var(--danger-soft)] hover:bg-[var(--danger-surface)] text-[color:var(--danger)] border border-[color:var(--danger-border)] text-xs rounded-lg transition-colors flex items-center gap-1 font-semibold"
            title={T.removeFromCollectionTooltip}
          >
            {T.removeFromCollectionBtn}
          </button>
        )}
        {item.backendId && (
          <button
            onClick={() => onViewPdf(item.backendId!, title)}
            className="px-3 py-1.5 bg-[var(--accent-soft)] hover:bg-[var(--accent-surface)] text-[color:var(--accent)] border border-[color:var(--accent-border)] text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
            title={T.viewPdfTooltip}
          >
            {T.viewPdfIcon} {T.viewPdfBtn}
          </button>
        )}

        <button
          onClick={() => onEdit(item)}
          className="px-3 py-1.5 bg-[var(--panel-bg-muted)] hover:bg-[var(--panel-hover)] text-[color:var(--text-secondary)] text-xs font-medium rounded-lg transition-colors border border-[color:var(--border-color)]"
        >
          {T.editBtn}
        </button>

        {collections.length > 0 && item.backendId && (
          <select
            onChange={(e) => {
              if (e.target.value) {
                onAssignCollection(item.backendId!, e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="bg-[var(--input-bg)] border border-[color:var(--border-color)] text-[color:var(--text-secondary)] text-xs rounded-lg px-2 py-1.5 outline-none hover:border-[color:var(--border-hover)]"
          >
            <option value="" disabled>{T.moveToOption}</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};
