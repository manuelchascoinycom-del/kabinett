// components/Sidebar.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { APP_TEXTS } from '@/app/constants/texts';
import { useAuth } from '@/context/AuthContext';
import { HasRole } from '@/components/auth/HasRole';
import { CollectionTreeItem } from './CollectionTreeItem'; // Ajusta la ruta según dónde lo hayas guardado
import { Collection } from '@/services/collectionService'; // O ajusta la ruta relativa según corresponda

type ThemeMode = 'light' | 'dark' | 'system';

interface SidebarProps {
  totalGlobalDocuments: number;
  totalGlobalCount: number;
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

export const Sidebar: React.FC<SidebarProps> = ({
  totalGlobalDocuments,
  totalGlobalCount,
  selectedCollectionId,
  setSelectedCollectionId,
  collections,
  themeMode,
  onThemeModeChange,
  onOpenNewCollectionModal,
  onOpenConfigModal,
  onDeleteCollection,
}) => {
  // Función recursiva para ordenar colecciones alfabéticamente
  const sortCollections = (cols: Collection[]): Collection[] => {
    return [...cols]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((col) => ({
        ...col,
        children: col.children ? sortCollections(col.children) : undefined,
      }));
  };

  const sortedCollections = React.useMemo(() => sortCollections(collections), [collections]);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const TT = APP_TEXTS.theme;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 180) newWidth = 180;
      if (newWidth > 500) newWidth = 500;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const [mounted, setMounted] = useState(false);
  const { userRole, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 180) newWidth = 180;
      if (newWidth > 500) newWidth = 500;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <aside
      className="h-screen sticky top-0 bg-[var(--sidebar-bg)] border-r border-[color:var(--border-color)] p-5 flex flex-col shrink-0 transition-colors duration-200 relative"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-emerald-500/30 transition-colors"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      />
      
      {/* 1. SECCIÓN SUPERIOR FIJA (Título y Todos los documentos) */}
      <div className="shrink-0 space-y-6 pb-4">
        <div>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            {APP_TEXTS.common.appName}
          </h1>
          <p className="text-[11px] text-[color:var(--text-muted)]">{APP_TEXTS.common.subtitle}</p>
        </div>

        <button
          onClick={() => setSelectedCollectionId(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex justify-between items-center transition-all ${
            selectedCollectionId === null
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : 'text-[color:var(--text-muted)] hover:bg-[var(--panel-hover)] hover:text-[color:var(--text-secondary)]'
          }`}
        >
          <span className="truncate pr-2">{APP_TEXTS.sidebar.allDocumentsIcon} {APP_TEXTS.common.allDocuments}</span>
          <span className="shrink-0 text-[10px] bg-[var(--panel-bg)] border border-[color:var(--border-color)] px-2 py-0.5 rounded-full text-[color:var(--text-muted)]">
            {totalGlobalCount}
          </span>
        </button>
      </div>

      {/* 2. ZONA CENTRAL CON SCROLL (Solo para las colecciones) */}
      {/* Añadimos overflow-x-hidden para matar el scroll horizontal directamente en el contenedor */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar border-t border-[color:var(--border-color)] pt-4 pb-2">
        <div className="flex items-center justify-between mb-2 pr-2">
          <span className="text-[11px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider shrink-0">
            {APP_TEXTS.sidebar.collectionsTitle}
          </span>
          
          <HasRole canEdit>
            <button
              onClick={() => onOpenNewCollectionModal(undefined)}
              className="text-[11px] text-emerald-500 hover:text-emerald-400 font-bold shrink-0"
            >
              {APP_TEXTS.sidebar.newCollectionBtn}
            </button>
          </HasRole>
        </div>

        <div className="space-y-1 pr-1">
          {sortedCollections.map((col) => (
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

      {/* 3. SECCIÓN INFERIOR FIJA */}
      <div className="pt-4 mt-2 border-t border-[color:var(--border-color)] space-y-2 shrink-0 bg-[var(--sidebar-bg)]">
        
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

        <div className="pt-2 pb-1 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)] block px-1">
            {TT.label}
          </span>
          <div className="theme-segment grid grid-cols-3 gap-1 rounded-xl p-1">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                data-active={mounted && themeMode === mode}
                onClick={() => onThemeModeChange(mode)}
                className="rounded-lg px-1.5 py-1 text-[10px] font-semibold"
              >
                {TT[mode]}
              </button>
            ))}
          </div>
        </div>
        
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
}