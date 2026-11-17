'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'secondary' | 'danger' | 'ghost' | 'copperTint';
  size?: 'sm' | 'md' | 'lg' | 'counter';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const variantCls = {
    primary: 'bp font-semibold shadow-xs',
    dark: 'bk font-semibold shadow-xs',
    secondary: 'bs font-medium',
    danger: 'bd font-semibold shadow-xs',
    ghost: 'bg-transparent text-[#0B2A2F] hover:bg-[#F1EBE3] font-medium',
    copperTint:
      'bg-[#FCEFE4] text-[#8A3D12] border border-[#E2B48F] hover:bg-[#FCE1CB] font-semibold',
  }[variant];

  const sizeCls = {
    sm: 'min-h-[36px] px-3 py-1.5 text-[13px] rounded-[9px]',
    md: 'min-h-[44px] px-4 py-2 text-[14px] rounded-[10px]',
    lg: 'min-h-[48px] px-5 py-2.5 text-[15px] rounded-[12px]',
    counter: 'min-h-[56px] px-5 py-3 text-[16px] rounded-[12px]',
  }[size];

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 select-none whitespace-nowrap ${variantCls} ${sizeCls} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
}
