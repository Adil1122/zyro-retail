'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { NavItemConfig } from '@/constants/navigation';
import { useZyro } from '@/hooks/useZyro';
import { getAllowedNavItems } from '@/lib/permissions';
import { NavIcon } from './Sidebar';

export function MobileNavigation() {
  const pathname = usePathname();
  const { role, t } = useZyro();
  const [moreOpen, setMoreOpen] = useState(false);

  const allowed = getAllowedNavItems(role);
  const flat = allowed.filter((n) => n.group !== 'foot');
  const foot = allowed.filter((n) => n.group === 'foot');
  const tabs = flat.slice(0, 4);
  const rest = [...flat.slice(4), ...foot];

  const isActive = (n: NavItemConfig) => {
    if (n.href === '/dashboard') return pathname === '/' || pathname === '/dashboard';
    return pathname === n.href || pathname.startsWith(n.href + '/');
  };

  const restActive = rest.some(isActive);

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 h-[64px] bg-white border-t border-[#E7E0D7] flex items-center justify-around px-1 shadow-[0_-4px_16px_rgba(10,28,22,.06)]">
        {tabs.map((n) => {
          const on = isActive(n);
          const label = t(n.id === 'bills' ? 'billsShort' : n.id);
          return (
            <Link
              key={n.id}
              href={n.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-[10px] ${
                on ? 'text-[#08343A] font-semibold' : 'text-[#52666A] font-medium'
              }`}
            >
              <span
                className={`px-3 py-1 rounded-full flex items-center justify-center ${
                  on ? 'bg-[#E58A4E] text-[#08343A]' : ''
                }`}
              >
                <NavIcon icon={n.icon} className="w-4 h-4" />
              </span>
              <span className="text-[11px] truncate max-w-[70px]">{label}</span>
            </Link>
          );
        })}

        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-[10px] ${
              restActive ? 'text-[#08343A] font-semibold' : 'text-[#52666A] font-medium'
            }`}
          >
            <span
              className={`px-3 py-1 rounded-full flex items-center justify-center ${
                restActive ? 'bg-[#E58A4E] text-[#08343A]' : ''
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </span>
            <span className="text-[11px]">{t('more')}</span>
          </button>
        )}
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t('more')} maxWidth="sm">
        <div className="grid grid-cols-2 gap-2.5">
          {rest.map((n) => {
            const on = isActive(n);
            return (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 p-3.5 rounded-[12px] border text-[14px] font-semibold ${
                  on
                    ? 'bg-[#FCEFE4] border-[#E2B48F] text-[#8A3D12]'
                    : 'bg-white border-[#E7E0D7] text-[#0B2A2F] hover:bg-[#F8F4EF]'
                }`}
              >
                <NavIcon icon={n.icon} className="w-5 h-5 shrink-0 text-[#08343A]" />
                <span className="truncate">{t(n.id)}</span>
              </Link>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
