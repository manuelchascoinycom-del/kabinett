'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import dynamic from 'next/dynamic';

import { TagInput } from '@/components/ui/TagInput';
import { UploadQueue } from '@/components/upload/UploadQueue';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { FacetedFilters } from '@/components/filters/FacetedFilters';
import { EditMetadataModal } from '@/components/modals/EditMetadataModal';
import { CreateCollectionModal } from '@/components/modals/CreateCollectionModal';
import { CustomFieldsModal } from '@/components/modals/CustomFieldsModal';
import { Sidebar } from '@/components/layout/Sidebar';
import { SearchBar } from '@/components/documents/SearchBar';
import { Dropzone } from '@/components/upload/Dropzone';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { HasRole } from '@/components/auth/HasRole';

import { collectionService } from '@/services/collectionService';
import { documentService, BackendDocument } from '@/services/documentService';
import { customFieldsService } from '@/services/customFieldsService';
import { tagService } from '@/services/tagService';
import { APP_TEXTS } from '@/app/constants/texts';
import { useAuth } from '@/context/AuthContext';

const PDFViewer = dynamic(() => import('@/components/documents/PDFViewer'), {
  ssr: false,
});

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'kabinett-theme-mode';

function applyThemeMode(mode: ThemeMode) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const resolvedTheme = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;

  root.dataset.themeMode = mode;
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}

interface Metadata {
  title: string;
  composer: string;
  tags: string[];
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  document_count: number;
}

interface CustomField {
  id: string;
  name: string;
  field_type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  backendId?: string;
  backendStatus?: string;
  suggestedMetadata?: Metadata;
  confirmedMetadata?: Metadata;
  customMetadata?: Record<string, any>;
  isConfirmed?: boolean;
}

