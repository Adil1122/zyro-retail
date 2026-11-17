'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const mw = {
    sm: 'max-w-[420px]',
    md: 'max-w-[560px]',
    lg: 'max-w-[720px]',
    xl: 'max-w-[880px]',
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#08343A]/45 backdrop-blur-[1px] p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`anim-sheet w-full ${mw} bg-white rounded-t-[20px] sm:rounded-[18px] border border-[#E7E0D7] shadow-[0_24px_64px_rgba(10,28,22,.3)] flex flex-col max-h-[92vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#F1EBE3]">
            <div>
              {title && (
                <h2 className="font-display text-[18px] font-bold text-[#0B2A2F] leading-snug">
                  {title}
                </h2>
              )}
              {subtitle && <p className="text-[13px] text-[#52666A] mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#52666A] hover:bg-[#F1EBE3]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
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
