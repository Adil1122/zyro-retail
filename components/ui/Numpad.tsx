'use client';

import React from 'react';
import { Delete } from 'lucide-react';

export interface NumpadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  extraKey?: string;
}

export function Numpad({ onDigit, onBackspace, onClear, extraKey = '00' }: NumpadProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', extraKey, '0'];

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => {
            if (k === 'C' && onClear) onClear();
            else onDigit(k);
          }}
          className="min-h-[54px] rounded-[12px] border border-[#E7E0D7] bg-white hover:bg-[#F1EBE3] active:scale-[0.96] active:bg-[#EAE3D9] text-[20px] font-bold text-[#0B2A2F] num transition-all"
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        onClick={onBackspace}
        aria-label="Backspace"
        className="min-h-[54px] rounded-[12px] border border-[#E7E0D7] bg-[#FBF8F4] hover:bg-[#F1EBE3] active:scale-[0.96] text-[#0B2A2F] flex items-center justify-center transition-all"
      >
        <Delete className="w-5 h-5" />
      </button>
    </div>
  );
}
