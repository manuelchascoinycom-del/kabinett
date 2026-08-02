'use client';

import React from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

interface CustomField {
  id: string;
  name: string;
  field_type?: 'text' | 'number' | 'select' | 'boolean' | string;
  type?: string;
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
  const T = APP_TEXTS.facetedFilters;

  return (
    <aside className="w-64 bg-[var(--sidebar-bg)] border-r border-[color:var(--border-color)] p-5 shrink-0 flex flex-col justify-between overflow-y-auto transition-colors duration-200">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[color:var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <span>{T.titleIcon}</span> {T.title}
          </h2>
          {hasActiveFilters && (
            <button onClick={onClearAllFilters} className="text-[10px] text-[color:var(--accent)] hover:underline font-semibold">
              {T.clearAllBtn}
            </button>
          )}
        </div>

        {Object.keys(facets.composerCounts).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[color:var(--text-muted)] mb-2">{T.composersSection}</h3>
            <div className="space-y-1">
              {Object.entries(facets.composerCounts).map(([composer, count]) => {
                const isSelected = selectedComposers.includes(composer);
                return (
                  <button
                    key={composer}
                    onClick={() => onToggleComposer(composer)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-soft)] text-[color:var(--accent)] border border-[color:var(--accent-border)] font-medium'
                        : 'text-[color:var(--text-muted)] hover:bg-[var(--panel-hover)] hover:text-[color:var(--text-secondary)]'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-[color:var(--border-color)] text-emerald-500 focus:ring-0 bg-[var(--input-bg)]"
                      />
                      {composer}
                    </span>
                    <span className="text-[10px] text-[color:var(--text-subtle)] font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {Object.keys(facets.tagCounts).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[color:var(--text-muted)] mb-2">{T.tagsSection}</h3>
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
                        : 'bg-[var(--panel-bg)] border-[color:var(--border-color)] text-[color:var(--text-muted)] hover:border-[color:var(--border-hover)]'
                    }`}
                  >
                    {APP_TEXTS.tagInput.tagPrefix}{tag}
                    <span className="text-[9px] opacity-70 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {customFields.length > 0 && (
          <div className="pt-3 border-t border-[color:var(--border-color)]">
            <h3 className="text-xs font-semibold text-[color:var(--text-muted)] mb-2">{T.customFieldsSection}</h3>
            <div className="space-y-3">
              {customFields.map((field) => {
                const fieldType = field.field_type || field.type;
                const value = selectedCustomFilters[field.name] || '';

                return (
                  <div key={field.id}>
                    <label className="text-[11px] text-[color:var(--text-muted)] block mb-1">{field.name}</label>

                    {fieldType === 'select' ? (
                      <select
                        value={value}
                        onChange={(e) => onChangeCustomFilter(field.name, e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] rounded px-2 py-1 text-xs text-[color:var(--text-primary)] outline-none focus:border-emerald-500"
                      >
                        <option value="">{T.selectAllCustomField.replace('{fieldName}', field.name)}</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={fieldType === 'number' ? 'number' : 'text'}
                        placeholder={T.filterByCustomFieldPlaceholder.replace('{fieldName}', field.name)}
                        value={value}
                        onChange={(e) => onChangeCustomFilter(field.name, e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-[color:var(--border-color)] rounded px-2.5 py-1 text-xs text-[color:var(--text-primary)] outline-none focus:border-emerald-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
