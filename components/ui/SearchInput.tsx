'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  rightSlot?: React.ReactNode;
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  onSubmit,
  rightSlot,
  className = '',
  autoFocus,
}: SearchInputProps) {
  return (
    <div
      className={`field flex items-center gap-2 min-h-[44px] px-3 rounded-[10px] border border-[#8A8276] bg-white ${className}`}
    >
      <Search className="w-4 h-4 text-[#52666A] shrink-0" />
      <input
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmit) onSubmit();
        }}
        placeholder={placeholder}
        className="w-full bg-transparent text-[14px] text-[#0B2A2F] placeholder:text-[#52666A] focus:outline-none min-w-0"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="p-1 rounded-md text-[#52666A] hover:bg-[#F1EBE3]"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {rightSlot}
    </div>
  );
}
