'use client';

import React, { useEffect, useState, useRef } from 'react';
import { documentService } from '../../services/documentService';
import { APP_TEXTS } from '@/app/constants/texts';

interface IngestProgressModalProps {
  isOpen: boolean;
  taskId: string | null | undefined;
  onClose: () => void;
  onSuccess?: () => void; // Callback opcional para cuando termine con éxito
}

interface IngestStatus {
  status: string;
  total_items: number;
  processed_items: number;
  percentage: number;
  errors: string[];
}

export const IngestProgressModal: React.FC<IngestProgressModalProps> = ({
  isOpen,
  taskId,
  onClose,
  onSuccess,
}) => {
  const [data, setData] = useState<IngestStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen || !taskId) {
      setData(null);
      setErrorMsg(null);
      setShowLogs(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const res = await documentService.getIngestStatus(taskId);
        setData(res);
        setErrorMsg(null);

        // Si se completa, llamamos al callback de éxito y dejamos de hacer polling
        if (res.status === 'completed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (onSuccess) {
            onSuccess();
          }
        } else if (res.status === 'failed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (err: any) {
        console.error('Error fetching ingest status:', err);
        // No detenemos el polling inmediatamente por un fallo de red temporal,
        // pero mostramos un mensaje de advertencia visual
        setErrorMsg(err.message || APP_TEXTS.ingestModal.defaultErrorMsg);
      } finally {
        setLoading(false);
      }
    };

    // Primera llamada inmediata
    fetchStatus();

    // Polling cada 2 segundos
    intervalRef.current = setInterval(fetchStatus, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, taskId, onSuccess]);

  if (!isOpen) return null;

  const status = data?.status || 'pending';
  const total = data?.total_items ?? 0;
  const processed = data?.processed_items ?? 0;
  const percentage = data?.percentage ?? 0;
  const errors = data?.errors || [];

  const isActive = status === 'pending' || status === 'processing' || status === 'in_progress';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  // Formatear estado de forma amigable
  const getFriendlyStatus = () => {
    switch (status) {
      case 'pending':
        return APP_TEXTS.ingestModal.status.pending;
      case 'processing':
        return APP_TEXTS.ingestModal.status.processing;
      case 'completed':
        return APP_TEXTS.ingestModal.status.completed;
      case 'failed':
        return APP_TEXTS.ingestModal.status.failed;
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Color de la barra de progreso
  const getProgressBarColor = () => {
    if (isFailed) return 'bg-red-500';
    if (isCompleted) return 'bg-emerald-500';
    return 'bg-amber-500 animate-pulse';
  };

  // Icono del estado
  const getStatusIcon = () => {
    if (isFailed) {
      return (
        <div className="p-3 bg-red-500/15 text-red-500 border border-red-500/20 rounded-full">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      );
    }
    if (isCompleted) {
      return (
        <div className="p-3 bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 rounded-full">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    }
    return (
      <div className="p-3 bg-amber-500/15 text-amber-500 border border-amber-500/20 rounded-full">
        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  };

  return (
    <div className="app-overlay fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="app-modal p-6 rounded-xl w-full max-w-md space-y-6 shadow-2xl bg-[var(--app-bg)] border border-[color:var(--border-color)]">
        
        {/* Encabezado */}
        <div className="flex items-center gap-4">
          {getStatusIcon()}
          <div>
            <h3 className="text-sm font-bold text-[color:var(--text-strong)]">
              {APP_TEXTS.ingestModal.title}
            </h3>
            <p className="text-xs text-[color:var(--text-muted)] mt-0.5">
              {APP_TEXTS.ingestModal.taskIdLabel} <span className="font-mono">{taskId}</span>
            </p>
          </div>
        </div>

        {/* Estado y Progreso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-[color:var(--text-strong)]">
              {getFriendlyStatus()}
            </span>
            <span className="text-[color:var(--text-muted)] font-mono">
              {percentage}%
            </span>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-[var(--panel-bg-muted)] rounded-full h-3 overflow-hidden border border-[color:var(--border-color)]">
            <div
              className={`h-full transition-all duration-500 ease-out ${getProgressBarColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex justify-between text-2xs text-[color:var(--text-muted)] pt-1">
            <span>
              {APP_TEXTS.ingestModal.processedLabel} <strong className="text-[color:var(--text-strong)]">{processed}</strong> {APP_TEXTS.ingestModal.ofLabel} <strong className="text-[color:var(--text-strong)]">{total}</strong>
            </span>
            {errorMsg && (
              <span className="text-red-400 font-medium animate-pulse">
                ⚠️ {errorMsg}
              </span>
            )}
          </div>
        </div>

        {/* Errores / Incidencias desplegables */}
        {errors.length > 0 && (
          <div className="border border-[color:var(--border-color)] rounded-lg overflow-hidden bg-[var(--panel-bg-muted)]">
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="w-full px-4 py-2 flex justify-between items-center text-xs font-semibold text-[color:var(--text-strong)] hover:bg-[var(--panel-hover)] transition-colors"
            >
              <span className="flex items-center gap-1.5 text-red-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {APP_TEXTS.ingestModal.issuesLabel} ({errors.length})
              </span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showLogs ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showLogs && (
              <div className="max-h-36 overflow-y-auto p-3 border-t border-[color:var(--border-color)] font-mono text-[10px] leading-relaxed text-red-300 bg-red-950/20 space-y-1 scrollbar-thin">
                {errors.map((err, i) => (
                  <div key={i} className="border-b border-red-950/40 pb-1 last:border-0 last:pb-0">
                    {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[color:var(--border-color)]">
          {isActive && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[var(--panel-bg-muted)] hover:bg-[var(--panel-hover)] border border-[color:var(--border-color)] text-[color:var(--text-secondary)] text-xs rounded-lg font-medium transition-colors"
            >
              {APP_TEXTS.ingestModal.hideBackgroundBtn}
            </button>
          )}
          {(isCompleted || isFailed) && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow"
            >
              {APP_TEXTS.ingestModal.closeBtn}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
