'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useZyroStore } from '@/services/zyro-store';

export function ToastContainer() {
  const { toasts, dismissToast } = useZyroStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-5 inset-x-4 sm:inset-x-auto sm:end-5 z-[60] flex flex-col gap-2 sm:max-w-[380px] pointer-events-none">
      {toasts.map((toast) => {
        const Icon =
          toast.tone === 'err'
            ? AlertCircle
            : toast.tone === 'warn'
              ? AlertTriangle
              : toast.tone === 'info'
                ? Info
                : CheckCircle2;
        const accent =
          toast.tone === 'err'
            ? 'text-[#F7A59B]'
            : toast.tone === 'warn'
              ? 'text-[#F2D06B]'
              : toast.tone === 'info'
                ? 'text-[#A9C6FF]'
                : 'text-[#7FD6A4]';

        return (
          <div
            key={toast.id}
            className="anim-up pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-[12px] bg-[#08343A] text-white shadow-[0_12px_28px_rgba(10,28,22,.28)] border border-white/10"
          >
            <Icon className={`w-5 h-5 shrink-0 ${accent}`} />
            <span className="text-[14px] font-medium flex-1">{toast.text}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-md text-[#A8C3C5] hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
