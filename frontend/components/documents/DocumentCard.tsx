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
    <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition-all shadow-md">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">{T.fileIcon}</span>
          <h4 className="text-xs font-bold text-slate-100 truncate">{title}</h4>
          {item.isConfirmed && (
            <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
              {T.confirmedBadge}
            </span>
          )}
        </div>

        {composer && <p className="text-xs text-slate-400 font-medium">{T.composerLabel} {composer}</p>}

        {customEntries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {customEntries.map(([key, value]) => (
              <span
                key={key}
                className="text-[10px] bg-purple-950/40 text-purple-300 px-2 py-0.5 rounded border border-purple-500/25 font-medium"
              >
                <strong className="font-semibold capitalize">{key}:</strong> {String(value)}
              </span>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag, idx) => (
              <span key={idx} className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded-full border border-slate-800">
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
            className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 text-xs rounded-lg transition-colors flex items-center gap-1 font-semibold"
            title={T.removeFromCollectionTooltip}
          >
            {T.removeFromCollectionBtn}
          </button>
        )}
        {item.backendId && (
          <button
            onClick={() => onViewPdf(item.backendId!, title)}
            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
            title={T.viewPdfTooltip}
          >
            {T.viewPdfIcon} {T.viewPdfBtn}
          </button>
        )}

        <button
          onClick={() => onEdit(item)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
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
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none hover:border-slate-700"
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