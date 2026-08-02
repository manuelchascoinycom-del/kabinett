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
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
        {T.icon}
      </div>
      <input
        type="text"
        placeholder={T.placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-10 pr-24 py-3 bg-[#0d1322] border border-slate-800/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-md"
      />
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
        {isSearching && (
          <span className="text-[10px] text-emerald-400 font-semibold animate-pulse bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
            {T.filtering}
          </span>
        )}
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-slate-500 hover:text-slate-300 text-xs font-bold px-1"
          >
            {APP_TEXTS.common.closeIcon}
          </button>
        )}
      </div>
    </div>
  );
};