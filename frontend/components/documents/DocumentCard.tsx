// components/documents/DocumentCard.tsx
'use client';

import React, { useState } from 'react';
import { APP_TEXTS } from '@/app/constants/texts';
import { HasRole } from '@/components/auth/HasRole';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';

interface DocumentCardProps {
  item: {
    id: string;
    backendId?: string;
    file: { name: string; size: number };
    suggestedMetadata?: { title: string; composer: string; tags: string[] };
    confirmedMetadata?: { title: string; composer: string; tags: string[] };
    customMetadata?: Record<string, any>;
    isConfirmed?: boolean;
    pdfUrl?: string;
  };
  collections: Array<{ id: string; name: string }>;
  selectedCollectionId?: string | null;
  onRemoveFromCollection?: (docId: string, collectionId: string) => void;
  onEdit: (item: any) => void;
  onViewPdf: (backendId: string, title: string) => void;
  onDownloadPdf?: (backendId: string, title: string) => void | Promise<void>;
  onAssignCollection: (backendId: string, collectionId: string) => void;
  onDelete?: (backendId: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  item,
  collections,
  selectedCollectionId,
  onRemoveFromCollection,
  onEdit,
  onViewPdf,
  onDownloadPdf,
  onAssignCollection,
  onDelete,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const title = item.confirmedMetadata?.title || item.suggestedMetadata?.title || item.file.name;
  const composer = item.confirmedMetadata?.composer || item.suggestedMetadata?.composer;
  const tags = item.confirmedMetadata?.tags || item.suggestedMetadata?.tags || [];

  const customEntries = item.customMetadata
    ? Object.entries(item.customMetadata).filter(([_, val]) => val !== null && val !== undefined && val !== '')
    : [];

  const T = APP_TEXTS.documentCard;

  const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevenir cualquier propagación del evento a nivel de React y DOM Nativo
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation?.();

    const docId = item.backendId || item.id;
    if (!docId || isDownloading) return;

    try {
      setIsDownloading(true);

      if (onDownloadPdf) {
        await onDownloadPdf(docId, title);
      } else if (item.pdfUrl) {
        // Fallback
        const response = await fetch(item.pdfUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = title.endsWith('.pdf') ? title : `${title}.pdf`;
        a.target = '_self';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => window.URL.revokeObjectURL(url), 200);
      }
    } catch (error) {
      console.error('Error al descargar PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleConfirmDelete = async () => {
    const docId = item.backendId || item.id;
    if (!docId || !onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(docId);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
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
          {/* Quitar de colección */}
          {selectedCollectionId && onRemoveFromCollection && (
            <HasRole canDelete>
              <button
                type="button"
                onClick={() => onRemoveFromCollection(item.id, selectedCollectionId)}
                className="px-2.5 py-1.5 bg-[var(--danger-soft)] hover:bg-[var(--danger-surface)] text-[color:var(--danger)] border border-[color:var(--danger-border)] text-xs rounded-lg transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                title={T.removeFromCollectionTooltip}
              >
                {T.removeFromCollectionBtn}
              </button>
            </HasRole>
          )}

          {/* Ver PDF: Público */}
          {item.backendId && (
            <button
              type="button"
              onClick={() => onViewPdf(item.backendId!, title)}
              className="px-3 py-1.5 bg-[var(--accent-soft)] hover:bg-[var(--accent-surface)] text-[color:var(--accent)] border border-[color:var(--accent-border)] text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title={T.viewPdfTooltip}
            >
              {T.viewPdfIcon} {T.viewPdfBtn}
            </button>
          )}

          {/* Descargar PDF: Público para todos los roles */}
          {(item.backendId || item.pdfUrl) && (
            <button
              type="button"
              onClick={(e) => handleDownload(e)}
              disabled={isDownloading}
              className="px-3 py-1.5 bg-[var(--panel-bg-muted)] hover:bg-[var(--panel-hover)] text-[color:var(--text-primary)] border border-[color:var(--border-color)] text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title={T.downloadPdfTooltip}
            >
              {T.downloadPdfIcon} {isDownloading ? T.downloadingPdfBtn : T.downloadPdfBtn}
            </button>
          )}

          {/* Editar metadatos */}
          <HasRole canEdit>
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="px-3 py-1.5 bg-[var(--panel-bg-muted)] hover:bg-[var(--panel-hover)] text-[color:var(--text-secondary)] text-xs font-medium rounded-lg transition-colors border border-[color:var(--border-color)] cursor-pointer"
            >
              {T.editBtn}
            </button>
          </HasRole>

          {/* Asignar colección */}
          {collections.length > 0 && item.backendId && (
            <HasRole canEdit>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onAssignCollection(item.backendId!, e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="bg-[var(--input-bg)] border border-[color:var(--border-color)] text-[color:var(--text-secondary)] text-xs rounded-lg px-2 py-1.5 outline-none hover:border-[color:var(--border-hover)] cursor-pointer"
              >
                <option value="" disabled>{T.moveToOption}</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </HasRole>
          )}

          {/* Eliminar Documento */}
          {onDelete && (item.backendId || item.id) && (
            <HasRole canDelete>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1.5 bg-[var(--danger-soft)] hover:bg-[var(--danger-surface)] text-[color:var(--danger)] border border-[color:var(--danger-border)] text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                title={T.deleteTooltip}
              >
                {T.deleteIcon} {T.deleteBtn}
              </button>
            </HasRole>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        documentTitle={title}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
};