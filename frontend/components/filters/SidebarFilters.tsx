'use client';

import React from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

interface Collection {
  id: string;
  name: string;
  document_count: number;
}

interface SidebarFiltersProps {
  collections: Collection[];
  selectedCollectionId: string | null;
  totalGlobalDocuments: number;
  onSelectCollection: (id: string | null) => void;
  onOpenNewCollectionModal: () => void;
  onOpenConfigModal: () => void;
}

export const SidebarFilters: React.FC<SidebarFiltersProps> = ({
  collections,
  selectedCollectionId,
  totalGlobalDocuments,
  onSelectCollection,
  onOpenNewCollectionModal,
  onOpenConfigModal,
}) => {
  const C = APP_TEXTS.common;
  const S = APP_TEXTS.sidebar;

  return (
    <aside className="w-60 bg-[#0d1322] border-r border-slate-800/80 p-5 flex flex-col justify-between shrink-0">
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            {C.appName}
          </h1>
          <p className="text-[11px] text-slate-500">{C.subtitle}</p>
        </div>

        <nav className="space-y-4">
          <button
            onClick={() => onSelectCollection(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex justify-between items-center transition-all ${
              selectedCollectionId === null
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <span>{S.allDocumentsIcon} {C.allDocuments}</span>
            <span className="text-[10px] bg-slate-800/80 px-2 py-0.5 rounded-full text-slate-400">
              {totalGlobalDocuments}
            </span>
          </button>

          <div className="pt-3 border-t border-slate-800/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{S.collectionsTitle}</span>
              <button
                onClick={onOpenNewCollectionModal}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold"
              >
                {S.newCollectionBtn}
              </button>
            </div>

            <div className="space-y-1">
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => onSelectCollection(col.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex justify-between items-center transition-all ${
                    selectedCollectionId === col.id
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : 'text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate">{S.collectionIcon} {col.name}</span>
                  <span className="text-[10px] bg-slate-800/60 text-slate-500 px-2 py-0.5 rounded-full">
                    {col.document_count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-800/60">
        <button
          onClick={onOpenConfigModal}
          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800/50 flex items-center gap-2"
        >
          {S.customFieldsBtn}
        </button>
      </div>
    </aside>
  );
};