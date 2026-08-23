// components/CollectionTreeItem.tsx
'use client';

import { BatchAiConfirmModal } from '@/components/modals/BatchAiConfirmModal';
import { BatchAiSuccessModal } from '@/components/modals/BatchAiSuccessModal';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { APP_TEXTS } from '@/app/constants/texts';
import { HasRole } from '@/components/auth/HasRole';
import { Collection as BaseCollection, collectionService } from '@/services/collectionService';

export interface Collection extends BaseCollection {
  document_ids?: string[];
  children?: Collection[];
}

// Cálculo recursivo para el badge de la derecha (total del árbol)
const calculateUniqueTotalDocuments = (collection: Collection): number => {
  const uniqueIds = new Set<string>();
  let fallbackSum = 0;
  let hasDocumentIds = false;

  const traverse = (col: Collection) => {
    if (col.document_ids && Array.isArray(col.document_ids) && col.document_ids.length > 0) {
      hasDocumentIds = true;
      col.document_ids.forEach((id) => uniqueIds.add(id));
    }
    
    fallbackSum += col.document_count ?? 0;
    
    if (col.children && col.children.length > 0) {
      col.children.forEach(traverse);
    }
  };

  traverse(collection);
  return hasDocumentIds ? uniqueIds.size : fallbackSum;
};

interface CollectionTreeItemProps {
  collection: Collection;
  selectedCollectionId: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddSubcollection?: (parentId: string) => void;
  onMoveDocument: (docId: string, targetCollectionId: string) => void;
  onUpdate?: () => void;
  onBatchFinished?: (collectionId: string) => void;
  depth?: number;
}

