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
import { IngestProgressModal } from '@/components/modals/IngestProgressModal';
import { VersionFooter } from "@/components/layout/VersionFooter/VersionFooter";

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
  children?: Collection[];
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

// Función para obtener la ruta completa (breadcrumb) de la colección seleccionada
const getCollectionPath = (id: string, cols: Collection[]): string[] => {
  for (const col of cols) {
    if (col.id === id) return [col.name];
    if (col.children) {
      const childPath = getCollectionPath(id, col.children);
      if (childPath.length > 0) return [col.name, ...childPath];
    }
  }
  return [];
};

export default function Home() {
  const { userRole } = useAuth();

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof document === 'undefined') return 'system';
    return (document.documentElement.dataset.themeMode as ThemeMode) || 'system';
  });

  const [showIngestModal, setShowIngestModal] = useState(false);
  const [generatingMetadataIds, setGeneratingMetadataIds] = useState<Record<string, boolean>>({});

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [ingestPath, setIngestPath] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(20);

  const [uploadQueueItems, setUploadQueueItems] = useState<UploadItem[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [rawGlobalDocuments, setRawGlobalDocuments] = useState<UploadItem[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

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

  const [viewingDocument, setViewingDocument] = useState<{ id: string; title: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [modalParentId, setModalParentId] = useState<string | undefined>(undefined);
  const [totalGlobalCount, setTotalGlobalCount] = useState<number>(0);
  const [totalGlobalDocuments, setTotalGlobalDocuments] = useState<number>(0);

  // Cargar el total global al montar
  useEffect(() => {
    documentService.getAll(1, 1).then(res => {
      setTotalGlobalCount(res.total);
    }).catch(console.error);
  }, []);

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'select' | 'boolean'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [globalTags, setGlobalTags] = useState<string[]>([]);

  const [selectedComposers, setSelectedComposers] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCustomFilters, setSelectedCustomFilters] = useState<Record<string, string>>({});

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Estado para el Toast flotante global[cite: 1]
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const [sortOption, setSortOption] = useState({ sort_by: 'created_at', order: 'desc' });

  // Calcula el path jerárquico de la colección seleccionada
  const collectionPath = useMemo(() => {
    if (!selectedCollectionId) return [];
    return getCollectionPath(selectedCollectionId, collections);
  }, [selectedCollectionId, collections]);

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

  const handleIngestSuccess = () => {
    setToastMessage(APP_TEXTS.ingestModal.status.completed);
    setShowIngestModal(false);
    setCurrentTaskId(null);
    fetchDocuments();
    fetchCollections();

    // Ocultar el toast automáticamente después de 6 segundos
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

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
      setCustomFields(data as any);
    } catch (e) {
      console.error('Error al cargar campos personalizados:', e);
    }
  };

  const fetchGlobalTags = async () => {
    try {
      const data: any = await tagService.getAll();
      const tagsArray = Array.isArray(data)
        ? data.map((t: any) => (typeof t === 'string' ? t : t.name || ''))
        : [];
      setGlobalTags(tagsArray);
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
      const response: any = await documentService.getAll(1, 100);
      const docsArray = response?.data || [];
      const totalCount = response?.total || docsArray.length;
      setTotalGlobalDocuments(totalCount);
      setTotalGlobalCount(totalCount);

      const loadedItems: UploadItem[] = docsArray.map((doc: BackendDocument) => ({
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
      console.error('Error al cargar documentos globales:', e);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
    fetchCustomFields();
    fetchGlobalTags();
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCollectionId, selectedComposers, selectedTags, selectedCustomFilters]);

  const applyFilters = useCallback(async () => {
    setIsSearching(true);
    try {
      const payload = {
        query: searchQuery,
        search: searchQuery,
        collection_id: selectedCollectionId,
        collection_ids: selectedCollectionId ? [selectedCollectionId] : [],
        composers: selectedComposers,
        tags: selectedTags,
        custom_filters: selectedCustomFilters,
        custom_fields: selectedCustomFilters,
        page: currentPage,
        limit: itemsPerPage,
        sort_by: sortOption.sort_by,
        order: sortOption.order,
      };

      const response: any = await documentService.filter(payload);
      const docsArray = response?.data || [];
      const totalCount = response?.total;

      if (totalCount !== undefined) {
        setTotalGlobalDocuments(totalCount);
      }

      const readyDocs = docsArray
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
  }, [searchQuery, selectedCollectionId, selectedComposers, selectedTags, selectedCustomFilters, currentPage, itemsPerPage, sortOption]);

  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 250);
    return () => clearTimeout(timer);
  }, [applyFilters]);

  const totalPages = Math.ceil(totalGlobalDocuments / itemsPerPage) || 1;

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
      fetchDocuments();
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
      console.log('Enviando payload:', payload);

      await documentService.confirmMetadata(editingItem.backendId, payload);

      setEditingItem(null);
      fetchDocuments();
      fetchGlobalTags();
      applyFilters();
    } catch (e) {
      console.error('Error al confirmar metadatos:', e);
    }
  };

  const handleGenerateMetadata = async (backendId: string) => {
    setGeneratingMetadataIds((prev) => ({ ...prev, [backendId]: true }));
    try {
      await documentService.generateMetadata(backendId);
      setToastMessage(APP_TEXTS.aiMetadata.successToast);
      await applyFilters();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e: any) {
      console.error('Error al generar metadatos:', e);
      setToastMessage(`${APP_TEXTS.aiMetadata.errorToastPrefix}${e.message}`);
    } finally {
      setGeneratingMetadataIds((prev) => ({ ...prev, [backendId]: false }));
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

  const handleCreateCustomField = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      await collectionService.create(newCollectionName, modalParentId);
      setNewCollectionName('');
      setModalParentId(undefined);
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

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await documentService.deleteDocument(documentId);
      setDocuments((prevDocs) => prevDocs.filter((doc) => (doc.backendId || doc.id) !== documentId));
      fetchDocuments();
    } catch (error) {
      console.error('Error al eliminar el documento:', error);
    }
  };

  const handleDownloadPdf = async (documentId: string, title: string) => {
    try {
      const rawBlob = await documentService.downloadPdf(documentId);
      const blob = new Blob([rawBlob], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      
      const fileName = title.endsWith('.pdf') ? title : `${title}.pdf`;
      
      const downloadLink = document.createElement('a');
      downloadLink.style.display = 'none';
      downloadLink.href = blobUrl;
      downloadLink.setAttribute('download', fileName);
      downloadLink.target = '_self';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
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
                collection_ids: doc.collection_ids.filter((id: string) => id !== collectionId),
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

  const handleBulkIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestPath.trim()) return;

    try {
      setIsIngesting(true);
      const response = await documentService.bulkIngest(ingestPath.trim());
      const taskId = response.task_id || response.id; 
      if (taskId) {
        setCurrentTaskId(taskId);
        setShowIngestModal(true);
        setIngestPath('');
      }
    } catch (error) {
      console.error('Error al iniciar la ingesta masiva:', error);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleSyncCollection = async () => {
    const targetIdOrPath = selectedCollectionId;
    if (!targetIdOrPath) {
      setGlobalError(APP_TEXTS.sync.errorNoCollection);
      return;
    }

    try {
      setIsSyncing(true);
      setSyncMessage(null);
      setGlobalError(null);

      const result = await documentService.syncCollection(targetIdOrPath);
      
      setSyncMessage(`Sincronización exitosa: ${result.added} archivos añadidos, ${result.removed} referencias eliminadas.`);
      
      await fetchDocuments();
      await fetchCollections();
      await applyFilters();

    } catch (error: any) {
      console.error('Error al sincronizar:', error);
      setGlobalError(error.message || 'Error al ejecutar la sincronización del directorio.');
    } finally {
      setIsSyncing(false);
    }
  };

  const parentCollectionName = useMemo(() => {
    if (!modalParentId) return null;
    
    const findName = (cols: Collection[]): string | null => {
      for (const c of cols) {
        if (c.id === modalParentId) return c.name;
        if (c.children) {
          const found = findName(c.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findName(collections);
  }, [modalParentId, collections]);

  const [isFiltersVisible, setIsFiltersVisible] = useState(true);

  return (
    <div className="flex min-h-screen bg-[var(--app-bg)] text-[color:var(--text-primary)] font-sans transition-colors duration-200">
      <Sidebar
        totalGlobalDocuments={totalGlobalDocuments}
        totalGlobalCount={totalGlobalCount}
        selectedCollectionId={selectedCollectionId}
        setSelectedCollectionId={setSelectedCollectionId}
        collections={collections}
        themeMode={themeMode}
        onThemeModeChange={handleThemeModeChange}
        onOpenNewCollectionModal={(parentId) => {
          setModalParentId(parentId);
          setShowNewCollectionModal(true);
        }}
        onOpenConfigModal={() => setShowConfigModal(true)}
        onDeleteCollection={handleDeleteCollectionClick}
      />

      <div className={`transition-all duration-300 ease-in-out ${isFiltersVisible ? 'w-64' : 'w-0'} overflow-hidden relative border-r border-[color:var(--border-color)]`}>
        <div className="w-64">
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
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          {/* Botón para alternar filtros */}
          <button
            onClick={() => setIsFiltersVisible(!isFiltersVisible)}
            className="mb-2 text-xs font-semibold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
          >
            {isFiltersVisible ? '« Ocultar filtros' : '» Mostrar filtros'}
          </button>
        
        <div className="w-full">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isSearching={isSearching}
              />
            </div>
            <select
              value={`${sortOption.sort_by}:${sortOption.order}`}
              onChange={(e) => {
                const [sort_by, order] = e.target.value.split(':');
                setSortOption({ sort_by, order });
              }}
              className="shrink-0 h-[46px] px-4 text-xs rounded-xl bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] cursor-pointer shadow-md focus:outline-none focus:border-emerald-500"
            >
              <option value="created_at:desc">{APP_TEXTS.sorting.options.newest}</option>
              <option value="created_at:asc">{APP_TEXTS.sorting.options.oldest}</option>
              <option value="filename:asc">{APP_TEXTS.sorting.options.nameAsc}</option>
              <option value="filename:desc">{APP_TEXTS.sorting.options.nameDesc}</option>
            </select>
          </div>


          <HasRole canEdit>
            <Dropzone
              getRootProps={getRootProps}
              getInputProps={getInputProps}
              isDragActive={isDragActive}
            />
          </HasRole>

          {globalError && (
            <div className="my-4 p-3 bg-[var(--danger-surface)] border border-[color:var(--danger-border)] text-[color:var(--danger)] text-xs rounded-lg">
              {globalError}
            </div>
          )}

          {/* Acordeón de Herramientas de Administración (Importación Masiva y Sincronización) */}
          <HasRole canEdit>
            <details className="my-6 p-4 rounded-xl bg-[var(--surface)] border border-[color:var(--border-color)] group">
              <summary className="cursor-pointer text-xs font-bold text-[color:var(--text-strong)] uppercase tracking-wider flex items-center justify-between select-none">
                <span className="flex items-center gap-2">
                  🛠️ {APP_TEXTS.bulkIngest.title} &amp; {APP_TEXTS.sync.title}
                </span>
                <span className="text-[10px] text-[color:var(--text-secondary)] font-normal group-open:hidden">
                  Desplegar ▾
                </span>
                <span className="text-[10px] text-[color:var(--text-secondary)] font-normal hidden group-open:inline">
                  Ocultar ▴
                </span>
              </summary>

              <div className="mt-4 pt-4 border-t border-[color:var(--border-color)] space-y-6">
                {/* Bloque de Importación Masiva */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[color:var(--text-strong)] uppercase tracking-wider">
                    {APP_TEXTS.bulkIngest.title}
                  </h4>
                  <form onSubmit={handleBulkIngestSubmit} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={APP_TEXTS.bulkIngest.placeholder}
                      value={ingestPath}
                      onChange={(e) => setIngestPath(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-lg bg-[var(--app-bg)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isIngesting || !ingestPath.trim()}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
                    >
                      {isIngesting ? APP_TEXTS.bulkIngest.submittingBtn : APP_TEXTS.bulkIngest.submitBtn}
                    </button>
                  </form>
                </div>

                {/* Bloque de Sincronización y Re-escaneo */}
                <div className="space-y-3 pt-4 border-t border-[color:var(--border-color)]">
                  <h4 className="text-xs font-bold text-[color:var(--text-strong)] uppercase tracking-wider">
                    {APP_TEXTS.sync.title}
                  </h4>
                  <p className="text-xs text-[color:var(--text-secondary)]">
                    {APP_TEXTS.sync.description}
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncCollection}
                    disabled={isSyncing || !selectedCollectionId}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {isSyncing ? APP_TEXTS.sync.syncingBtn : APP_TEXTS.sync.syncBtn}
                  </button>
                  {syncMessage && (
                    <div className="p-2 bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-xs rounded-lg">
                      {syncMessage}
                    </div>
                  )}
                </div>
              </div>
            </details>
          </HasRole>

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

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[color:var(--text-strong)]">
              {selectedCollectionId
                ? `Colección: ${collectionPath.join(' > ')} (${totalGlobalDocuments})`
                : `Todos los documentos (${totalGlobalDocuments})`}
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
                onDelete={handleDeleteDocument}
                onDownloadPdf={handleDownloadPdf}

                onGenerateMetadata={handleGenerateMetadata}
                isGenerating={!!generatingMetadataIds[doc.backendId!]}

              />
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-[color:var(--border-color)]">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] disabled:opacity-50 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {APP_TEXTS.common.pagination.first}
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] disabled:opacity-50 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {APP_TEXTS.common.pagination.previous}
                </button>
                
                <div className="flex items-center gap-2 mx-2">
                  <span className="text-xs text-[color:var(--text-secondary)]">
                    {APP_TEXTS.common.pagination.page.replace('{currentPage}', currentPage.toString()).replace('{totalPages}', totalPages.toString())}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    placeholder={APP_TEXTS.common.pagination.goToPage}
                    className="w-16 px-2 py-1 text-xs rounded-lg bg-[var(--surface)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt(e.currentTarget.value);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          setCurrentPage(val);
                        }
                      }
                    }}
                  />
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] disabled:opacity-50 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {APP_TEXTS.common.pagination.next}
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface)] border border-[color:var(--border-color)] text-[color:var(--text-primary)] disabled:opacity-50 hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {APP_TEXTS.common.pagination.last}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      <VersionFooter />
    </div>

      {/* Toast flotante global de notificación[cite: 1] */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 animate-bounce">
          <span>✨</span>
          <p className="text-xs font-semibold">{toastMessage}</p>
          <button 
            onClick={() => setToastMessage(null)} 
            className="ml-2 text-white hover:text-emerald-200 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modal de Progreso de Ingesta Masiva[cite: 2] */}
      {showIngestModal && (
        <IngestProgressModal
          isOpen={showIngestModal}
          taskId={currentTaskId}
          onClose={() => {
            setShowIngestModal(false);
            setCurrentTaskId(null);
            fetchDocuments();
            fetchCollections();
          }}
          onSuccess={handleIngestSuccess}
        />
      )}

      {/* Visor de PDF si está activo */}
      {viewingDocument && (
        <PDFViewer
          documentId={viewingDocument.id}
          title={viewingDocument.title}
          onClose={() => setViewingDocument(null)}
        />
      )}

      {/* Modal de Edición de Metadatos */}
      {editingItem && (
        <EditMetadataModal
          isOpen={!!editingItem}
          editingItem={editingItem}
          editForm={editForm}
          setEditForm={setEditForm}
          customFields={customFields}
          globalTags={globalTags}
          onClose={() => setEditingItem(null)}
          onConfirm={handleConfirmMetadata}
        />
      )}

      {/* Modal de Creación de Colección */}
      <CreateCollectionModal
        isOpen={showNewCollectionModal}
        newCollectionName={newCollectionName}
        setNewCollectionName={setNewCollectionName}
        parentCollectionName={parentCollectionName}
        onClose={() => setShowNewCollectionModal(false)}
        onSubmit={handleCreateCollection}
      />

      {/* Modal de Configuración / Campos personalizados */}
      <CustomFieldsModal
        isOpen={showConfigModal}
        customFields={customFields}
        newFieldName={newFieldName}
        setNewFieldName={setNewFieldName}
        newFieldType={newFieldType}
        setNewFieldType={setNewFieldType}
        newFieldOptions={newFieldOptions}
        setNewFieldOptions={setNewFieldOptions}
        onClose={() => setShowConfigModal(false)}
        onSubmit={handleCreateCustomField}
        onDeleteField={handleDeleteCustomField}
      />

      {/* Modal de Confirmación de Borrado */}
      <ConfirmModal
        isOpen={!!collectionToDelete}
        title={APP_TEXTS.modals.deleteCollection.title}
        message={APP_TEXTS.modals.deleteCollection.message}
        onConfirm={handleConfirmDeleteCollection}
        onClose={() => setCollectionToDelete(null)}
      />
    </div>
  );
}
