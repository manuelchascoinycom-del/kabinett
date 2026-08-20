'use client';

import React, { useState } from 'react';
import { APP_TEXTS } from '@/app/constants/texts';

interface TagInputProps {
  tags?: string[];
  allTags?: string[];
  onChange: (newTags: string[]) => void;
}

export function TagInput({ tags = [], allTags = [], onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const currentTags = Array.isArray(tags) ? tags : [];
  const safeAllTags = Array.isArray(allTags) ? allTags : [];
  const T = APP_TEXTS.tagInput;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim().length > 0) {
      const filtered = safeAllTags.filter(
        (t) =>
          t &&
          typeof t === 'string' &&
          t.toLowerCase().includes(value.toLowerCase()) &&
          !currentTags.includes(t)
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const addTag = (tagToAdd: string) => {
    const cleaned = tagToAdd.trim().replace(/,/g, '');
    if (cleaned && !currentTags.includes(cleaned)) {
      onChange([...currentTags, cleaned]);
    }
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(currentTags.filter((t) => t !== tagToRemove));
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  return (
    <div className="relative w-full">
      <div className="bg-[var(--input-bg)] border border-[color:var(--border-color)] rounded-lg p-2 flex flex-wrap gap-1.5 items-center min-h-[42px] focus-within:border-emerald-500 transition-colors">
        {currentTags.map((tag) => (
          <span
            key={tag}
            className="bg-[var(--accent-surface)] border border-[color:var(--accent-border)] text-[color:var(--accent)] text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-medium"
          >
            {T.tagPrefix}{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-emerald-500 text-[color:var(--accent)] font-bold text-xs"
            >
              {APP_TEXTS.common.closeIcon}
            </button>
          </span>
        ))}

        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={
            currentTags.length === 0
              ? T.placeholderEmpty
              : T.placeholderAdd
          }
          className="bg-transparent text-xs text-[color:var(--text-primary)] outline-none flex-1 min-w-[140px] px-1 placeholder:text-[color:var(--text-muted)]"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[var(--panel-bg)] border border-[color:var(--border-color)] rounded-lg shadow-xl max-h-40 overflow-y-auto">
          {suggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              onMouseDown={() => addTag(sug)}
              className="w-full text-left px-3 py-2 text-xs text-[color:var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[color:var(--accent)] flex items-center justify-between"
            >
              <span>{T.tagPrefix}{sug}</span>
              <span className="text-[10px] text-[color:var(--text-subtle)] font-semibold">
                {T.existingLabel}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
