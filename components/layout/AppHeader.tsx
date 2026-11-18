'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Boxes,
  Check,
  ChevronDown,
  Cloud,
  LogOut,
  MapPin,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { ROLE_DISPLAY_NAMES } from '@/constants/navigation';
import { useZyro } from '@/hooks/useZyro';
import { formatPhone, formatRs } from '@/lib/format';
import { calcBillTotal, getTotalStock } from '@/lib/inventory';
import type { LanguageId, RoleId } from '@/types';

export function AppHeader({ isPhone }: { isPhone: boolean }) {
  const router = useRouter();
  const { state, role, user, settings, lang, setLanguage, setBranch, setRole, signOut, notify, t } =
    useZyro();
  const [query, setQuery] = useState('');

  const activeBranch =
    state.session.branches.find((b) => b.id === state.session.branchId) ||
    state.session.branches[0];

  const pendingCount = useMemo(() => {
    const cashDrafts = state.cashDrafts.filter((c) => c.status === 'draft').length;
    const poDrafts = state.purchaseOrders.filter((p) => p.status === 'draft').length;
    const vbDrafts = state.vendorBills.filter((b) => b.status === 'draft').length;
    const expDrafts = state.expenseBills.filter((e) => e.status === 'draft').length;
    return cashDrafts + poDrafts + vbDrafts + expDrafts;
  }, [state.cashDrafts, state.expenseBills, state.purchaseOrders, state.vendorBills]);

  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');

  const searchResults = useMemo(() => {
    if (q.length < 2) return null;
    const items = state.items
      .filter((it) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q))
      .slice(0, 3);
    const customers =
      role === 'inventory'
        ? []
        : state.customers
            .filter(
              (c) =>
                c.name.toLowerCase().includes(q) ||
                (qDigits.length >= 3 && c.phone.includes(qDigits))
            )
            .slice(0, 3);
    const bills =
      role === 'inventory'
        ? []
        : state.bills
            .filter((b) => qDigits.length >= 2 && String(b.no).includes(qDigits))
            .slice(0, 3);
    if (items.length === 0 && customers.length === 0 && bills.length === 0) return [];
    return { items, customers, bills };
  }, [q, qDigits, role, state.bills, state.customers, state.items]);

  const switchRoleTo = (target: RoleId) => {
    setRole(target);
    notify(`Switched active view to ${ROLE_DISPLAY_NAMES[target]}`, 'info');
    router.push('/dashboard');
  };

  if (isPhone) {
    return (
      <header className="h-[56px] shrink-0 bg-[#08343A] text-white px-2 ps-3 flex items-center gap-2 relative z-30">
        <div
          role="img"
          aria-label="Zyro"
          className="w-[34px] h-[34px] rounded-[10px] bg-[#E58A4E] text-[#08343A] font-display font-bold text-[17px] leading-none flex items-center justify-center shrink-0"
        >
          Z
        </div>

        <Dropdown
          align="start"
          header={
            <div>
              <div className="font-semibold text-[13px] text-[#0B2A2F]">{state.session.shopName}</div>
              <div className="text-[11px] text-[#52666A]">Switch active branch</div>
            </div>
          }
          trigger={
            <button
              type="button"
              className="flex-1 min-w-0 h-[44px] flex items-center gap-1 px-1 text-start text-white"
            >
              <span className="min-w-0 flex flex-col leading-[1.25]">
                <span className="text-[15px] font-bold truncate">{state.session.shopName}</span>
                <span className="text-[12px] text-[#A8C3C5] truncate">
                  {activeBranch.name} · {settings.offlineModeSimulated ? 'offline' : 'synced'}
                </span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#A8C3C5] shrink-0" />
            </button>
          }
          items={state.session.branches.map((b) => ({
            id: b.id,
            label: b.name,
            sub: b.city,
            icon:
              b.id === state.session.branchId ? (
                <Check className="w-4 h-4 text-[#C9682E]" />
              ) : (
                <MapPin className="w-4 h-4 text-[#52666A]" />
              ),
            active: b.id === state.session.branchId,
            onSelect: () => {
              setBranch(b.id);
              notify(`Switched to ${b.name}`, 'info');
            },
          }))}
        />

        <div className="flex-1" />

        {role === 'owner' && (
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            aria-label={`${pendingCount} waiting for review`}
            className="w-[44px] h-[44px] rounded-full bg-white/8 flex items-center justify-center relative shrink-0"
          >
            <Bell className="w-5 h-5 text-white" />
            {pendingCount > 0 && (
              <span className="num absolute top-0 end-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E58A4E] text-[#08343A] text-[12px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        )}

        <Dropdown
          align="end"
          header={
            <div>
              <div className="font-semibold text-[14px] text-[#0B2A2F]">{user.name}</div>
              <div className="text-[12px] text-[#52666A]">{ROLE_DISPLAY_NAMES[role]}</div>
              <div className="mt-2 grid grid-cols-3 gap-1 p-0.5 rounded-[8px] bg-[#EAE3D9]">
                {(
                  [
                    { id: 'en', label: 'EN' },
                    { id: 'roman', label: 'Roman' },
                    { id: 'ur', label: 'اردو' },
                  ] as { id: LanguageId; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLanguage(opt.id)}
                    className={`h-[26px] rounded-[6px] text-[11px] font-semibold ${
                      lang === opt.id ? 'bg-white text-[#0B2A2F]' : 'text-[#3D5357]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          }
          trigger={
            <button
              type="button"
              aria-label={`Staff menu · ${user.name}`}
              className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0"
            >
              <span
                style={{ backgroundColor: user.avatarBg, color: user.avatarFg }}
                className="w-[34px] h-[34px] rounded-full text-[13px] font-bold flex items-center justify-center"
              >
                {user.initials}
              </span>
            </button>
          }
          items={[
            {
              id: 'role-owner',
              label: 'View as Owner',
              sub: 'Hamza Sheikh',
              icon: role === 'owner' ? <Check className="w-4 h-4 text-[#C9682E]" /> : <ShieldCheck className="w-4 h-4" />,
              active: role === 'owner',
              onSelect: () => switchRoleTo('owner'),
            },
            {
              id: 'role-cashier',
              label: 'View as Cashier',
              sub: 'Ali Hassan',
              icon: role === 'cashier' ? <Check className="w-4 h-4 text-[#C9682E]" /> : <User className="w-4 h-4" />,
              active: role === 'cashier',
              onSelect: () => switchRoleTo('cashier'),
            },
            {
              id: 'role-inventory',
              label: 'View as Stockkeeper',
              sub: 'Faraz Ahmed',
              icon: role === 'inventory' ? <Check className="w-4 h-4 text-[#C9682E]" /> : <Boxes className="w-4 h-4" />,
              active: role === 'inventory',
              onSelect: () => switchRoleTo('inventory'),
            },
            {
              id: 'counter-pin',
              label: 'Counter PIN sign-in',
              icon: <RefreshCw className="w-4 h-4" />,
              onSelect: () => router.push('/counter-sign-in'),
            },
            {
              id: 'sign-out',
              label: t('signOut'),
              icon: <LogOut className="w-4 h-4" />,
              danger: true,
              onSelect: () => {
                signOut();
                router.push('/welcome');
              },
            },
          ]}
        />
      </header>
    );
  }

  return (
    <header className="h-[56px] lg:h-[64px] shrink-0 bg-[#F8F4EF] border-b border-[#E7E0D7] px-5 lg:px-7 flex items-center gap-3 relative z-30">
      {/* Omnibar search matching App.html */}
      <div className="relative flex-1 max-w-[460px] min-w-0">
        <div className="field flex items-center gap-2 h-[44px] px-3 rounded-[12px] border border-[#D6CDC1] bg-white">
          <Search className="w-[18px] h-[18px] text-[#52666A] shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            className="w-full bg-transparent text-[16px] text-[#0B2A2F] placeholder:text-[#52666A] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="w-8 h-8 -me-1.5 rounded-full bg-[#F1EBE3] text-[#3D5357] flex items-center justify-center shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {searchResults && !Array.isArray(searchResults) && (
          <div className="anim-up absolute top-full mt-2 inset-x-0 z-50 rounded-[16px] bg-white border border-[#E7E0D7] shadow-[0_18px_48px_rgba(10,28,22,.22)] p-2 space-y-2 max-h-[380px] overflow-y-auto">
            {searchResults.items.length > 0 && (
              <div>
                <div className="px-2.5 py-1.5 text-[13px] font-semibold text-[#52666A]">Items</div>
                {searchResults.items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setQuery('');
                      router.push(`/inventory?item=${it.id}`);
                    }}
                    className="row w-full px-2.5 py-2 rounded-[12px] flex items-center justify-between gap-2 text-start"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center shrink-0">
                        <Boxes className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[#0B2A2F] truncate">{it.name}</div>
                        <div className="text-[12px] text-[#52666A] mono">
                          {it.sku} · {getTotalStock(it)} in stock
                        </div>
                      </div>
                    </div>
                    <span className="text-[14px] font-bold text-[#08343A] num">{formatRs(it.price)}</span>
                  </button>
                ))}
              </div>
            )}

            {searchResults.customers.length > 0 && (
              <div>
                <div className="px-2.5 py-1.5 text-[13px] font-semibold text-[#52666A]">Customers</div>
                {searchResults.customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setQuery('');
                      router.push(`/khata?cust=${c.id}`);
                    }}
                    className="row w-full px-2.5 py-2 rounded-[12px] flex items-center justify-between gap-2 text-start"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[#0B2A2F] truncate">{c.name}</div>
                        <div className="text-[12px] text-[#52666A] mono">
                          {role === 'owner' ? formatPhone(c.phone) : 'Customer'}
                        </div>
                      </div>
                    </div>
                    {c.khata > 0 && (
                      <span className="text-[13px] font-semibold text-[#8A3D12] num">
                        Owes {formatRs(c.khata)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchResults.bills.length > 0 && (
              <div>
                <div className="px-2.5 py-1.5 text-[13px] font-semibold text-[#52666A]">Bills</div>
                {searchResults.bills.map((b) => (
                  <button
                    key={b.no}
                    type="button"
                    onClick={() => {
                      setQuery('');
                      router.push(`/pos/bills?bill=${b.no}`);
                    }}
                    className="row w-full px-2.5 py-2 rounded-[12px] flex items-center justify-between gap-2 text-start"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[#0B2A2F] mono">Bill {b.no}</div>
                        <div className="text-[12px] text-[#52666A]">{b.time}</div>
                      </div>
                    </div>
                    <span className="text-[14px] font-bold num">{formatRs(calcBillTotal(b, state.items))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {Array.isArray(searchResults) && (
          <div className="anim-up absolute top-full mt-2 inset-x-0 z-50 rounded-[16px] bg-white border border-[#E7E0D7] shadow-[0_18px_48px_rgba(10,28,22,.22)] p-4 text-center text-[13px] text-[#52666A]">
            No matching items, customers, or bills.
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Sync status pill matching App.html */}
      {settings.offlineModeSimulated ? (
        <span className="h-[32px] px-[10px] rounded-full bg-[#FFF3C4] text-[#6B4E00] text-[13px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap">
          <WifiOff className="w-4 h-4" />
          Offline
        </span>
      ) : (
        <span
          role="status"
          aria-label="All sales synced"
          className="h-[32px] px-[10px] rounded-full bg-[#E8F6EE] text-[#14532D] text-[13px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <Cloud className="w-4 h-4" />
          Synced
        </span>
      )}

      {/* Owner notification bell matching App.html */}
      {role === 'owner' && (
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          aria-label={`${pendingCount} items waiting for review`}
          className="w-[44px] h-[44px] rounded-full bg-white shadow-[inset_0_0_0_1px_#E7E0D7] flex items-center justify-center relative shrink-0 hover:bg-[#FBF8F4]"
        >
          <Bell className="w-5 h-5 text-[#08343A]" />
          {pendingCount > 0 && (
            <span className="num absolute -top-0.5 -end-0.5 min-w-[20px] h-[20px] px-[5px] rounded-full bg-[#E58A4E] text-[#08343A] text-[12px] font-bold flex items-center justify-center shadow-[0_0_0_2px_#F8F4EF]">
              {pendingCount}
            </span>
          )}
        </button>
      )}
    </header>
  );
}
