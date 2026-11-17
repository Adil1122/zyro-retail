'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Banknote,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  Coins,
  Home,
  Inbox,
  LayoutGrid,
  MapPin,
  Receipt,
  Settings,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import type { NavItemConfig } from '@/constants/navigation';
import { useZyro } from '@/hooks/useZyro';
import { getAllowedNavItems } from '@/lib/permissions';

export function NavIcon({ icon, className = 'w-5 h-5' }: { icon: NavItemConfig['icon']; className?: string }) {
  switch (icon) {
    case 'home':
      return <Home className={className} />;
    case 'bag':
      return <ShoppingBag className={className} />;
    case 'bills':
      return <Receipt className={className} />;
    case 'khata':
      return <BookOpen className={className} />;
    case 'stock':
      return <Boxes className={className} />;
    case 'orders':
      return <Inbox className={className} />;
    case 'cash':
      return <Banknote className={className} />;
    case 'suppliers':
      return <Truck className={className} />;
    case 'expenses':
      return <Coins className={className} />;
    case 'staff':
      return <Users className={className} />;
    case 'reports':
      return <TrendingUp className={className} />;
    case 'settings':
      return <Settings className={className} />;
  }
}

export function Sidebar({ mode }: { mode: 'desk' | 'tablet' }) {
  const pathname = usePathname();
  const { role, session, setBranch, t } = useZyro();
  const [branchMenu, setBranchMenu] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!branchMenu && !moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (asideRef.current && !asideRef.current.contains(e.target as Node)) {
        setBranchMenu(false);
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBranchMenu(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [branchMenu, moreOpen]);

  const allowed = getAllowedNavItems(role);
  const mainNav = allowed.filter((n) => n.group === 'main');
  const officeNav = allowed.filter((n) => n.group === 'office');
  const footNav = allowed.filter((n) => n.group === 'foot');
  const extraNav = [...officeNav, ...footNav];

  const activeBranch =
    session.branches.find((b) => b.id === session.branchId) || session.branches[0];

  const isActive = (n: NavItemConfig) => {
    if (n.href === '/dashboard') return pathname === '/' || pathname === '/dashboard';
    if (n.href === '/pos/bills') return pathname.startsWith('/pos/bills') || pathname.startsWith('/pos/printer');
    if (n.href === '/pos') return pathname === '/pos' || (pathname.startsWith('/pos/') && !pathname.startsWith('/pos/bills') && !pathname.startsWith('/pos/printer'));
    return pathname === n.href || pathname.startsWith(n.href + '/');
  };

  if (mode === 'tablet') {
    return (
      <aside
        ref={asideRef}
        className="w-[84px] shrink-0 bg-[#08343A] text-white flex flex-col items-center py-3 justify-between border-e border-white/10 relative z-30"
      >
        <div className="flex flex-col items-center gap-2 w-full px-2">
          <Link
            href="/dashboard"
            className="w-11 h-11 rounded-[12px] bg-[#E58A4E] text-[#08343A] font-display font-bold text-[18px] flex items-center justify-center"
            title={session.shopName}
          >
            Z
          </Link>
          <button
            type="button"
            onClick={() => {
              setBranchMenu((v) => !v);
              setMoreOpen(false);
            }}
            title={`${session.shopName} · ${activeBranch.name}`}
            className={`w-full py-1.5 px-1 rounded-[10px] flex flex-col items-center gap-0.5 transition-colors mb-1 ${
              branchMenu ? 'bg-white/15 text-white' : 'text-[#C9DADB] hover:bg-white/10 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#E58A4E]" />
            <span className="text-[10px] font-medium truncate max-w-full">
              {activeBranch.name.replace(/\s+branch$/i, '')}
            </span>
          </button>
          {mainNav.map((n) => {
            const on = isActive(n);
            const label = t(n.id === 'bills' ? 'billsShort' : n.id);
            return (
              <Link
                key={n.id}
                href={n.href}
                className={`w-full py-2 px-1 rounded-[12px] flex flex-col items-center gap-1 transition-colors ${
                  on
                    ? 'bg-white/10 text-white font-bold'
                    : 'text-[#A8C3C5] hover:bg-white/7 hover:text-white font-medium'
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center border ${
                    on
                      ? 'bg-[#E58A4E] text-[#08343A] border-[#E58A4E]'
                      : 'border-white/10 text-[#C9DADB]'
                  }`}
                >
                  <NavIcon icon={n.icon} className="w-4 h-4" />
                </span>
                <span className="text-[11px] truncate max-w-full">{label}</span>
              </Link>
            );
          })}
          {extraNav.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMoreOpen((v) => !v);
                setBranchMenu(false);
              }}
              className="w-full py-2 px-1 rounded-[12px] flex flex-col items-center gap-1 text-[#A8C3C5] hover:bg-white/7 hover:text-white"
            >
              <span className="w-9 h-9 rounded-[10px] flex items-center justify-center border border-white/10 text-[#C9DADB]">
                <LayoutGrid className="w-4 h-4" />
              </span>
              <span className="text-[11px]">{t('more')}</span>
            </button>
          )}
        </div>

        {branchMenu && (
          <div className="anim-up absolute start-[92px] top-3 z-50 w-[230px] rounded-[14px] bg-white text-[#0B2A2F] border border-[#E7E0D7] shadow-[0_18px_48px_rgba(10,28,22,.22)] p-2">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#52666A]">
              {session.shopName} · Branches
            </div>
            {session.branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBranch(b.id);
                  setBranchMenu(false);
                }}
                className={`w-full px-3 py-2 rounded-[10px] text-start text-[13px] flex items-center justify-between gap-2 ${
                  b.id === session.branchId
                    ? 'bg-[#FCEFE4] text-[#8A3D12] font-semibold'
                    : 'hover:bg-[#F8F4EF]'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate">{b.name}</div>
                  <div className="text-[11px] text-[#52666A]">{b.city}</div>
                </div>
                {b.id === session.branchId && <Check className="w-4 h-4 text-[#C9682E] shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {moreOpen && (
          <div className="anim-up absolute start-[92px] bottom-4 z-50 w-[220px] rounded-[14px] bg-white text-[#0B2A2F] border border-[#E7E0D7] shadow-[0_18px_48px_rgba(10,28,22,.22)] p-2">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#52666A]">
              {t('backOffice')}
            </div>
            {extraNav.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[14px] font-medium ${
                  isActive(n) ? 'bg-[#FCEFE4] text-[#8A3D12] font-semibold' : 'hover:bg-[#F8F4EF]'
                }`}
              >
                <NavIcon icon={n.icon} className="w-4 h-4" />
                <span>{t(n.id)}</span>
              </Link>
            ))}
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside
      ref={asideRef}
      className="w-[248px] shrink-0 bg-[#08343A] text-white flex flex-col justify-between border-e border-white/10 relative z-30"
    >
      <div className="p-3 space-y-4 overflow-y-auto">
        {/* Brand + Branch selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setBranchMenu((v) => !v)}
            className="w-full flex items-center gap-2.5 p-2 rounded-[12px] hover:bg-white/10 transition-colors text-start"
          >
            <div className="w-9 h-9 rounded-[10px] bg-[#E58A4E] text-[#08343A] font-display font-bold text-[17px] flex items-center justify-center shrink-0">
              Z
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold text-[15px] text-white truncate">
                {session.shopName}
              </div>
              <div className="text-[12px] text-[#C9DADB] truncate">{activeBranch.name}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-[#A8C3C5] shrink-0" />
          </button>

          {branchMenu && (
            <div className="absolute top-full mt-1.5 inset-x-0 z-50 rounded-[12px] bg-white text-[#0B2A2F] border border-[#E7E0D7] shadow-lg p-1.5">
              {session.branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setBranch(b.id);
                    setBranchMenu(false);
                  }}
                  className={`w-full px-3 py-2 rounded-[8px] text-start text-[13px] flex items-center justify-between ${
                    b.id === session.branchId
                      ? 'bg-[#FCEFE4] text-[#8A3D12] font-semibold'
                      : 'hover:bg-[#F8F4EF]'
                  }`}
                >
                  <span>{b.name}</span>
                  <span className="text-[11px] text-[#52666A]">{b.city}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main navigation */}
        <nav className="space-y-1">
          {mainNav.map((n) => {
            const on = isActive(n);
            return (
              <Link
                key={n.id}
                href={n.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] transition-colors ${
                  on
                    ? 'bg-white/10 text-white font-bold'
                    : 'text-[#C9DADB] hover:bg-white/7 hover:text-white font-medium'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${
                    on ? 'bg-[#E58A4E] text-[#08343A]' : 'text-[#C9DADB]'
                  }`}
                >
                  <NavIcon icon={n.icon} className="w-4 h-4" />
                </span>
                <span className="truncate">{t(n.id)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back office group */}
        {officeNav.length > 0 && (
          <div className="pt-2 border-t border-white/10 space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#A8C3C5]">
              {t('backOffice')}
            </div>
            {officeNav.map((n) => {
              const on = isActive(n);
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] transition-colors ${
                    on
                      ? 'bg-white/10 text-white font-bold'
                      : 'text-[#C9DADB] hover:bg-white/7 hover:text-white font-medium'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${
                      on ? 'bg-[#E58A4E] text-[#08343A]' : 'text-[#C9DADB]'
                    }`}
                  >
                    <NavIcon icon={n.icon} className="w-4 h-4" />
                  </span>
                  <span className="truncate">{t(n.id)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer nav (Settings) */}
      {footNav.length > 0 && (
        <div className="p-3 border-t border-white/10 space-y-1">
          {footNav.map((n) => {
            const on = isActive(n);
            return (
              <Link
                key={n.id}
                href={n.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] transition-colors ${
                  on
                    ? 'bg-white/10 text-white font-bold'
                    : 'text-[#C9DADB] hover:bg-white/7 hover:text-white font-medium'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${
                    on ? 'bg-[#E58A4E] text-[#08343A]' : 'text-[#C9DADB]'
                  }`}
                >
                  <NavIcon icon={n.icon} className="w-4 h-4" />
                </span>
                <span className="truncate">{t(n.id)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}
