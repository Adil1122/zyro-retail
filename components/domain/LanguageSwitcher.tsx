'use client';

import React from 'react';
import { LANG_OPTIONS } from '@/constants/i18n';
import { useZyro } from '@/hooks/useZyro';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLanguage } = useZyro();

  return (
    <div className="inline-flex items-center p-0.5 rounded-[10px] bg-[#EAE3D9] border border-[#D6CDC1]">
      {LANG_OPTIONS.map((opt) => {
        const active = lang === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLanguage(opt.id)}
            style={{ fontFamily: opt.font }}
            className={`px-2.5 py-1 rounded-[8px] text-[12px] font-semibold transition-all ${
              active
                ? 'bg-white text-[#0B2A2F] shadow-[0_1px_2px_rgba(15,31,25,.08)]'
                : 'text-[#3D5357] hover:text-[#0B2A2F]'
            }`}
          >
            {compact ? opt.shortLabel : opt.label}
          </button>
        );
      })}
    </div>
  );
}