export const CollectionTreeItem: React.FC<CollectionTreeItemProps> = ({
  collection,
  selectedCollectionId,
  onSelect,
  onDelete,
  onAddSubcollection,
  onMoveDocument,
  onUpdate,
  onBatchFinished,
  depth = 0,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(collection.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAiConfirmOpen, setIsAiConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [batchStatus, setBatchStatus] = useState<{ total: number; ready: number; is_processing: boolean } | null>(null);
  const [isAiSuccessOpen, setIsAiSuccessOpen] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  const [showCompletionToast, setShowCompletionToast] = useState(false);
  
  // Ref para rastrear si el proceso realmente llegó a estar activo en el servidor
  const hasStartedRef = useRef(false);

  const isSelected = selectedCollectionId === collection.id;

  const onUpdateRef = useRef(onUpdate);
  const onSelectRef = useRef(onSelect);
  const onBatchFinishedRef = useRef(onBatchFinished);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onSelectRef.current = onSelect;
    onBatchFinishedRef.current = onBatchFinished;
  });

  const totalTreeDocuments = useMemo(() => {
    return calculateUniqueTotalDocuments(collection);
  }, [collection]);

  // Documentos directos de ESTA colección para la barra de progreso
  const directDocumentsCount = collection.document_ids?.length ?? collection.document_count ?? 0;

 // Polling ultra-simplificado y a prueba de bucles infinitos
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let pollCount = 0;
    
    if (isPolling) {
      const fetchStatus = async () => {
        try {
          pollCount++;
          const rawStatus: any = await collectionService.getBatchStatus(collection.id);
          
          const total = rawStatus.total ?? directDocumentsCount;
          const ready = rawStatus.ready ?? 0;
          const errorCount = rawStatus.error_count ?? rawStatus.errors ?? 0;
          const processed = rawStatus.processed ?? (ready + errorCount);
          const isProcessingFlag = Boolean(rawStatus.is_processing);

          console.log('--- DEBUG PROGRESS BAR ---', {
  isPolling,
  batchStatus,
  directDocumentsCount,
  currentTotal: batchStatus?.total ?? directDocumentsCount,
  currentReady: batchStatus?.ready ?? 0,
  shouldRenderBar: isPolling
});

          setBatchStatus({ total, ready: processed, is_processing: isProcessingFlag });
          
          // CONDICIÓN DE SALIDA INFALIBLE:
          // 1. El backend indica que ya no está procesando (y dejamos pasar al menos 1 segundo/poll para evitar falsos positivos iniciales).
          // 2. O los documentos procesados (éxitos + errores) igualan o superan al total.
          const isFinished = (!isProcessingFlag && pollCount > 1) || (total > 0 && processed >= total);

          if (isFinished) {
            // 1. Apagamos el polling inmediatamente para romper el bucle
            setIsPolling(false);
            
            // 2. Refrescamos el árbol de colecciones general
            if (onUpdateRef.current) {
              onUpdateRef.current();
            }
            
            // 3. Refrescamos los documentos de la vista principal
            if (onBatchFinishedRef.current) {
              onBatchFinishedRef.current(collection.id);
            } else if (isSelected) {
              onSelectRef.current(collection.id);
            }
            
            // 4. Mostramos el Toast de éxito
            setShowCompletionToast(true);
            setTimeout(() => setShowCompletionToast(false), 4500);
          }
        } catch (err) {
          console.error("Error polling batch status", err);
        }
      };

      // Ejecutar inmediatamente al activar y luego cada 2 segundos
      fetchStatus();
      interval = setInterval(fetchStatus, 2000);
    }
    
    return () => clearInterval(interval);
  }, [isPolling, collection.id, directDocumentsCount, isSelected]);

  useEffect(() => {
    setEditedName(collection.name);
  }, [collection.name]);

  const handleRename = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();

    if (editedName.trim() === collection.name) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await collectionService.update(collection.id, editedName.trim());
      setIsEditing(false);

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error al renombrar:', error);
      alert(APP_TEXTS.sidebar.renameError);
      setEditedName(collection.name);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChildren = collection.children && collection.children.length > 0;

  const currentTotal = batchStatus?.total && batchStatus.total > 0 ? batchStatus.total : directDocumentsCount;
  const currentReady = batchStatus?.ready ?? 0;
  const progressPercent = currentTotal > 0 ? Math.min(100, Math.round((currentReady / currentTotal) * 100)) : 0;

  return (
    <div className="w-full">
      <div
        onClick={() => onSelect(collection.id)}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          const docId = e.dataTransfer.getData('text/plain');
          if (docId) {
            onMoveDocument(docId, collection.id);
          }
        }}
        className={`group w-full px-2 py-1.5 rounded-lg text-xs font-medium flex justify-between items-center cursor-pointer transition-all ${
          isSelected
            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            : 'text-[color:var(--text-muted)] hover:bg-[var(--panel-hover)] hover:text-[color:var(--text-secondary)]'
        } ${isDraggingOver ? 'bg-emerald-500/20 border-l-2 border-emerald-500 ring-1 ring-emerald-500/50' : ''}`}
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

          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              onBlur={handleRename}
              autoFocus
              disabled={isSaving}
              className="w-full bg-[var(--panel-bg)] text-[color:var(--text-primary)] border border-emerald-500 rounded px-1 outline-none text-xs"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate" title={collection.name}>
              {APP_TEXTS.sidebar.collectionIcon} {collection.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isEditing && (
            <>
              {onAddSubcollection && (
                <HasRole canEdit>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(true);
                      onAddSubcollection(collection.id);
                    }}
                    className="hidden group-hover:flex text-[color:var(--text-subtle)] hover:text-emerald-500 p-0.5 transition-all text-lg leading-none items-center justify-center"
                    title={APP_TEXTS.sidebar.addSubcollectionTooltip}
                  >
                    +
                  </button>
                </HasRole>
              )}

              <HasRole canEdit>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="hidden group-hover:flex text-[color:var(--text-subtle)] hover:text-emerald-500 p-0.5 transition-all text-xs items-center justify-center"
                  title={APP_TEXTS.sidebar.renameCollectionTooltip}
                >
                  ✎
                </button>
              </HasRole>

              <HasRole canEdit>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAiConfirmOpen(true);
                  }}
                  className="hidden group-hover:flex text-[color:var(--text-subtle)] hover:text-emerald-500 p-0.5 transition-all text-xs items-center justify-center"
                  title={APP_TEXTS.sidebar.generateBatchAiTooltip}
                >
                  ⚡
                </button>
              </HasRole>

              {onDelete && (
                <HasRole canDelete>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(collection.id);
                    }}
                    className="hidden group-hover:flex text-[color:var(--text-subtle)] hover:text-[color:var(--danger)] p-0.5 transition-all text-xs items-center justify-center"
                    title={APP_TEXTS.sidebar.deleteCollectionTooltip}
                  >
                    {APP_TEXTS.sidebar.deleteIcon}
                  </button>
                </HasRole>
              )}
            </>
          )}

          <span className="text-[10px] bg-[var(--panel-bg)] border border-[color:var(--border-color)] text-[color:var(--text-muted)] px-2 py-0.5 rounded-full">
            {totalTreeDocuments}
          </span>
        </div>
      </div>

      {/* Barra de progreso en tiempo real */}
      {isPolling && (
        <div className="w-[calc(100%-1rem)] px-2 py-1.5 mt-1 ml-4 text-[10px] space-y-1 bg-[var(--panel-bg)] rounded border border-emerald-500/30 animate-fadeIn box-border overflow-hidden">
          <div className="flex justify-between items-center text-emerald-500 font-semibold truncate">
            <span className="truncate mr-2">
              {APP_TEXTS.sidebar.processing} ({currentReady} / {currentTotal})
            </span>
            <span className="shrink-0">{progressPercent}%</span>
          </div>
          <div className="w-full bg-emerald-900/20 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Notificación Toast de éxito al terminar */}
      {showCompletionToast && (
        <div className="absolute z-50 left-2 right-2 bottom-14 bg-[var(--sidebar-bg)] border border-emerald-500/50 text-[color:var(--text-primary)] px-3 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 animate-fadeIn text-xs">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <div className="flex-1">
            <p className="font-bold text-emerald-400">{APP_TEXTS.sidebar.batchAiCompleted}</p>
            <p className="text-[10px] text-[color:var(--text-muted)]">{APP_TEXTS.sidebar.batchAiCompletedDesc}</p>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      <BatchAiConfirmModal
        isOpen={isAiConfirmOpen}
        isLoading={isProcessing}
        onCancel={() => setIsAiConfirmOpen(false)}
        onConfirm={async () => {
          setIsProcessing(true);
          try {
            const response = await collectionService.generateBatchAI(collection.id);
            setQueuedCount(response.queued || 0);
            setIsAiConfirmOpen(false);
            setIsAiSuccessOpen(true);
            
            // Reiniciamos estados visuales y activamos el bucle de sondeo
            setBatchStatus(null);
            setIsPolling(true);
          } catch (err) {
            alert(APP_TEXTS.sidebar.batchAiError);
          } finally {
            setIsProcessing(false);
          }
        }}
      />

      <BatchAiSuccessModal 
        isOpen={isAiSuccessOpen} 
        onClose={() => setIsAiSuccessOpen(false)} 
        queued={queuedCount}
      />

      {hasChildren && isOpen && (
        <div className="space-y-1 mt-1 ml-3 pl-2 border-l border-[color:var(--border-color)]/30">
          {collection.children?.map((child) => (
            <CollectionTreeItem
              key={child.id}
              collection={child}
              selectedCollectionId={selectedCollectionId}
              onSelect={onSelect}
              onDelete={onDelete}
              onAddSubcollection={onAddSubcollection}
              onUpdate={onUpdate}
              onBatchFinished={onBatchFinished}
              onMoveDocument={onMoveDocument}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};