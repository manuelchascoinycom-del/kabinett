'use client';

import React from 'react';

interface CustomField {
  id: string;
  name: string;
  field_type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
}

interface FacetedFiltersProps {
  facets: {
    composerCounts: Record<string, number>;
    tagCounts: Record<string, number>;
  };
  selectedComposers: string[];
  selectedTags: string[];
  selectedCustomFilters: Record<string, string>;
  customFields: CustomField[];
  hasActiveFilters: boolean;
  onToggleComposer: (composer: string) => void;
  onToggleTag: (tag: string) => void;
  onChangeCustomFilter: (fieldName: string, value: string) => void;
  onClearAllFilters: () => void;
}

export const FacetedFilters: React.FC<FacetedFiltersProps> = ({
  facets,
  selectedComposers,
  selectedTags,
  selectedCustomFilters,
  customFields,
  hasActiveFilters,
  onToggleComposer,
  onToggleTag,
  onChangeCustomFilter,
  onClearAllFilters,
}) => {
  return (
    <aside className="w-64 bg-[#0b101d] border-r border-slate-800/80 p-5 shrink-0 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🎛️</span> Filtros Facetados
          </h2>
          {hasActiveFilters && (
            <button onClick={onClearAllFilters} className="text-[10px] text-emerald-400 hover:underline font-semibold">
              Limpiar todo
            </button>
          )}
        </div>

        {/* Faceta: Compositores */}
        {Object.keys(facets.composerCounts).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 mb-2">Compositores / Autores</h3>
            <div className="space-y-1">
              {Object.entries(facets.composerCounts).map(([composer, count]) => {
                const isSelected = selectedComposers.includes(composer);
                return (
                  <button
                    key={composer}
                    onClick={() => onToggleComposer(composer)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium'
                        : 'text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900"
                      />
                      {composer}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Faceta: Etiquetas (#Tags) */}
        {Object.keys(facets.tagCounts).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 mb-2">Etiquetas (#Tags)</h3>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(facets.tagCounts).map(([tag, count]) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(tag)}
                    className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    #{tag}
                    <span className="text-[9px] opacity-70 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Facetas por Campos Personalizados */}
        {customFields.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80">
            <h3 className="text-xs font-semibold text-slate-400 mb-2">Campos Personalizados</h3>
            <div className="space-y-3">
              {customFields.map((field) => (
                <div key={field.id}>
                  <label className="text-[11px] text-slate-400 block mb-1">{field.name}</label>
                  <input
                    type="text"
                    placeholder={`Filtrar por ${field.name}...`}
                    value={selectedCustomFilters[field.name] || ''}
                    onChange={(e) => onChangeCustomFilter(field.name, e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};