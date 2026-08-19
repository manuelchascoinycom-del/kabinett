'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { APP_TEXTS } from '@/app/constants/texts';
import { documentService } from '@/services/documentService';
import { useAuth } from '@/context/AuthContext';
import { ConfirmModal } from '../modals/ConfirmModal';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
}

interface PDFViewerProps {
  documentId: string;
  title: string;
  onClose: () => void;
}

export default function PDFViewer({ documentId, title, onClose }: PDFViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAtrilMode, setIsAtrilMode] = useState<boolean>(false);
  const { hasRole, token } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);

  const T = APP_TEXTS.pdfViewer;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setPageNum(1);

    const loadProtectedPdf = async () => {
      try {
        // 1. Descargamos el blob usando el servicio autenticado
        const blob = await documentService.downloadPdf(documentId);
        if (!isMounted) return;

        // 2. Convertimos el blob en un ArrayBuffer para pdfjs-dist
        const arrayBuffer = await blob.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer, // 👈 Pasamos los datos binarios en lugar de la URL
          useSystemFonts: true,
          enableXfa: false,
          verbosity: 0,
        });

        loadingTaskRef.current = loadingTask;

        const pdf = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.name !== 'AbortException') {
          console.error(T.loadPdfErrorLog, err);
          setError(T.loadPdfErrorText);
        }
        setLoading(false);
      }
    };

    if (documentId) {
      loadProtectedPdf();
    }

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* noop */ }
        renderTaskRef.current = null;
      }
      if (loadingTaskRef.current) {
        try { loadingTaskRef.current.destroy(); } catch { /* noop */ }
        loadingTaskRef.current = null;
      }
    };
  }, [documentId, T.loadPdfErrorLog, T.loadPdfErrorText]);

  const renderPage = useCallback(
    async (pageNumber: number, currentScale: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* noop */ }
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: currentScale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.height = Math.floor(viewport.height);
        canvas.width = Math.floor(viewport.width);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        setLoading(false);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && err?.message !== 'cancelled') {
          console.error(T.renderErrorLog, err);
        }
      }
    },
    [pdfDoc, T.renderErrorLog]
  );

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pageNum, scale);
    }
  }, [pdfDoc, pageNum, scale, renderPage]);

  const prevPage = () => setPageNum((prev) => Math.max(prev - 1, 1));
  const nextPage = () => setPageNum((prev) => Math.min(prev + 1, numPages));

  const fitToWidth = () => {
    if (!containerRef.current || !pdfDoc) return;
    pdfDoc.getPage(pageNum).then((page) => {
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = containerRef.current?.clientWidth || 800;
      const targetScale = (containerWidth - 60) / unscaledViewport.width;
      setScale(targetScale);
    });
  };
  const handleNormalize = async () => {
    setIsRepairing(true);
    try {
      await documentService.normalizeManual(documentId);
      setShowSuccessModal(true);
      
      // Forzar recarga del visor
      setPdfDoc(null);
      setLoading(true);
      const blob = await documentService.downloadPdf(documentId);
      const arrayBuffer = await blob.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, useSystemFonts: true, enableXfa: false, verbosity: 0 });
      loadingTaskRef.current = loadingTask;
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || T.repairError);
    } finally {
      setIsRepairing(false);
    }
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') nextPage();
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') prevPage();
      if (e.key === 'Escape') {
        if (isAtrilMode) {
          setIsAtrilMode(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, onClose, isAtrilMode]);

  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* noop */ }
        renderTaskRef.current = null;
      }
      if (pdfDoc) {
        pdfDoc.cleanup();
      }
    };
  }, [pdfDoc]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAtrilMode) return;
    const width = e.currentTarget.clientWidth;
    const clickX = e.clientX;
    if (clickX < width * 0.3) {
      prevPage();
    } else if (clickX > width * 0.7) {
      nextPage();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between transition-all duration-300 ${
        isAtrilMode ? 'bg-[var(--viewer-shell)]' : 'bg-[var(--overlay-bg)] backdrop-blur-md'
      }`}
      onClick={handleContainerClick}
    >
      <header className={`bg-[var(--viewer-header)] border-b border-[color:var(--border-color)] px-6 py-3 flex items-center justify-between shadow-lg shrink-0 transition-all duration-300 ${
        isAtrilMode ? '-translate-y-full opacity-0 pointer-events-none h-0 overflow-hidden py-0 border-none' : 'translate-y-0 opacity-100'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{T.sheetMusicIcon}</span>
          <h3 className="text-sm font-bold text-[color:var(--text-strong)] truncate max-w-xs md:max-w-md">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-4 bg-[var(--panel-bg-muted)] px-4 py-1.5 rounded-xl border border-[color:var(--border-color)]">
          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={pageNum <= 1}
              className="p-1 rounded text-[color:var(--text-secondary)] hover:bg-[var(--panel-hover)] disabled:opacity-30"
              title={T.prevPageTitle}
            >
              {T.prevPageIcon}
            </button>
            <span className="text-xs text-[color:var(--text-secondary)] font-mono">
              <strong className="text-emerald-400">{pageNum}</strong> {T.pageSeparator} {numPages || '-'}
            </span>
            <button
              onClick={nextPage}
              disabled={pageNum >= numPages}
              className="p-1 rounded text-[color:var(--text-secondary)] hover:bg-[var(--panel-hover)] disabled:opacity-30"
              title={T.nextPageTitle}
            >
              {T.nextPageIcon}
            </button>
          </div>

          <div className="h-4 w-px bg-[var(--border-color)]" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((s) => Math.max(s - 0.15, 0.5))}
              className="px-2 py-0.5 text-xs font-bold text-[color:var(--text-secondary)] hover:bg-[var(--panel-hover)] rounded"
            >
              {T.zoomOut}
            </button>
            <span className="text-xs text-[color:var(--text-muted)] font-mono font-semibold w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(s + 0.15, 3.0))}
              className="px-2 py-0.5 text-xs font-bold text-[color:var(--text-secondary)] hover:bg-[var(--panel-hover)] rounded"
            >
              {T.zoomIn}
            </button>
            <button
              onClick={fitToWidth}
              className="px-2.5 py-1 bg-[var(--panel-bg)] hover:bg-[var(--panel-hover)] border border-[color:var(--border-color)] text-[color:var(--text-secondary)] text-[11px] font-medium rounded transition-colors"
            >
              {T.fitWidthBtn}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAtrilMode(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shadow-md"
            title={T.atrilTitle}
          >
            {T.atrilIcon} {T.atrilBtn}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition-all"
          >
            ✕
          </button>
          {(hasRole(['Admin', 'Editor'])) && (
            <button
              onClick={handleNormalize}
              disabled={isRepairing}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-800 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shadow-md"
              title={T.repairBtn}
            >
              {isRepairing ? T.repairingBtn : T.repairBtn}
            </button>
          )}
        </div>
      </header>

      {isAtrilMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsAtrilMode(false);
          }}
          className="fixed top-4 right-4 z-50 px-3 py-1.5 bg-[var(--viewer-header)] hover:bg-[var(--panel-hover)] text-[color:var(--text-secondary)] text-xs font-medium rounded-full backdrop-blur border border-[color:var(--border-color)] shadow-xl transition-all"
          title={T.exitAtrilTitle}
        >
          {T.exitAtrilBtn}
        </button>
      )}

      <ConfirmModal
        isOpen={showSuccessModal}
        title={APP_TEXTS.common.normalize.successTitle}
        message={APP_TEXTS.common.normalize.successMessage}
        confirmText={APP_TEXTS.common.confirm}
        isDanger={false}
        onConfirm={() => setShowSuccessModal(false)}
        onClose={() => setShowSuccessModal(false)}
      />

      <main
        ref={containerRef}
        className={`flex-1 overflow-auto flex justify-center items-start transition-all duration-300 ${
          isAtrilMode ? 'p-0 bg-[var(--viewer-shell)] items-center' : 'p-6 bg-[var(--viewer-surface)]'
        }`}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-emerald-400">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">{T.loadingText}</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2">
            <span className="text-2xl">{T.errorIcon}</span>
            <p className="text-xs font-medium">{error}</p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`shadow-2xl bg-white transition-opacity duration-150 ${
            loading ? 'opacity-0' : 'opacity-100'
          } ${isAtrilMode ? 'rounded-none border-none max-h-screen object-contain' : 'rounded border border-slate-800'}`}
        />
      </main>
    </div>
  );
}