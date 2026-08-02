'use client';

import React, { useEffect, useState } from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

export interface Collection {
  id: string;
  name: string;
  document_count?: number;
}

type ThemeMode = 'light' | 'dark' | 'system';

interface SidebarProps {
  totalGlobalDocuments: number;
  selectedCollectionId: string | null;
  setSelectedCollectionId: (id: string | null) => void;
  collections: Collection[];
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onOpenNewCollectionModal: () => void;
  onOpenConfigModal: () => void;
  onDeleteCollection?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  totalGlobalDocuments,
  selectedCollectionId,
  setSelectedCollectionId,
  collections,
  themeMode,
  onThemeModeChange,
  onOpenNewCollectionModal,
  onOpenConfigModal,
  onDeleteCollection,
}) => {
  const TT = APP_TEXTS.theme;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside className="w-60 bg-[var(--sidebar-bg)] border-r border-[color:var(--border-color)] p-5 flex flex-col justify-between shrink-0 transition-colors duration-200">
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            {APP_TEXTS.common.appName}
          </h1>
          <p className="text-[11px] text-[color:var(--text-muted)]">{APP_TEXTS.common.subtitle}</p>
        </div>

        <div className="mb-4 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-muted)]">
            {TT.label}
          </span>
          <div className="theme-segment grid grid-cols-3 gap-1 rounded-xl p-1">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                data-active={mounted && themeMode === mode}
                onClick={() => onThemeModeChange(mode)}
                className="rounded-lg px-2 py-1.5 text-[11px] font-semibold"
              >
                {TT[mode]}
              </button>
            ))}
          </div>
        </div>

        <nav className="space-y-4">
          <button
            onClick={() => setSelectedCollectionId(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex justify-between items-center transition-all ${
              selectedCollectionId === null
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'text-[color:var(--text-muted)] hover:bg-[var(--panel-hover)] hover:text-[color:var(--text-secondary)]'
            }`}
          >
            <span>{APP_TEXTS.sidebar.allDocumentsIcon} {APP_TEXTS.common.allDocuments}</span>
            <span className="text-[10px] bg-[var(--panel-bg)] border border-[color:var(--border-color)] px-2 py-0.5 rounded-full text-[color:var(--text-muted)]">
              {totalGlobalDocuments}
            </span>
          </button>

          <div className="pt-3 border-t border-[color:var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider">
                {APP_TEXTS.sidebar.collectionsTitle}
              </span>
              <button
                onClick={onOpenNewCollectionModal}
                className="text-[11px] text-emerald-500 hover:text-emerald-400 font-bold"
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
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'text-[color:var(--text-muted)] hover:bg-[var(--panel-hover)] hover:text-[color:var(--text-secondary)]'
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
                        className="opacity-0 group-hover:opacity-100 text-[color:var(--text-subtle)] hover:text-[color:var(--danger)] p-0.5 transition-all text-xs"
                        title={APP_TEXTS.sidebar.deleteCollectionTooltip}
                      >
                        {APP_TEXTS.sidebar.deleteIcon}
                      </button>
                    )}

                    <span className="text-[10px] bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-[color:var(--text-muted)] px-2 py-0.5 rounded-full">
                      {col.document_count ?? 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </nav>
      </div>

      <div className="pt-4 border-t border-[color:var(--border-color)]">
        <button
          onClick={onOpenConfigModal}
          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[color:var(--text-muted)] hover:bg-[var(--panel-hover)] hover:text-[color:var(--text-secondary)] flex items-center gap-2"
        >
          {APP_TEXTS.sidebar.customFieldsBtn}
        </button>
      </div>
    </aside>
  );
};
