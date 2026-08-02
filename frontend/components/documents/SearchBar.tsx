import React from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  isSearching,
}) => {
  const T = APP_TEXTS.searchBar;
  return (
    <div className="relative mb-6">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[color:var(--text-muted)] text-sm">
        {T.icon}
      </div>
      <input
        type="text"
        placeholder={T.placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="app-input w-full pl-10 pr-24 py-3 bg-[var(--panel-bg)] border border-[color:var(--border-color)] rounded-xl text-xs text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:border-emerald-500 shadow-md"
      />
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
        {isSearching && (
          <span className="text-[10px] text-[color:var(--accent)] font-semibold animate-pulse bg-[var(--accent-surface)] px-2 py-0.5 rounded border border-[color:var(--accent-border)]">
            {T.filtering}
          </span>
        )}
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-[color:var(--text-subtle)] hover:text-[color:var(--text-secondary)] text-xs font-bold px-1"
          >
            {APP_TEXTS.common.closeIcon}
          </button>
        )}
      </div>
    </div>
  );
};
