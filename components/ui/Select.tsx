'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export function Select({ label, options, error, className = '', id, ...rest }: SelectProps) {
  const selectId = id || (label ? `sel-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={selectId} className="text-[13px] font-semibold text-[#0B2A2F]">
          {label}
        </label>
      )}
      <div
        className={`field relative flex items-center min-h-[44px] rounded-[10px] border bg-white ${
          error ? 'err border-[#B42318]' : 'border-[#8A8276]'
        } ${className}`}
      >
        <select
          id={selectId}
          className="w-full appearance-none bg-transparent ps-3 pe-9 py-2 text-[14px] font-medium text-[#0B2A2F] focus:outline-none"
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-[#52666A] pointer-events-none absolute end-3" />
      </div>
      {error && <p className="text-[12px] font-medium text-[#B42318]">{error}</p>}
    </div>
  );
}
