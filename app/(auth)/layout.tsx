'use client';

import React from 'react';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4EFE9] text-[#0B2A2F]">
      <header className="h-[60px] px-4 sm:px-8 flex items-center justify-between border-b border-[#E7E0D7] bg-white/80 backdrop-blur-xs">
        <Link href="/welcome" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-[#08343A] text-[#E58A4E] font-display font-bold text-[18px] flex items-center justify-center">
            Z
          </div>
          <div>
            <span className="font-display font-bold text-[16px] text-[#0B2A2F]">ZYRO</span>
            <span className="text-[12px] text-[#52666A] ms-1.5 hidden sm:inline">Retail POS</span>
          </div>
        </Link>
        <LanguageSwitcher compact />
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">{children}</main>
    </div>
  );
}
