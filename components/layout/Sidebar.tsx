'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Banknote,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  Coins,
  ExternalLink,
  Home,
  Inbox,
  LayoutGrid,
  LogOut,
  MapPin,
  MoreHorizontal,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { ROLE_DISPLAY_NAMES, type NavItemConfig } from '@/constants/navigation';
import { SignOutConfirmModal } from '@/features/auth/components/SignOutConfirmModal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useZyro } from '@/hooks/useZyro';
import { getAllowedNavItems } from '@/lib/permissions';
import type { LanguageId, RoleId } from '@/types';

export function NavIcon({ icon, className = 'w-[17px] h-[17px]' }: { icon: NavItemConfig['icon']; className?: string }) {
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
  const router = useRouter();
  const auth = useAuth();
  const { role, user, session, lang, setLanguage, setBranch, setRole, signOut, notify, t } = useZyro();
  const [branchMenu, setBranchMenu] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [staffMenu, setStaffMenu] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!branchMenu && !moreOpen && !staffMenu) return;
    const onDown = (e: MouseEvent) => {
      if (asideRef.current && !asideRef.current.contains(e.target as Node)) {
        setBranchMenu(false);
        setMoreOpen(false);
        setStaffMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBranchMenu(false);
        setMoreOpen(false);
        setStaffMenu(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [branchMenu, moreOpen, staffMenu]);

  const allowed = getAllowedNavItems(role, auth.configured ? auth.permissions : undefined);
  const mainNav = allowed.filter((n) => n.group === 'main');
  const officeNav = allowed.filter((n) => n.group === 'office');
  const footNav = allowed.filter((n) => n.group === 'foot');
  const extraNav = [...officeNav, ...footNav];

  const activeBranch = useMemo(
    () => session.branches.find((b) => b.id === session.branchId) || session.branches[0],
    [session.branches, session.branchId]
  );

  const isActive = (n: NavItemConfig) => {
    if (n.href === '/dashboard') {
      return (
        pathname === '/' ||
        pathname === '/dashboard' ||
        pathname === '/home' ||
        pathname === '/cashier/home' ||
        pathname === '/stockkeeper/home'
      );
    }
    if (n.href === '/pos/bills') return pathname.startsWith('/pos/bills') || pathname.startsWith('/pos/printer');
    if (n.href === '/pos') return pathname === '/pos' || (pathname.startsWith('/pos/') && !pathname.startsWith('/pos/bills') && !pathname.startsWith('/pos/printer'));
    return pathname === n.href || pathname.startsWith(n.href + '/');
  };

  const switchRoleTo = (target: RoleId) => {
    setRole(target);
    setStaffMenu(false);
    notify(`Switched active view to ${ROLE_DISPLAY_NAMES[target]}`, 'info');
    router.push('/dashboard');
  };

  const activeRoleLabel = auth.activeMembership?.roleDisplayName || ROLE_DISPLAY_NAMES[role];
  const hasMultipleWorkspaces =
    auth.configured &&
    auth.session.memberships.filter((m) => m.memberStatus === 'active' && m.businessStatus === 'active').length > 1;

  const confirmSignOut = async () => {
    setSignOutOpen(false);
    setStaffMenu(false);
    await auth.signOut();
    signOut();
    notify('Signed out', 'info');
    router.push('/welcome');
  };

  const staffMenuPopover = staffMenu && (
    <div
      role="dialog"
      aria-label="Account and role menu"
      className={`anim-up absolute z-50 w-[264px] rounded-[16px] bg-white text-[#0B2A2F] border border-[#E7E0D7] shadow-[0_18px_48px_rgba(10,28,22,.22)] p-2 ${
        mode === 'tablet' ? 'start-[92px] bottom-3' : 'start-3 bottom-[72px]'
      }`}
    >
      <div className="px-2.5 py-2 border-b border-[#F1EBE3]">
        <div className="text-[14px] font-bold text-[#0B2A2F]">{user.name}</div>
        <div className="text-[12px] text-[#52666A]">{activeRoleLabel} · {activeBranch.name}</div>
      </div>

      {/* Language switcher */}
      <div className="px-2 py-2 border-b border-[#F1EBE3]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#52666A] mb-1.5 px-0.5">
          Language
        </div>
        <div className="grid grid-cols-3 gap-1 p-0.5 rounded-[10px] bg-[#EAE3D9]">
          {(
            [
              { id: 'en', label: 'English' },
              { id: 'roman', label: 'Roman' },
              { id: 'ur', label: 'اردو' },
            ] as { id: LanguageId; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLanguage(opt.id)}
              className={`h-[30px] rounded-[8px] text-[12px] font-semibold transition-all ${
                lang === opt.id
                  ? 'bg-white text-[#0B2A2F] shadow-xs'
                  : 'text-[#3D5357] hover:text-[#0B2A2F]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Role switcher (only available in unconfigured local preview mode; live auth enforces DB roles) */}
      {!auth.configured && (
        <div className="py-1.5 border-b border-[#F1EBE3]">
          <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#52666A]">
            Switch role
          </div>
          {(
            [
              { id: 'owner', label: 'Owner', sub: 'Hamza Sheikh', icon: <ShieldCheck className="w-4 h-4" /> },
              { id: 'cashier', label: 'Cashier', sub: 'Ali Hassan', icon: <User className="w-4 h-4" /> },
              { id: 'inventory', label: 'Stockkeeper', sub: 'Faraz Ahmed', icon: <Boxes className="w-4 h-4" /> },
            ] as { id: RoleId; label: string; sub: string; icon: React.ReactNode }[]
          ).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => switchRoleTo(r.id)}
              className={`w-full px-2.5 py-2 rounded-[10px] text-start text-[13px] flex items-center justify-between gap-2 ${
                role === r.id ? 'bg-[#FCEFE4] text-[#8A3D12] font-semibold' : 'hover:bg-[#F8F4EF]'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {r.icon}
                <span className="truncate">{r.label}</span>
                <span className="text-[11px] text-[#52666A] font-normal">· {r.sub}</span>
              </span>
              {role === r.id && <Check className="w-4 h-4 text-[#C9682E] shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="pt-1.5 space-y-0.5">
        {hasMultipleWorkspaces && (
          <button
            type="button"
            onClick={() => {
              setStaffMenu(false);
              router.push('/select-workspace');
            }}
            className="w-full px-2.5 py-2 rounded-[10px] text-start text-[13px] font-medium hover:bg-[#F8F4EF] flex items-center gap-2"
          >
            <LayoutGrid className="w-4 h-4 text-[#3D5357]" />
            <span>Switch business</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setStaffMenu(false);
            router.push('/counter-sign-in');
          }}
          className="w-full px-2.5 py-2 rounded-[10px] text-start text-[13px] font-medium hover:bg-[#F8F4EF] flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4 text-[#3D5357]" />
          <span>Counter PIN sign-in</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setStaffMenu(false);
            setSignOutOpen(true);
          }}
          className="w-full px-2.5 py-2 rounded-[10px] text-start text-[13px] font-semibold text-[#B42318] hover:bg-[#FDF0EF] flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('signOut')}</span>
        </button>
      </div>
    </div>
  );

  const signOutModal = (
    <SignOutConfirmModal
      open={signOutOpen}
      userName={user.name}
      shopName={session.shopName}
      onCancel={() => setSignOutOpen(false)}
      onConfirm={confirmSignOut}
    />
  );

  if (mode === 'tablet') {
    return (
      <aside
        ref={asideRef}
        aria-label="Main navigation"
        className="w-[84px] shrink-0 bg-[#08343A] text-white flex flex-col items-center py-3 pb-2.5 gap-[2px] relative z-30"
      >
        <button
          type="button"
          onClick={() => {
            setBranchMenu((v) => !v);
            setMoreOpen(false);
            setStaffMenu(false);
          }}
          title={`${session.shopName} · ${activeBranch.name}`}
          className="w-[44px] h-[44px] rounded-[12px] bg-[#E58A4E] text-[#08343A] font-display font-bold text-[22px] leading-none flex items-center justify-center mb-2 shrink-0"
        >
          Z
        </button>

        {mainNav.map((n) => {
          const on = isActive(n);
          const label = t(n.id === 'bills' ? 'billsShort' : n.id);
          return (
            <Link
              key={n.id}
              href={n.href}
              className={`rail w-[72px] h-[56px] shrink-0 rounded-[12px] flex flex-col items-center justify-center gap-[2px] text-[13px] ${
                on ? 'text-white font-bold' : 'text-[#A8C3C5] font-medium'
              }`}
            >
              <span
                className={`w-[32px] h-[32px] rounded-full flex items-center justify-center ${
                  on
                    ? 'bg-[#E58A4E] text-[#08343A]'
                    : 'bg-[rgba(244,239,233,0.10)] text-[#C9DADB]'
                }`}
              >
                <NavIcon icon={n.icon} className="w-[17px] h-[17px]" />
              </span>
              <span className="max-w-[70px] truncate">{label}</span>
            </Link>
          );
        })}

        {extraNav.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMoreOpen((v) => !v);
              setBranchMenu(false);
              setStaffMenu(false);
            }}
            className={`rail w-[72px] h-[56px] shrink-0 rounded-[12px] flex flex-col items-center justify-center gap-[2px] text-[13px] ${
              moreOpen ? 'text-white font-bold' : 'text-[#A8C3C5] font-medium'
            }`}
          >
            <span className="w-[32px] h-[32px] rounded-full bg-[rgba(244,239,233,0.10)] text-[#C9DADB] flex items-center justify-center">
              <LayoutGrid className="w-[17px] h-[17px]" />
            </span>
            <span>{t('more')}</span>
          </button>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => {
            setStaffMenu((v) => !v);
            setBranchMenu(false);
            setMoreOpen(false);
          }}
          aria-label={`Staff menu · ${user.name}`}
          className="rail w-[72px] shrink-0 rounded-[12px] py-1.5 flex flex-col items-center gap-1 text-[#C9DADB]"
        >
          <span
            style={{ backgroundColor: user.avatarBg, color: user.avatarFg }}
            className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[13px] font-bold"
          >
            {user.initials}
          </span>
        </button>

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
          <div className="anim-up absolute start-[92px] bottom-16 z-50 w-[220px] rounded-[14px] bg-white text-[#0B2A2F] border border-[#E7E0D7] shadow-[0_18px_48px_rgba(10,28,22,.22)] p-2">
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

        {staffMenuPopover}
        {signOutModal}
      </aside>
    );
  }

  return (
    <aside
      ref={asideRef}
      aria-label="Main navigation"
      className="w-[248px] shrink-0 bg-[#08343A] text-[#C9DADB] flex flex-col px-3 pt-4 pb-3 relative z-30"
    >
      {/* Top brand + branch dropdown */}
      <div className="flex items-center gap-[10px] px-[6px] pb-[14px] relative">
        <div
          role="img"
          aria-label="Zyro"
          className="w-[40px] h-[40px] rounded-[10px] bg-[#E58A4E] text-[#08343A] font-display font-bold text-[20px] leading-none flex items-center justify-center shrink-0"
        >
          Z
        </div>
        <button
          type="button"
          onClick={() => {
            setBranchMenu((v) => !v);
            setStaffMenu(false);
          }}
          className="side flex-1 min-w-0 h-[48px] rounded-[12px] flex items-center gap-[6px] px-[8px] text-start text-white"
        >
          <span className="flex-1 min-w-0 flex flex-col leading-[1.3]">
            <span className="text-[15px] font-bold text-white truncate">{session.shopName}</span>
            <span className="text-[13px] text-[#A8C3C5] truncate">{activeBranch.name}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-[#A8C3C5] shrink-0" />
        </button>

        {branchMenu && (
          <div className="anim-up absolute top-[54px] inset-x-0 z-50 rounded-[14px] bg-white text-[#0B2A2F] border border-[#E7E0D7] shadow-[0_18px_48px_rgba(10,28,22,.22)] p-1.5">
            {session.branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBranch(b.id);
                  setBranchMenu(false);
                }}
                className={`w-full px-3 py-2 rounded-[10px] text-start text-[13px] flex items-center justify-between ${
                  b.id === session.branchId
                    ? 'bg-[#FCEFE4] text-[#8A3D12] font-semibold'
                    : 'hover:bg-[#F8F4EF]'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-[#52666A] shrink-0" />
                  <span className="truncate">{b.name}</span>
                </span>
                <span className="text-[11px] text-[#52666A]">{b.city}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable middle nav */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <nav className="flex flex-col">
          {mainNav.map((n) => {
            const on = isActive(n);
            const isSell = n.href === '/pos';
            return (
              <Link
                key={n.id}
                href={n.href}
                className={`side h-[46px] shrink-0 rounded-[12px] flex items-center gap-3 px-[10px] text-[15px] ${
                  on
                    ? 'bg-[rgba(244,239,233,0.10)] text-white font-bold'
                    : 'text-[#C9DADB] font-medium hover:text-white'
                }`}
              >
                <span
                  className={`w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 ${
                    on
                      ? 'bg-[#E58A4E] text-[#08343A]'
                      : 'bg-[rgba(244,239,233,0.10)] text-[#C9DADB]'
                  }`}
                >
                  <NavIcon icon={n.icon} className="w-[17px] h-[17px]" />
                </span>
                <span className="flex-1 min-w-0 truncate">{t(n.id)}</span>
                {isSell && <ExternalLink className="w-[15px] h-[15px] text-[#A8C3C5] shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {officeNav.length > 0 && (
          <>
            <div className="mt-[14px] mx-[10px] mb-[6px] text-[13px] font-semibold text-[#A8C3C5]">
              {t('backOffice')}
            </div>
            <nav className="flex flex-col">
              {officeNav.map((n) => {
                const on = isActive(n);
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    className={`side h-[46px] shrink-0 rounded-[12px] flex items-center gap-3 px-[10px] text-[15px] ${
                      on
                        ? 'bg-[rgba(244,239,233,0.10)] text-white font-bold'
                        : 'text-[#C9DADB] font-medium hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 ${
                        on
                          ? 'bg-[#E58A4E] text-[#08343A]'
                          : 'bg-[rgba(244,239,233,0.10)] text-[#C9DADB]'
                      }`}
                    >
                      <NavIcon icon={n.icon} className="w-[17px] h-[17px]" />
                    </span>
                    <span className="flex-1 min-w-0 truncate">{t(n.id)}</span>
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        <div className="flex-1" />

        {footNav.length > 0 && (
          <nav className="flex flex-col mt-2">
            {footNav.map((n) => {
              const on = isActive(n);
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  className={`side h-[46px] shrink-0 rounded-[12px] flex items-center gap-3 px-[10px] text-[15px] ${
                    on
                      ? 'bg-[rgba(244,239,233,0.10)] text-white font-bold'
                      : 'text-[#C9DADB] font-medium hover:text-white'
                  }`}
                >
                  <span
                    className={`w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 ${
                      on
                        ? 'bg-[#E58A4E] text-[#08343A]'
                        : 'bg-[rgba(244,239,233,0.10)] text-[#C9DADB]'
                    }`}
                  >
                    <NavIcon icon={n.icon} className="w-[17px] h-[17px]" />
                  </span>
                  <span className="flex-1 min-w-0 truncate">{t(n.id)}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Bottom user profile button */}
      <button
        type="button"
        onClick={() => {
          setStaffMenu((v) => !v);
          setBranchMenu(false);
        }}
        className="side mt-2 h-[56px] shrink-0 border-t border-[rgba(244,239,233,0.12)] rounded-b-[12px] flex items-center gap-[10px] px-[6px] pt-2 text-white text-start"
      >
        <span
          style={{ backgroundColor: user.avatarBg, color: user.avatarFg }}
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
        >
          {user.initials}
        </span>
        <span className="flex-1 min-w-0 flex flex-col leading-[1.3]">
          <span className="text-[15px] font-semibold truncate">{user.name}</span>
          <span className="text-[13px] text-[#A8C3C5] truncate">
            {activeRoleLabel}
          </span>
        </span>
        <MoreHorizontal className="w-4 h-4 text-[#A8C3C5] shrink-0" />
      </button>

      {staffMenuPopover}
      {signOutModal}
    </aside>
  );
}
