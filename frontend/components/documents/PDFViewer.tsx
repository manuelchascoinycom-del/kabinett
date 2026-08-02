'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { APP_TEXTS } from '@/app/constants/texts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  const [error, setError] = useState<string | null>(null);
  const [isAtrilMode, setIsAtrilMode] = useState<boolean>(false);

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

    const fileUrl = `${API_BASE_URL}/documents/${documentId}/file`;

    const loadingTask = pdfjsLib.getDocument({
      url: fileUrl,
      useSystemFonts: true,
      enableXfa: false,
      rangeChunkSize: 64 * 1024,
      disableRange: false,
      disableStream: false,
      verbosity: 0,
    });

    loadingTaskRef.current = loadingTask;

    loadingTask.onProgress = null;

    loadingTask.promise
      .then((pdf) => {
        if (!isMounted) {
          pdf.destroy().catch(() => {});
          return;
        }
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err?.name !== 'AbortException') {
          console.error(T.loadPdfErrorLog, err);
          setError(T.loadPdfErrorText);
        }
        setLoading(false);
      });

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
  }, [documentId]);

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
        } as pdfjsLib.RenderParameters;

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
        // En pdfjs moderno se usa cleanup() o comprobación segura:
        if (typeof pdfDoc.cleanup === 'function') {
          pdfDoc.cleanup();
        } else if (typeof pdfDoc.destroy === 'function') {
          pdfDoc.destroy().catch(() => {});
        }
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
      className={`fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between transition-all duration-300 ${
        isAtrilMode ? 'bg-black' : 'bg-slate-950/90 backdrop-blur-md'
      }`}
      onClick={handleContainerClick}
    >
      <header className={`bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-lg shrink-0 transition-all duration-300 ${
        isAtrilMode ? '-translate-y-full opacity-0 pointer-events-none h-0 overflow-hidden py-0 border-none' : 'translate-y-0 opacity-100'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{T.sheetMusicIcon}</span>
          <h3 className="text-sm font-bold text-slate-100 truncate max-w-xs md:max-w-md">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-4 bg-slate-950 px-4 py-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={pageNum <= 1}
              className="p-1 rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30"
              title={T.prevPageTitle}
            >
              {T.prevPageIcon}
            </button>
            <span className="text-xs text-slate-300 font-mono">
              <strong className="text-emerald-400">{pageNum}</strong> {T.pageSeparator} {numPages || '-'}
            </span>
            <button
              onClick={nextPage}
              disabled={pageNum >= numPages}
              className="p-1 rounded text-slate-300 hover:bg-slate-800 disabled:opacity-30"
              title={T.nextPageTitle}
            >
              {T.nextPageIcon}
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((s) => Math.max(s - 0.15, 0.5))}
              className="px-2 py-0.5 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded"
            >
              {T.zoomOut}
            </button>
            <span className="text-xs text-slate-400 font-mono font-semibold w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(s + 0.15, 3.0))}
              className="px-2 py-0.5 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded"
            >
              {T.zoomIn}
            </button>
            <button
              onClick={fitToWidth}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded transition-colors"
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
            {T.closeBtn}
          </button>
        </div>
      </header>

      {isAtrilMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsAtrilMode(false);
          }}
          className="fixed top-4 right-4 z-50 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-full backdrop-blur border border-slate-700 shadow-xl transition-all"
          title={T.exitAtrilTitle}
        >
          {T.exitAtrilBtn}
        </button>
      )}

      <main
        ref={containerRef}
        className={`flex-1 overflow-auto flex justify-center items-start transition-all duration-300 ${
          isAtrilMode ? 'p-0 bg-black items-center' : 'p-6 bg-slate-950/50'
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
