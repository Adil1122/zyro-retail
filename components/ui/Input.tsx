'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
}

export function Input({
  label,
  hint,
  error,
  prefixNode,
  suffixNode,
  className = '',
  id,
  ...rest
}: InputProps) {
  const inputId = id || (label ? `inp-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-semibold text-[#0B2A2F]">
          {label}
        </label>
      )}
      <div
        className={`field flex items-center gap-2 min-h-[44px] px-3 rounded-[10px] border bg-white ${
          error ? 'err border-[#B42318]' : 'border-[#8A8276]'
        } ${className}`}
      >
        {prefixNode && <span className="text-[#52666A] text-[14px] shrink-0">{prefixNode}</span>}
        <input
          id={inputId}
          className="w-full bg-transparent text-[15px] text-[#0B2A2F] placeholder:text-[#52666A] focus:outline-none min-w-0"
          {...rest}
        />
        {suffixNode && <span className="text-[#52666A] text-[13px] shrink-0">{suffixNode}</span>}
      </div>
      {error ? (
        <p className="text-[12px] font-medium text-[#B42318]">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-[#52666A]">{hint}</p>
      ) : null}
    </div>
  );
}
