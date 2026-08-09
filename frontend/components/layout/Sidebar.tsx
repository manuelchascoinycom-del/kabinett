// components/Sidebar.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { APP_TEXTS } from '@/app/constants/texts';
import { useAuth } from '@/context/AuthContext';
import { HasRole } from '@/components/auth/HasRole';

export interface Collection {
  id: string;
  name: string;
  document_count?: number;
  children?: Collection[];
}

type ThemeMode = 'light' | 'dark' | 'system';

interface SidebarProps {
  totalGlobalDocuments: number;
  selectedCollectionId: string | null;
  setSelectedCollectionId: (id: string | null) => void;
  collections: Collection[];
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  // Actualizado: ahora acepta opcionalmente el ID del padre
  onOpenNewCollectionModal: (parentId?: string) => void; 
  onOpenConfigModal: () => void;
  onDeleteCollection?: (id: string) => void;
}

// Subcomponente recursivo interno para las colecciones y subcolecciones
interface CollectionTreeItemProps {
  collection: Collection;
  selectedCollectionId: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddSubcollection?: (parentId: string) => void; // NUEVO
  depth?: number;
}

const CollectionTreeItem: React.FC<CollectionTreeItemProps> = ({
  collection,
  selectedCollectionId,
  onSelect,
  onDelete,
  onAddSubcollection,
  depth = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedCollectionId === collection.id;
  const hasChildren = collection.children && collection.children.length > 0;

  return (
    <div className="w-full">
      <div
        onClick={() => onSelect(collection.id)}
        className={`group w-full px-3 py-1.5 rounded-lg text-xs font-medium flex justify-between items-center cursor-pointer transition-all ${
          isSelected
            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            : 'text-[color:var(--text-muted)] hover:bg-[var(--panel-hover)] hover:text-[color:var(--text-secondary)]'
        }`}
        style={{ paddingLeft: `${(depth * 12) + 12}px` }}
      >
        <div className="flex items-center gap-1.5 truncate pr-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] focus:outline-none w-4 text-center transition-transform"
            >
              {isOpen ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <span className="truncate">
            {APP_TEXTS.sidebar.collectionIcon} {collection.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* NUEVO: Botón para añadir subcolección */}
          {onAddSubcollection && (
            <HasRole canEdit>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Forzamos a que se abra el desplegable para que el usuario vea la nueva colección al crearla
                  setIsOpen(true);
                  onAddSubcollection(collection.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-[color:var(--text-subtle)] hover:text-emerald-500 p-0.5 transition-all text-lg leading-none flex items-center justify-center"
                title="Añadir subcolección"
              >
                +
              </button>
            </HasRole>
          )}

          {onDelete && (
            <HasRole canDelete>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(collection.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-[color:var(--text-subtle)] hover:text-[color:var(--danger)] p-0.5 transition-all text-xs"
                title={APP_TEXTS.sidebar.deleteCollectionTooltip}
              >
                {APP_TEXTS.sidebar.deleteIcon}
              </button>
            </HasRole>
          )}

          <span className="text-[10px] bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-[color:var(--text-muted)] px-2 py-0.5 rounded-full">
            {collection.document_count ?? 0}
          </span>
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className="space-y-1 mt-1">
          {collection.children?.map((child) => (
            <CollectionTreeItem
              key={child.id}
              collection={child}
              selectedCollectionId={selectedCollectionId}
              onSelect={onSelect}
              onDelete={onDelete}
              onAddSubcollection={onAddSubcollection}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

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
  const { userRole, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside className="w-60 h-screen sticky top-0 bg-[var(--sidebar-bg)] border-r border-[color:var(--border-color)] p-5 flex flex-col justify-between shrink-0 transition-colors duration-200">
      
      {/* ZONA CENTRAL CON SCROLL */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
        <div>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            {APP_TEXTS.common.appName}
          </h1>
          <p className="text-[11px] text-[color:var(--text-muted)]">{APP_TEXTS.common.subtitle}</p>
        </div>

        <div className="space-y-2">
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
              
              {/* Solo usuarios con permiso de edición (Editor y Admin) ven la acción de nueva colección (Raíz) */}
              <HasRole canEdit>
                <button
                  onClick={() => onOpenNewCollectionModal(undefined)}
                  className="text-[11px] text-emerald-500 hover:text-emerald-400 font-bold"
                >
                  {APP_TEXTS.sidebar.newCollectionBtn}
                </button>
              </HasRole>
            </div>

            <div className="space-y-1">
              {collections.map((col) => (
                <CollectionTreeItem
                  key={col.id}
                  collection={col}
                  selectedCollectionId={selectedCollectionId}
                  onSelect={setSelectedCollectionId}
                  onDelete={onDeleteCollection}
                  onAddSubcollection={(parentId) => onOpenNewCollectionModal(parentId)}
                />
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* SECCIÓN INFERIOR FIJA */}
      <div className="pt-4 mt-4 border-t border-[color:var(--border-color)] space-y-2 shrink-0 bg-[var(--sidebar-bg)]">
        
        {/* Enlace al Perfil de Usuario */}
        <Link
          href="/profile"
          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[color:var(--text-muted)] hover:bg-[var(--panel-hover)] hover:text-[color:var(--text-secondary)] flex items-center gap-2 transition-colors"
        >
          <span>{APP_TEXTS.sidebar.profile.myProfileIcon}</span>
          <span>{APP_TEXTS.sidebar.profile.myProfileBtn}</span>
        </Link>

        {/* Solo el Administrador puede ver la Gestión de Usuarios */}
        <HasRole canDelete>
          <Link
            href="/admin/users"
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[color:var(--text-muted)] hover:bg-[var(--panel-hover)] hover:text-[color:var(--text-secondary)] flex items-center gap-2 transition-colors"
          >
            <span>{APP_TEXTS.sidebar.userManagementBtn}</span>
          </Link>
        </HasRole>

        {/* Solo usuarios con permiso de edición (Editor y Admin) pueden acceder a Campos Personalizados */}
        <HasRole canEdit>
          <button
            onClick={onOpenConfigModal}
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[color:var(--text-muted)] hover:bg-[var(--panel-hover)] hover:text-[color:var(--text-secondary)] flex items-center gap-2"
          >
            {APP_TEXTS.sidebar.customFieldsBtn}
          </button>
        </HasRole>
        
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[color:var(--border-color)]">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-[color:var(--text-muted)]">
              {APP_TEXTS.sidebar.profile.currentRoleLabel}
            </span>
            <span className="text-xs font-semibold text-emerald-500 capitalize">
              {userRole || APP_TEXTS.sidebar.profile.unknownRole}
            </span>
          </div>
          <button
            onClick={logout}
            className="text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--danger)] transition-colors"
            title={APP_TEXTS.sidebar.profile.logoutTitle}
          >
            {APP_TEXTS.sidebar.profile.logoutBtn} {APP_TEXTS.sidebar.profile.logoutIcon}
          </button>
        </div>
      </div>
    </aside>
  );
};