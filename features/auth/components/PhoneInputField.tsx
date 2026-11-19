'use client';

import React from 'react';
import { COUNTRY_OPTIONS } from '@/features/auth/types/auth.types';

interface PhoneInputFieldProps {
  id: string;
  label?: string;
  dialCode: string;
  onDialCodeChange: (dialCode: string) => void;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  helperText?: string;
  disabled?: boolean;
  onEnter?: () => void;
}

export function PhoneInputField({
  id,
  label = 'Mobile number',
  dialCode,
  onDialCodeChange,
  value,
  onChange,
  hasError = false,
  helperText,
  disabled = false,
  onEnter,
}: PhoneInputFieldProps) {
  const selectedCountry = COUNTRY_OPTIONS.find((c) => c.dialCode === dialCode) || COUNTRY_OPTIONS[0];

  return (
    <div className="flex flex-col gap-1.5 max-w-[440px]">
      <label htmlFor={id} className="text-[14px] font-semibold text-[#3D5357]">
        {label}
      </label>
      <div
        dir="ltr"
        className={`field flex items-stretch h-[56px] rounded-[12px] bg-white overflow-hidden ${
          hasError ? 'border-2 border-[#B42318]' : 'border border-[#8A8276]'
        }`}
      >
        <select
          aria-label="Country code"
          value={dialCode}
          disabled={disabled}
          onChange={(e) => onDialCodeChange(e.target.value)}
          className="shrink-0 px-2.5 bg-[#FBF8F4] border-r border-[#E7E0D7] text-[16px] font-semibold text-[#3D5357] outline-none cursor-pointer"
        >
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.dialCode}>
              {c.code} {c.dialCode}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d ]/g, '').slice(0, 15))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) onEnter();
          }}
          placeholder={selectedCountry.placeholder}
          className="flex-1 min-w-0 border-0 outline-none px-3.5 text-[20px] font-semibold tracking-[0.02em] bg-transparent text-[#0B2A2F] disabled:opacity-60"
        />
      </div>
      <span className="text-[14px] leading-[1.5] text-[#52666A]">
        {helperText ??
          (dialCode === '+92'
            ? '10 digits after +92, starting with 3'
            : `Enter your mobile number without the leading 0 (${selectedCountry.name})`)}
      </span>
    </div>
  );
}
