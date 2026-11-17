'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  Check,
  ChevronDown,
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
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';
import { Badge } from '@/components/ui/Badge';
import { Dropdown } from '@/components/ui/Dropdown';
import { ROLE_DISPLAY_NAMES } from '@/constants/navigation';
import { useZyro } from '@/hooks/useZyro';
import { formatPhone, formatRs } from '@/lib/format';
import { calcBillTotal, getTotalStock } from '@/lib/inventory';
import type { RoleId } from '@/types';

export function AppHeader({ isPhone }: { isPhone: boolean }) {
  const router = useRouter();
  const { state, role, user, settings, setBranch, setRole, signOut, notify, t } = useZyro();
  const [query, setQuery] = useState('');

  const activeBranch =
    state.session.branches.find((b) => b.id === state.session.branchId) || state.session.branches[0];

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
    notify(`Switched active demo role to ${ROLE_DISPLAY_NAMES[target]}`, 'info');
    router.push('/dashboard');
  };

  return (
    <header className="h-[56px] sm:h-[64px] shrink-0 bg-white border-b border-[#E7E0D7] px-3 sm:px-6 flex items-center justify-between gap-3 relative z-30">
      {/* Left: Mobile brand + branch switcher or Desktop global omnibar */}
      {isPhone ? (
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
              className="flex items-center gap-2.5 min-w-0 text-start rounded-[10px] py-1 pe-1.5 hover:bg-[#F8F4EF] transition-colors"
            >
              <div className="w-8 h-8 rounded-[9px] bg-[#08343A] text-[#E58A4E] font-display font-bold text-[16px] flex items-center justify-center shrink-0">
                Z
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-[14px] text-[#0B2A2F] truncate">
                  {state.session.shopName}
                </div>
                <div className="text-[11px] text-[#52666A] truncate flex items-center gap-1">
                  <span>{activeBranch.name}</span>
                  <span>·</span>
                  <span>{ROLE_DISPLAY_NAMES[role]}</span>
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </div>
              </div>
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
      ) : (
        <div className="relative flex-1 max-w-[440px]">
          <div className="field flex items-center gap-2 h-[40px] px-3 rounded-[10px] border border-[#D6CDC1] bg-[#FBF8F4]">
            <Search className="w-4 h-4 text-[#52666A] shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search')}
              className="w-full bg-transparent text-[14px] text-[#0B2A2F] placeholder:text-[#52666A] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-0.5 rounded text-[#52666A] hover:bg-[#EAE3D9]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {searchResults && !Array.isArray(searchResults) && (
            <div className="anim-up absolute top-full mt-2 inset-x-0 z-50 rounded-[14px] bg-white border border-[#E7E0D7] shadow-[0_18px_48px_rgba(10,28,22,.18)] p-2 space-y-2 max-h-[380px] overflow-y-auto">
              {searchResults.items.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#52666A]">
                    Items
                  </div>
                  {searchResults.items.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        setQuery('');
                        router.push(`/inventory?item=${it.id}`);
                      }}
                      className="w-full px-2.5 py-2 rounded-[9px] hover:bg-[#F8F4EF] flex items-center justify-between gap-2 text-start"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Boxes className="w-4 h-4 text-[#08343A] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[#0B2A2F] truncate">{it.name}</div>
                          <div className="text-[11px] text-[#52666A] mono">
                            {it.sku} · {getTotalStock(it)} in stock
                          </div>
                        </div>
                      </div>
                      <span className="text-[13px] font-bold text-[#08343A] num">{formatRs(it.price)}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.customers.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#52666A]">
                    Customers
                  </div>
                  {searchResults.customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setQuery('');
                        router.push(`/khata?cust=${c.id}`);
                      }}
                      className="w-full px-2.5 py-2 rounded-[9px] hover:bg-[#F8F4EF] flex items-center justify-between gap-2 text-start"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <User className="w-4 h-4 text-[#08343A] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[#0B2A2F] truncate">{c.name}</div>
                          <div className="text-[11px] text-[#52666A] mono">
                            {role === 'owner' ? formatPhone(c.phone) : 'Customer'}
                          </div>
                        </div>
                      </div>
                      {c.khata > 0 && (
                        <span className="text-[12px] font-semibold text-[#8A3D12] num">
                          Owes {formatRs(c.khata)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {searchResults.bills.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#52666A]">
                    Bills
                  </div>
                  {searchResults.bills.map((b) => (
                    <button
                      key={b.no}
                      type="button"
                      onClick={() => {
                        setQuery('');
                        router.push(`/pos/bills?bill=${b.no}`);
                      }}
                      className="w-full px-2.5 py-2 rounded-[9px] hover:bg-[#F8F4EF] flex items-center justify-between gap-2 text-start"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Receipt className="w-4 h-4 text-[#08343A] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[#0B2A2F] mono">Bill {b.no}</div>
                          <div className="text-[11px] text-[#52666A]">{b.time}</div>
                        </div>
                      </div>
                      <span className="text-[13px] font-bold num">
                        {formatRs(calcBillTotal(b, state.items))}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {Array.isArray(searchResults) && (
            <div className="anim-up absolute top-full mt-2 inset-x-0 z-50 rounded-[14px] bg-white border border-[#E7E0D7] shadow-lg p-4 text-center text-[13px] text-[#52666A]">
              No matching items, customers, or bills.
            </div>
          )}
        </div>
      )}

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {settings.offlineModeSimulated && (
          <Badge tone="warn" withIcon>
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Offline</span>
          </Badge>
        )}

        <div className="hidden sm:block">
          <LanguageSwitcher compact={isPhone} />
        </div>

        <Dropdown
          align="end"
          header={
            <div>
              <div className="font-semibold text-[14px] text-[#0B2A2F]">{user.name}</div>
              <div className="text-[12px] text-[#52666A]">{ROLE_DISPLAY_NAMES[role]}</div>
            </div>
          }
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 p-1 pe-2 rounded-full border border-[#E7E0D7] bg-[#FBF8F4] hover:bg-[#F1EBE3] transition-colors"
            >
              <span
                style={{ backgroundColor: user.avatarBg, color: user.avatarFg }}
                className="w-8 h-8 rounded-full font-bold text-[12px] flex items-center justify-center"
              >
                {user.initials}
              </span>
              <span className="hidden md:inline text-[13px] font-semibold text-[#0B2A2F]">
                {user.shortName}
              </span>
            </button>
          }
          items={[
            {
              id: 'role-owner',
              label: 'View as Owner',
              sub: 'Full access · Hamza Sheikh',
              icon: role === 'owner' ? <Check className="w-4 h-4 text-[#C9682E]" /> : <ShieldCheck className="w-4 h-4" />,
              active: role === 'owner',
              onSelect: () => switchRoleTo('owner'),
            },
            {
              id: 'role-cashier',
              label: 'View as Cashier',
              sub: 'Register, Bills, Khata · Ali Hassan',
              icon: role === 'cashier' ? <Check className="w-4 h-4 text-[#C9682E]" /> : <User className="w-4 h-4" />,
              active: role === 'cashier',
              onSelect: () => switchRoleTo('cashier'),
            },
            {
              id: 'role-inventory',
              label: 'View as Stockkeeper',
              sub: 'Stock, Receive, Orders · Faraz Ahmed',
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
      </div>
    </header>
  );
}
