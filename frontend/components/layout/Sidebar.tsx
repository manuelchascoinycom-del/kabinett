'use client';

import React from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

export interface Collection {
  id: string;
  name: string;
  document_count?: number;
}

interface SidebarProps {
  totalGlobalDocuments: number;
  selectedCollectionId: string | null;
  setSelectedCollectionId: (id: string | null) => void;
  collections: Collection[];
  onOpenNewCollectionModal: () => void;
  onOpenConfigModal: () => void;
  onDeleteCollection?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  totalGlobalDocuments,
  selectedCollectionId,
  setSelectedCollectionId,
  collections,
  onOpenNewCollectionModal,
  onOpenConfigModal,
  onDeleteCollection,
}) => {
  return (
    <aside className="w-60 bg-[#0d1322] border-r border-slate-800/80 p-5 flex flex-col justify-between shrink-0">
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            {APP_TEXTS.common.appName}
          </h1>
          <p className="text-[11px] text-slate-500">{APP_TEXTS.common.subtitle}</p>
        </div>

        <nav className="space-y-4">
          <button
            onClick={() => setSelectedCollectionId(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex justify-between items-center transition-all ${
              selectedCollectionId === null
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <span>{APP_TEXTS.sidebar.allDocumentsIcon} {APP_TEXTS.common.allDocuments}</span>
            <span className="text-[10px] bg-slate-800/80 px-2 py-0.5 rounded-full text-slate-400">
              {totalGlobalDocuments}
            </span>
          </button>

          <div className="pt-3 border-t border-slate-800/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {APP_TEXTS.sidebar.collectionsTitle}
              </span>
              <button
                onClick={onOpenNewCollectionModal}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold"
              >
                {APP_TEXTS.sidebar.newCollectionBtn}
              </button>
            </div>

            <div className="space-y-1">
              {collections.map((col) => (
                <div
                  key={col.id}
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`group w-full px-3 py-1.5 rounded-lg text-xs font-medium flex justify-between items-center cursor-pointer transition-all ${
                    selectedCollectionId === col.id
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : 'text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate pr-1">{APP_TEXTS.sidebar.collectionIcon} {col.name}</span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onDeleteCollection && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCollection(col.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-0.5 transition-all text-xs"
                        title={APP_TEXTS.sidebar.deleteCollectionTooltip}
                      >
                        {APP_TEXTS.sidebar.deleteIcon}
                      </button>
                    )}

                    <span className="text-[10px] bg-slate-800/60 text-slate-500 px-2 py-0.5 rounded-full">
                      {col.document_count ?? 0}
                    </span>
                  </div>
                </div>
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
          {APP_TEXTS.sidebar.customFieldsBtn}
        </button>
      </div>
    </aside>
  );
};