export default function Home() {
  const { userRole } = useAuth();

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof document === 'undefined') return 'system';
    return (document.documentElement.dataset.themeMode as ThemeMode) || 'system';
  });

  // 🟢 ESTADO 1: Cola de Subida Local
  const [uploadQueueItems, setUploadQueueItems] = useState<UploadItem[]>([]);

  // 🔵 ESTADO 2: Documentos en la Biblioteca Raíz
  const [documents, setDocuments] = useState<any[]>([]);

  // Raw global para facetas
  const [rawGlobalDocuments, setRawGlobalDocuments] = useState<UploadItem[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Control de Modal de Edición
  const [editingItem, setEditingItem] = useState<UploadItem | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    composer: string;
    tags: string[];
    custom: Record<string, any>;
  }>({
    title: '',
    composer: '',
    tags: [],
    custom: {},
  });

  // Visor Nativo de PDF
  const [viewingDocument, setViewingDocument] = useState<{ id: string; title: string } | null>(null);

  // Buscador Global
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Estado de Colecciones
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [totalGlobalDocuments, setTotalGlobalDocuments] = useState<number>(0);

  // Campos Personalizados
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'select' | 'boolean'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Etiquetas Globales
  const [globalTags, setGlobalTags] = useState<string[]>([]);

  // Filtros Facetados
  const [selectedComposers, setSelectedComposers] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCustomFilters, setSelectedCustomFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    const root = document.documentElement;
    const initialMode = (root.dataset.themeMode as ThemeMode) || 'system';
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    setThemeMode(initialMode);
    applyThemeMode(initialMode);

    const handleSystemThemeChange = () => {
      const currentMode = (document.documentElement.dataset.themeMode as ThemeMode) || 'system';
      if (currentMode === 'system') {
        applyThemeMode('system');
      }
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleSystemThemeChange);
      return () => media.removeEventListener('change', handleSystemThemeChange);
    }

    media.addListener(handleSystemThemeChange);
    return () => media.removeListener(handleSystemThemeChange);
  }, []);

  const handleThemeModeChange = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    applyThemeMode(mode);
  }, []);

  const fetchCollections = async () => {
    try {
      const data = await collectionService.getAll();
      setCollections(data);
    } catch (e) {
      console.error('Error al cargar colecciones:', e);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const data = await customFieldsService.getAll();
      setCustomFields(data);
    } catch (e) {
      console.error('Error al cargar campos personalizados:', e);
    }
  };

  const fetchGlobalTags = async () => {
    try {
      const data = await tagService.getAll();
      setGlobalTags(data);
    } catch (e) {
      console.error('Error al cargar tags globales:', e);
    }
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditForm({
      title: item.confirmedMetadata?.title || item.suggestedMetadata?.title || item.title || item.file?.name || '',
      composer: item.confirmedMetadata?.composer || item.suggestedMetadata?.composer || item.composer || '',
      tags: item.confirmedMetadata?.tags || item.suggestedMetadata?.tags || item.tags || [],
      custom: item.customMetadata || item.custom || {},
    });
  };

  const fetchDocuments = useCallback(async () => {
    try {
      const globalData = await documentService.getAll();
      setTotalGlobalDocuments(globalData.length);

      const loadedItems: UploadItem[] = globalData.map((doc: BackendDocument) => ({
        id: doc.id,
        backendId: doc.id,
        file: { name: doc.filename, size: 0 } as File,
        progress: 100,
        status: 'success',
        backendStatus: doc.status,
        suggestedMetadata: doc.metadata_suggested
          ? {
              title: doc.metadata_suggested.title || '',
              composer: doc.metadata_suggested.composer || '',
              tags: doc.metadata_suggested.tags || [],
            }
          : undefined,
        confirmedMetadata: doc.metadata_confirmed
          ? {
              title: doc.metadata_confirmed.title || '',
              composer: doc.metadata_confirmed.composer || '',
              tags: doc.metadata_confirmed.tags || [],
            }
          : undefined,
        customMetadata: doc.custom_metadata || {},
        isConfirmed: doc.status === 'ready' || doc.status === 'CONFIRMED',
      }));

      setRawGlobalDocuments(loadedItems);
    } catch (e) {
      console.error('Error al cargar documentos:', e);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
    fetchCustomFields();
    fetchGlobalTags();
    fetchDocuments();
  }, [fetchDocuments]);

  const applyFilters = useCallback(async () => {
    setIsSearching(true);
    try {
      const payload = {
        query: searchQuery,
        collection_id: selectedCollectionId,
        composers: selectedComposers,
        tags: selectedTags,
        custom_filters: selectedCustomFilters,
      };

      const data = await documentService.filter(payload);

      const readyDocs = data
        .filter((doc: any) => doc.status !== 'PENDING_REVIEW')
        .map((doc: any) => ({
          id: doc.id,
          backendId: doc.id,
          filename: doc.filename,
          file: { name: doc.filename, size: 0 } as File,
          title: doc.metadata_confirmed?.title || doc.metadata_suggested?.title || doc.filename,
          composer: doc.metadata_confirmed?.composer || doc.metadata_suggested?.composer || '',
          tags: doc.metadata_confirmed?.tags || doc.metadata_suggested?.tags || [],
          status: doc.status,
          customMetadata: doc.custom_metadata || {},
          confirmedMetadata: doc.metadata_confirmed,
          suggestedMetadata: doc.metadata_suggested,
        }));

      setDocuments(readyDocs);
    } catch (e) {
      console.error('Error al aplicar filtros:', e);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, selectedCollectionId, selectedComposers, selectedTags, selectedCustomFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 250);
    return () => clearTimeout(timer);
  }, [applyFilters]);

  const facets = useMemo(() => {
    const composerCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};

    rawGlobalDocuments.forEach((doc) => {
      const composer = doc.confirmedMetadata?.composer || doc.suggestedMetadata?.composer;
      if (composer) {
        composerCounts[composer] = (composerCounts[composer] || 0) + 1;
      }

      const tags = doc.confirmedMetadata?.tags || doc.suggestedMetadata?.tags || [];
      tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return { composerCounts, tagCounts };
  }, [rawGlobalDocuments]);

  const uploadFileToServer = async (fileItem: UploadItem) => {
    const formData = new FormData();
    formData.append('file', fileItem.file);

    try {
      setUploadQueueItems((prev) =>
        prev.map((item) => (item.id === fileItem.id ? { ...item, status: 'uploading', progress: 30 } : item))
      );

      let data = await documentService.uploadPdf(formData);

      if (data.status === 'processing' || data.status === 'PROCESSING') {
        setUploadQueueItems((prev) =>
          prev.map((item) => (item.id === fileItem.id ? { ...item, progress: 60 } : item))
        );

        let isCompleted = false;
        let attempts = 0;
        const maxAttempts = 15;

        while (!isCompleted && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;

          const statusData = await documentService.getStatus(data.id);
          const currentStatus = (statusData.status || '').toUpperCase();
          if (currentStatus !== 'PROCESSING') {
            data = statusData;
            isCompleted = true;
          }
        }
      }

      const finalBackendStatus = (data.status || '').toUpperCase();

      if (finalBackendStatus === 'ERROR') {
        setUploadQueueItems((prev) =>
          prev.map((item) =>
            item.id === fileItem.id
              ? {
                  ...item,
                  status: 'error',
                  errorMessage: data.error_message || 'Error en el procesamiento del archivo',
                  backendId: data.id,
                }
              : item
          )
        );
        return;
      }

      const uploadedItem: UploadItem = {
        ...fileItem,
        progress: 100,
        status: 'success',
        backendId: data.id,
        backendStatus: data.status,
        suggestedMetadata: data.metadata_suggested
          ? {
              title: data.metadata_suggested.title || '',
              composer: data.metadata_suggested.composer || '',
              tags: data.metadata_suggested.tags || [],
            }
          : undefined,
        confirmedMetadata: data.metadata_confirmed
          ? {
              title: data.metadata_confirmed.title || '',
              composer: data.metadata_confirmed.composer || '',
              tags: data.metadata_confirmed.tags || [],
            }
          : undefined,
        customMetadata: data.custom_metadata || {},
        isConfirmed: false,
      };

      setUploadQueueItems((prev) =>
        prev.map((item) => (item.id === fileItem.id ? uploadedItem : item))
      );
    } catch (err: any) {
      setUploadQueueItems((prev) =>
        prev.map((item) =>
          item.id === fileItem.id
            ? { ...item, status: 'error', errorMessage: err.message || 'Fallo en la carga' }
            : item
        )
      );
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setGlobalError(null);
      const newItems: UploadItem[] = acceptedFiles.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: 'pending',
      }));

      setUploadQueueItems((prev) => [...newItems, ...prev]);
    },
    []
  );

  const handleStartUpload = async () => {
    const pendingItems = uploadQueueItems.filter((item) => item.status === 'pending');
    for (const item of pendingItems) {
      await uploadFileToServer(item);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: () => setGlobalError(APP_TEXTS.home.dropRejectedError),
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    disabled: userRole === 'Viewer',
  });

  const handleConfirmMetadata = async () => {
    if (!editingItem || !editingItem.backendId) return;

    try {
      const payload = {
        title: editForm.title,
        composer: editForm.composer,
        tags: editForm.tags,
        custom_metadata: editForm.custom,
      };

      await documentService.confirmMetadata(editingItem.backendId, payload);

      setEditingItem(null);
      fetchDocuments();
      fetchGlobalTags();
      applyFilters();
    } catch (e) {
      console.error('Error al confirmar metadatos:', e);
    }
  };

  const handleDiscardItem = async (queueId: string) => {
    const itemToRemove = uploadQueueItems.find((item) => item.id === queueId);
    
    if (itemToRemove?.backendId) {
      try {
        await documentService.deleteDocument(itemToRemove.backendId);
      } catch (e) {
        console.error("Error al borrar del servidor:", e);
      }
    }

    setUploadQueueItems((prev) => prev.filter((item) => item.id !== queueId));
  };

  const handleConfirmQueueItem = async (
    backendId: string,
    metadata: Metadata,
    customMetadata: Record<string, any>,
    queueId: string
  ) => {
    try {
      const payload = {
        title: metadata.title,
        composer: metadata.composer,
        tags: metadata.tags,
        custom_metadata: customMetadata,
      };

      await documentService.confirmMetadata(backendId, payload);
      setUploadQueueItems((prev) => prev.filter((item) => item.id !== queueId));
      fetchDocuments(); 
      applyFilters();
    } catch (error) {
      console.error("Error al confirmar metadatos:", error);
    }
  };

  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    try {
      const payload = {
        name: newFieldName,
        field_type: newFieldType,
        options: newFieldType === 'select' ? newFieldOptions.split(',').map((s) => s.trim()) : [],
      };

      await customFieldsService.create(payload);

      setNewFieldName('');
      setNewFieldOptions('');
      setShowConfigModal(false);
      fetchCustomFields();
    } catch (e) {
      console.error('Error al crear campo personalizado:', e);
    }
  };

  const handleDeleteCustomField = async (fieldId: string) => {
    try {
      await customFieldsService.delete(fieldId);
      fetchCustomFields();
    } catch (error) {
      console.error('Error al eliminar campo personalizado:', error);
    }
  };

  const toggleComposer = (composer: string) => {
    setSelectedComposers((prev) =>
      prev.includes(composer) ? prev.filter((c) => c !== composer) : [...prev, composer]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const clearAllFilters = () => {
    setSelectedComposers([]);
    setSelectedTags([]);
    setSelectedCustomFilters({});
    setSearchQuery('');
    setSelectedCollectionId(null);
  };

  const hasActiveFilters =
    selectedComposers.length > 0 ||
    selectedTags.length > 0 ||
    Object.keys(selectedCustomFilters).some((k) => selectedCustomFilters[k]) ||
    searchQuery.trim().length > 0 ||
    selectedCollectionId !== null;

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      await collectionService.create(newCollectionName);
      setNewCollectionName('');
      setShowNewCollectionModal(false);
      fetchCollections();
    } catch (e) {
      console.error('Error al crear colección:', e);
    }
  };

  const handleAssignToCollection = async (backendId: string, collectionId: string) => {
    try {
      await collectionService.addDocument(collectionId, backendId);
      fetchCollections();
      applyFilters();
    } catch (e) {
      console.error('Error al asignar documento:', e);
    }
  };

  const handleRemoveFromCollection = async (docId: string, collectionId: string) => {
    try {
      await collectionService.removeDocument(collectionId, docId);

      if (selectedCollectionId === collectionId) {
        setDocuments((prevDocs) => prevDocs.filter((doc) => doc.id !== docId));
      } else {
        setDocuments((prevDocs) =>
          prevDocs.map((doc) => {
            if (doc.id === docId && doc.collection_ids) {
              return {
                ...doc,
                collection_ids: doc.collection_ids.filter((id) => id !== collectionId),
              };
            }
            return doc;
          })
        );
      }

      fetchCollections();
    } catch (error) {
      console.error('El servidor respondió con un error:', error);
    }
  };

  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);

  const handleDeleteCollectionClick = (collectionId: string) => {
    setCollectionToDelete(collectionId);
  };

  const handleConfirmDeleteCollection = async () => {
    if (!collectionToDelete) return;

    try {
      await collectionService.delete(collectionToDelete);
      fetchCollections();

      if (selectedCollectionId === collectionToDelete) {
        setSelectedCollectionId(null);
      }
    } catch (error) {
      console.error('Error al eliminar colección:', error);
    } finally {
      setCollectionToDelete(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--app-bg)] text-[color:var(--text-primary)] font-sans transition-colors duration-200">
      {/* Sidebar 1: Navegación Principal y Colecciones */}
      <Sidebar
        totalGlobalDocuments={totalGlobalDocuments}
        selectedCollectionId={selectedCollectionId}
        setSelectedCollectionId={setSelectedCollectionId}
        collections={collections}
        themeMode={themeMode}
        onThemeModeChange={handleThemeModeChange}
        onOpenNewCollectionModal={() => setShowNewCollectionModal(true)}
        onOpenConfigModal={() => setShowConfigModal(true)}
        onDeleteCollection={handleDeleteCollectionClick}
      />

      {/* Sidebar 2: Panel Lateral de Filtros Facetados */}
      <FacetedFilters
        facets={facets}
        selectedComposers={selectedComposers}
        selectedTags={selectedTags}
        selectedCustomFilters={selectedCustomFilters}
        customFields={customFields}
        hasActiveFilters={hasActiveFilters}
        onToggleComposer={toggleComposer}
        onToggleTag={toggleTag}
        onChangeCustomFilter={(fieldName, value) =>
          setSelectedCustomFilters({ ...selectedCustomFilters, [fieldName]: value })
        }
        onClearAllFilters={clearAllFilters}
      />

      {/* Panel Principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Barra de Búsqueda Global */}
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSearching={isSearching}
          />

          {/* Zona de Carga (Dropzone) - Solo accesible para Editor y Admin */}
          <HasRole canEdit>
            <Dropzone
              getRootProps={getRootProps}
              getInputProps={getInputProps}
              isDragActive={isDragActive}
            />
          </HasRole>

          {globalError && (
            <div className="mb-4 p-3 bg-[var(--danger-surface)] border border-[color:var(--danger-border)] text-[color:var(--danger)] text-xs rounded-lg">
              {globalError}
            </div>
          )}

          {/* COLA DE SUBIDA LOCAL - Solo accesible para Editor y Admin */}
          <HasRole canEdit>
            <UploadQueue
              items={uploadQueueItems}
              globalTags={globalTags || []} 
              customFields={customFields}
              onStartUpload={handleStartUpload}
              onUploadSingleItem={(item) => uploadFileToServer(item)}
              onRemoveItem={handleDiscardItem}
              onConfirmItem={handleConfirmQueueItem}
            />
          </HasRole>

          {/* SECCIÓN DE DOCUMENTOS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[color:var(--text-strong)]">
              {selectedCollectionId
                ? `${APP_TEXTS.home.collectionTitlePrefix}${collections.find((c) => c.id === selectedCollectionId)?.name || ''}`
                : APP_TEXTS.home.rootLibraryTitle}{' '}
              ({documents.length})
            </h3>

            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                item={doc}
                collections={collections}
                selectedCollectionId={selectedCollectionId}
                onRemoveFromCollection={handleRemoveFromCollection}
                onEdit={openEditModal}
                onViewPdf={(backendId, title) => setViewingDocument({ id: backendId, title })}
                onAssignCollection={handleAssignToCollection}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Modal de Edición / Confirmación de Metadatos */}
      <EditMetadataModal
        isOpen={!!editingItem}
        editingItem={editingItem}
        editForm={editForm}
        globalTags={globalTags}
        customFields={customFields}
        setEditForm={setEditForm}
        onClose={() => setEditingItem(null)}
        onConfirm={handleConfirmMetadata}
      />

      {/* Visor Nativo de PDF */}
      {viewingDocument && (
        <PDFViewer
          documentId={viewingDocument.id}
          title={viewingDocument.title}
          onClose={() => setViewingDocument(null)}
        />
      )}

      {/* Modal Crear Colección */}
      <CreateCollectionModal
        isOpen={showNewCollectionModal}
        newCollectionName={newCollectionName}
        setNewCollectionName={setNewCollectionName}
        onClose={() => setShowNewCollectionModal(false)}
        onSubmit={handleCreateCollection}
      />

      {/* Modal Configurar Campos Personalizados */}
      <CustomFieldsModal
        isOpen={showConfigModal}
        newFieldName={newFieldName}
        setNewFieldName={setNewFieldName}
        newFieldType={newFieldType}
        setNewFieldType={setNewFieldType}
        newFieldOptions={newFieldOptions}
        setNewFieldOptions={setNewFieldOptions}
        customFields={customFields}
        onDeleteField={handleDeleteCustomField}
        onClose={() => setShowConfigModal(false)}
        onSubmit={handleCreateCustomField}
      />

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        isOpen={!!collectionToDelete}
        title={APP_TEXTS.modals.deleteCollection.title}
        message={APP_TEXTS.modals.deleteCollection.message}
        confirmText={APP_TEXTS.modals.deleteCollection.confirmBtn}
        isDanger={true}
        onConfirm={handleConfirmDeleteCollection}
        onClose={() => setCollectionToDelete(null)}
      />
    </div>
  );
}