'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  width = 'md',
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const wCls = {
    sm: 'max-w-[400px]',
    md: 'max-w-[500px]',
    lg: 'max-w-[640px]',
  }[width];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#08343A]/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`anim-drawer w-full ${wCls} h-full bg-white border-s border-[#E7E0D7] shadow-[-18px_0_48px_rgba(10,28,22,.22)] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#F1EBE3] bg-[#FBF8F4]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {title && (
                <h2 className="font-display text-[18px] font-bold text-[#0B2A2F] truncate">
                  {title}
                </h2>
              )}
              {badge}
            </div>
            {subtitle && <p className="text-[13px] text-[#52666A] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#52666A] hover:bg-[#F1EBE3] shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-[#F1EBE3] bg-[#FBF8F4] flex flex-wrap items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
