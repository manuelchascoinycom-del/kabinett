'use client';

import React, { useState, useEffect } from 'react';
import { TagInput } from '@/components/ui/TagInput';

interface Metadata {
  title: string;
  composer: string;
  tags: string[];
}

interface CustomField {
  id: string;
  name: string; // Ej: "Dificultad", "Editorial"
  type: string;
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  backendId?: string;
  suggestedMetadata?: Metadata;
  customMetadata?: Record<string, any>;
}

interface UploadQueueProps {
  items: UploadItem[];
  globalTags?: string[];
  customFields?: CustomField[];
  onStartUpload: () => void;
  onUploadSingleItem: (item: UploadItem) => void;
  onRemoveItem: (id: string) => void;
  onConfirmItem: (
    backendId: string,
    metadata: Metadata,
    customMetadata: Record<string, any>,
    queueId: string
  ) => void;
}

const UploadQueueItem: React.FC<{
  item: UploadItem;
  globalTags?: string[];
  customFields?: CustomField[];
  onUploadSingleItem: (item: UploadItem) => void;
  onRemoveItem: (id: string) => void;
  onConfirmItem: (
    backendId: string,
    metadata: Metadata,
    customMetadata: Record<string, any>,
    queueId: string
  ) => void;
}> = ({ item, globalTags = [], customFields = [], onUploadSingleItem, onRemoveItem, onConfirmItem }) => {
  const [title, setTitle] = useState(item.suggestedMetadata?.title || item.file.name);
  const [composer, setComposer] = useState(item.suggestedMetadata?.composer || '');
  const [tags, setTags] = useState<string[]>(item.suggestedMetadata?.tags || []);
  const [customMetadata, setCustomMetadata] = useState<Record<string, any>>(
    item.customMetadata || {}
  );

  useEffect(() => {
    if (item.suggestedMetadata) {
      if (item.suggestedMetadata.title) setTitle(item.suggestedMetadata.title);
      if (item.suggestedMetadata.composer) setComposer(item.suggestedMetadata.composer);
      if (item.suggestedMetadata.tags) setTags(item.suggestedMetadata.tags);
    }
    if (item.customMetadata) {
      setCustomMetadata(item.customMetadata);
    }
  }, [item.suggestedMetadata, item.customMetadata]);

  const handleCustomFieldChange = (fieldName: string, value: string) => {
    setCustomMetadata((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleConfirm = () => {
    if (!item.backendId) {
      console.error("No se puede confirmar: el item no tiene backendId asignado aún.");
      return;
    }
    onConfirmItem(item.backendId, { title, composer, tags }, customMetadata, item.id);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-md">
      {/* Cabecera del archivo en la cola */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate max-w-[60%]">
          <span className="text-slate-400">📄</span>
          <span className="text-slate-200 truncate font-semibold">{item.file.name}</span>
        </div>

        <div className="flex items-center gap-2">
          {item.status === 'pending' && <span className="text-[11px] text-slate-400">En espera</span>}
          {item.status === 'uploading' && (
            <div className="flex items-center gap-2">
              <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">{item.progress}%</span>
            </div>
          )}

          {item.status === 'pending' && (
            <button
              onClick={() => onUploadSingleItem(item)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold rounded-md transition-colors"
            >
              ⬆️ Subir
            </button>
          )}

          <button
            onClick={() => onRemoveItem(item.id)}
            className="text-slate-500 hover:text-red-400 font-bold px-1 transition-colors"
            title="Descartar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 🚨 BLOQUE DE ERROR SI FALLA EL PROCESAMIENTO */}
      {item.status === 'error' && (
        <div className="pt-2 border-t border-red-900/50">
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-lg flex items-start justify-between gap-2">
            <div className="space-y-1">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                ⚠️ Error al procesar la partitura
              </span>
              <p className="text-[11px] text-red-300/80 leading-relaxed">
                {item.errorMessage || 'No se pudo leer el archivo o el PDF no contiene texto procesable.'}
              </p>
            </div>
            <button
              onClick={() => onRemoveItem(item.id)}
              className="px-2.5 py-1 bg-red-900/50 hover:bg-red-800 text-red-200 text-[10px] font-medium rounded transition-colors whitespace-nowrap"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* ✨ REVISIÓN DE METADATOS SOLO SI FUE EXITOSO */}
      {item.status === 'success' && item.backendId && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2.5 bg-slate-900/50 p-3 rounded-lg border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              ✨ Metadatos extraídos por IA/OCR
            </span>
            <span className="text-[10px] text-slate-400 italic">Verifica antes de catalogar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1">Título de la Obra</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2.5 py-1.5 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1">Compositor / Autor</label>
              <input
                type="text"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Compositor"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2.5 py-1.5 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-medium block mb-1">Etiquetas (#Tags)</label>
            <TagInput tags={tags} allTags={globalTags} onChange={setTags} placeholder="Añadir etiqueta y presionar Enter..." />
          </div>

          {customFields.length > 0 && (
            <div className="pt-2 border-t border-slate-800/50">
              <span className="text-[10px] font-bold text-slate-400 block mb-2">Campos personalizados</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {customFields.map((field) => (
                  <div key={field.id}>
                    <label className="text-[10px] text-slate-400 font-medium block mb-1">
                      {field.name}
                    </label>
                    <input
                      type="text"
                      value={customMetadata[field.name] || ''}
                      onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                      placeholder={`Ej: ${field.name}`}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-2.5 py-1.5 outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleConfirm}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow"
            >
              Confirmar y Añadir a Biblioteca
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const UploadQueue: React.FC<UploadQueueProps> = ({
  items,
  globalTags = [],
  customFields = [],
  onStartUpload,
  onUploadSingleItem,
  onRemoveItem,
  onConfirmItem,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="bg-[#0d1322] border border-emerald-500/30 rounded-xl p-4 mb-6 shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
          <span>📥</span> Cola de procesamiento y carga ({items.length})
        </h4>
        {items.some((i) => i.status === 'pending') && (
          <button
            onClick={onStartUpload}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-md"
          >
            🚀 Subir Todos
          </button>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <UploadQueueItem
            key={item.id}
            item={item}
            globalTags={globalTags}
            customFields={customFields}
            onUploadSingleItem={onUploadSingleItem}
            onRemoveItem={onRemoveItem}
            onConfirmItem={onConfirmItem}
          />
        ))}
      </div>
    </div>
  );
};