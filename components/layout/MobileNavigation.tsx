'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { isNavModuleEnabled, type NavItemConfig } from '@/constants/navigation';
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
      <nav className="fixed bottom-0 inset-x-0 z-40 h-[64px] bg-white border-t border-[#E7E0D7] flex items-center">
        {tabs.map((n) => {
          const enabled = isNavModuleEnabled(n.id);
          const on = enabled && isActive(n);
          const label = t(n.id === 'bills' ? 'billsShort' : n.id);
          if (!enabled) {
            return (
              <div
                key={n.id}
                role="link"
                aria-disabled="true"
                title="Temporarily inactive"
                className="flex-1 h-full flex flex-col items-center justify-center gap-[2px] text-[12px] text-[#52666A] font-medium opacity-40 cursor-not-allowed select-none"
              >
                <span className="w-[32px] h-[32px] rounded-full flex items-center justify-center">
                  <NavIcon icon={n.icon} className="w-[18px] h-[18px]" />
                </span>
                <span className="truncate max-w-[70px]">{label}</span>
              </div>
            );
          }
          return (
            <Link
              key={n.id}
              href={n.href}
              className={`tab flex-1 h-full flex flex-col items-center justify-center gap-[2px] text-[12px] ${
                on ? 'text-[#08343A] font-bold' : 'text-[#52666A] font-medium'
              }`}
            >
              <span
                className={`w-[32px] h-[32px] rounded-full flex items-center justify-center ${
                  on ? 'bg-[#E58A4E] text-[#08343A]' : ''
                }`}
              >
                <NavIcon icon={n.icon} className="w-[18px] h-[18px]" />
              </span>
              <span className="truncate max-w-[70px]">{label}</span>
            </Link>
          );
        })}

        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`tab flex-1 h-full flex flex-col items-center justify-center gap-[2px] text-[12px] ${
              restActive ? 'text-[#08343A] font-bold' : 'text-[#52666A] font-medium'
            }`}
          >
            <span
              className={`w-[32px] h-[32px] rounded-full flex items-center justify-center ${
                restActive ? 'bg-[#E58A4E] text-[#08343A]' : ''
              }`}
            >
              <LayoutGrid className="w-[18px] h-[18px]" />
            </span>
            <span>{t('more')}</span>
          </button>
        )}
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t('more')} maxWidth="sm">
        <div className="grid grid-cols-2 gap-2.5">
          {rest.map((n) => {
            const enabled = isNavModuleEnabled(n.id);
            const on = enabled && isActive(n);
            if (!enabled) {
              return (
                <div
                  key={n.id}
                  role="link"
                  aria-disabled="true"
                  title="Temporarily inactive"
                  className="flex items-center gap-3 p-3.5 rounded-[12px] border border-[#E7E0D7] bg-[#FBF8F4] text-[14px] font-semibold text-[#52666A] opacity-45 cursor-not-allowed select-none"
                >
                  <NavIcon icon={n.icon} className="w-5 h-5 shrink-0 text-[#52666A]" />
                  <span className="truncate">{t(n.id)}</span>
                </div>
              );
            }
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
