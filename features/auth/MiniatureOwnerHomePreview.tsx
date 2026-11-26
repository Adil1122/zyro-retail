'use client';

import React from 'react';
import {
  Bell,
  BookOpen,
  Boxes,
  ChevronDown,
  ChevronRight,
  Cloud,
  Coins,
  CreditCard,
  ExternalLink,
  FileText,
  Home,
  Inbox,
  Info,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { formatRs } from '@/lib/format';

export function MiniatureOwnerHomePreview({ shopName = 'Stride Footwear' }: { shopName?: string }) {
  const navMain = [
    { label: 'Home', active: true, icon: Home },
    { label: 'Sell', active: false, icon: ShoppingBag, external: true },
    { label: 'Bill book', active: false, icon: Receipt },
    { label: 'Khata', active: false, icon: BookOpen },
    { label: 'Stock', active: false, icon: Boxes },
    { label: 'Orders', active: false, icon: Inbox },
    { label: 'Cash', active: false, icon: CreditCard },
  ];

  const navOffice = [
    { label: 'Suppliers', icon: Truck },
    { label: 'Expenses', icon: Coins },
    { label: 'Staff', icon: Users },
    { label: 'Reports', icon: TrendingUp },
  ];

  const approvals = [
    {
      title: 'Electricity bill · November',
      meta: 'Expense bill · drafted by you',
      amount: 18400,
      icon: Coins,
    },
    {
      title: 'INV-2231 · Noor Textiles',
      meta: 'Supplier invoice · drafted by Faraz',
      amount: 64000,
      icon: Truck,
    },
    {
      title: 'November payroll · 4 staff',
      meta: 'Payroll · drafted by you',
      amount: null,
      icon: Users,
    },
    {
      title: 'PO-118 · Shaheen Footwear',
      meta: 'Purchase order · drafted by Faraz',
      amount: null,
      icon: FileText,
    },
  ];

  return (
    <div
      aria-hidden="true"
      className="w-[512px] h-[320px] rounded-[14px] overflow-hidden shadow-[0_18px_48px_rgba(10,28,22,.3)] bg-[#F4EFE9] relative select-none pointer-events-none"
      dir="ltr"
    >
      <div
        style={{
          width: 1280,
          height: 800,
          transform: 'scale(0.4)',
          transformOrigin: '0 0',
        }}
        className="flex bg-[#F4EFE9] text-[#0B2A2F] font-sans"
      >
        {/* Left Sidebar (248px) */}
        <aside className="w-[248px] shrink-0 bg-[#08343A] text-[#C9DADB] flex flex-col px-3 pt-4 pb-3">
          <div className="flex items-center gap-2.5 px-1.5 pb-3.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#E58A4E] text-[#08343A] flex items-center justify-center font-display font-bold text-[20px]">
              Z
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-1.5 px-2">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold text-white truncate">{shopName}</div>
                <div className="text-[13px] text-[#A8C3C5]">Main branch</div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#A8C3C5]" />
            </div>
          </div>

          <div className="space-y-0.5">
            {navMain.map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.label}
                  className={`h-[46px] rounded-[12px] flex items-center gap-3 px-2.5 text-[15px] ${
                    n.active ? 'bg-[rgba(244,239,233,0.10)] text-white font-bold' : 'text-[#C9DADB] font-medium'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      n.active ? 'bg-[#E58A4E] text-[#08343A]' : 'bg-[rgba(244,239,233,0.10)] text-[#C9DADB]'
                    }`}
                  >
                    <Icon className="w-[17px] h-[17px]" />
                  </span>
                  <span className="flex-1 truncate">{n.label}</span>
                  {n.external && <ExternalLink className="w-3.5 h-3.5 text-[#A8C3C5]" />}
                </div>
              );
            })}
          </div>

          <div className="mt-3.5 mx-2.5 mb-1.5 text-[13px] font-semibold text-[#A8C3C5]">Back office</div>
          <div className="space-y-0.5">
            {navOffice.map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.label}
                  className="h-[46px] rounded-[12px] flex items-center gap-3 px-2.5 text-[15px] text-[#C9DADB] font-medium"
                >
                  <span className="w-8 h-8 rounded-full bg-[rgba(244,239,233,0.10)] text-[#C9DADB] flex items-center justify-center shrink-0">
                    <Icon className="w-[17px] h-[17px]" />
                  </span>
                  <span className="flex-1 truncate">{n.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex-1" />

          <div className="h-[46px] rounded-[12px] flex items-center gap-3 px-2.5 text-[15px] text-[#C9DADB] font-medium">
            <span className="w-8 h-8 rounded-full bg-[rgba(244,239,233,0.10)] text-[#C9DADB] flex items-center justify-center shrink-0">
              <Settings className="w-[17px] h-[17px]" />
            </span>
            <span>Settings</span>
          </div>

          <div className="mt-2 h-[56px] border-t border-[rgba(244,239,233,0.12)] pt-2 px-1.5 flex items-center gap-2.5 text-white">
            <span className="w-[38px] h-[38px] rounded-full bg-[#F1E6D6] text-[#6B4A1E] flex items-center justify-center text-[13px] font-bold">
              HS
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold truncate">Hamza Sheikh</div>
              <div className="text-[13px] text-[#A8C3C5]">Owner</div>
            </div>
          </div>
        </aside>

        {/* Right Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-[64px] shrink-0 flex items-center gap-3 px-7 border-b border-[#E7E0D7] bg-[#F8F4EF]">
            <div className="flex-1 max-w-[460px] h-[44px] flex items-center gap-2 bg-white border border-[#D6CDC1] rounded-[12px] px-3">
              <Search className="w-[18px] h-[18px] text-[#52666A]" />
              <span className="text-[16px] text-[#52666A]">Search items, customers, bills</span>
            </div>
            <div className="flex-1" />
            <span className="h-[32px] inline-flex items-center gap-1.5 px-2.5 rounded-full bg-[#E8F6EE] text-[#14532D] text-[13px] font-semibold">
              <Cloud className="w-4 h-4" />
              Synced
            </span>
            <div className="w-[44px] h-[44px] rounded-full bg-white border border-[#E7E0D7] flex items-center justify-center relative">
              <Bell className="w-5 h-5 text-[#08343A]" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 rounded-full bg-[#E58A4E] text-[#08343A] text-[12px] font-bold flex items-center justify-center ring-2 ring-[#F8F4EF]">
                4
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-hidden px-7 py-[22px] flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[13px] font-semibold text-[#52666A]">Saturday, 14 November · Main branch</div>
                <h2 className="font-display text-[26px] font-bold leading-tight mt-0.5">Today at {shopName}</h2>
              </div>
              <div className="h-[48px] px-4 border border-[#D6CDC1] rounded-[12px] bg-white text-[15px] font-semibold flex items-center gap-2">
                <ShoppingBag className="w-[18px] h-[18px]" />
                Open register
              </div>
            </div>

            <div className="flex items-center gap-2 text-[13px] text-[#3D5357]">
              <Info className="w-4 h-4 text-[#1E40AF] shrink-0" />
              <span>This branch only. Totals are as recorded: not profit, and cash isn’t counted or bank-verified.</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  label: 'Recorded sales today',
                  val: '44,020',
                  sub: '9 bills · before returns',
                  chip: 'Not profit',
                  chipBg: '#F1EBE3',
                  chipFg: '#3D5357',
                  icon: Receipt,
                },
                {
                  label: 'Customers owe you',
                  val: '17,180',
                  sub: 'Khata · 6 open bills',
                  chip: '1 over 30 days',
                  chipBg: '#FFF3C4',
                  chipFg: '#6B4E00',
                  icon: BookOpen,
                },
                {
                  label: 'You owe',
                  val: '132,700',
                  sub: 'Suppliers, expenses, refunds',
                  chip: '2 overdue',
                  chipBg: '#FFF3C4',
                  chipFg: '#6B4E00',
                  icon: Truck,
                },
                {
                  label: 'Cash in the ledger',
                  val: '152,300',
                  sub: '1 shift open · Ali, Counter 1',
                  chip: 'Not counted',
                  chipBg: '#F1EBE3',
                  chipFg: '#3D5357',
                  icon: CreditCard,
                },
              ].map((k) => {
                const Icon = k.icon;
                return (
                  <div
                    key={k.label}
                    className="bg-white border border-[#E7E0D7] rounded-[18px] px-4 py-3.5 flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-[#3D5357]">
                      <span className="w-7 h-7 rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center">
                        <Icon className="w-[15px] h-[15px]" />
                      </span>
                      <span className="truncate">{k.label}</span>
                    </div>
                    <div className="font-display text-[26px] font-bold tracking-tight num">
                      <span className="rs">Rs</span>
                      {k.val}
                    </div>
                    <div className="text-[13px] text-[#52666A] truncate">{k.sub}</div>
                    <span
                      style={{ backgroundColor: k.chipBg, color: k.chipFg }}
                      className="self-start mt-0.5 h-6 px-2.5 rounded-full text-[13px] font-semibold inline-flex items-center"
                    >
                      {k.chip}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-[1.35] min-w-0 flex flex-col gap-4">
                <section className="bg-white border border-[#E7E0D7] rounded-[20px] overflow-hidden">
                  <div className="flex items-center justify-between px-[18px] pt-4 pb-2.5">
                    <h3 className="font-display text-[20px] font-bold">Needs your decision</h3>
                    <span className="h-[26px] px-2.5 rounded-full bg-[#FCEFE4] text-[#8A3D12] text-[13px] font-semibold inline-flex items-center">
                      4 waiting
                    </span>
                  </div>
                  {approvals.map((a) => {
                    const Icon = a.icon;
                    return (
                      <div
                        key={a.title}
                        className="flex items-center gap-3 min-h-[68px] px-[18px] py-2.5 border-t border-[#F1EBE3]"
                      >
                        <span className="w-10 h-10 rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center shrink-0">
                          <Icon className="w-[18px] h-[18px]" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-semibold truncate">{a.title}</div>
                          <div className="text-[13px] text-[#52666A] truncate">{a.meta}</div>
                        </div>
                        {a.amount !== null && (
                          <span className="text-[15px] font-bold num">{formatRs(a.amount)}</span>
                        )}
                        <ChevronRight className="w-[18px] h-[18px] text-[#52666A]" />
                      </div>
                    );
                  })}
                  <div className="px-[18px] py-3 border-t border-[#F1EBE3] text-[13px] text-[#52666A]">
                    Posting records a liability in the ledger. Nothing here pays money.
                  </div>
                </section>

                <section className="bg-white border border-[#E7E0D7] rounded-[20px] px-[18px] pt-3.5 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display text-[20px] font-bold">Activity</h3>
                    <span className="text-[15px] font-semibold text-[#0E5E66]">See all</span>
                  </div>
                </section>
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <section className="bg-white border border-[#E7E0D7] rounded-[20px] px-[18px] pt-3.5 pb-3">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <h3 className="font-display text-[20px] font-bold">What you owe</h3>
                    <span className="text-[17px] font-bold num">{formatRs(132700)}</span>
                  </div>
                  {[
                    ['Suppliers · posted bills', '86,500'],
                    ['Expenses · posted bills', '45,000'],
                    ['Refunds to customers', '1,200'],
                  ].map(([lab, amt]) => (
                    <div
                      key={lab}
                      className="flex items-center justify-between min-h-[40px] border-t border-[#F4EFE9] text-[15px]"
                    >
                      <span>{lab}</span>
                      <span className="font-bold num">
                        <span className="rs">Rs</span>
                        {amt}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 min-h-[40px] border-t border-[#F4EFE9] text-[15px] text-[#52666A]">
                    <span className="flex-1">Salaries</span>
                    <span className="h-[22px] px-2 rounded-full bg-[#F1EBE3] text-[#3D5357] text-[13px] font-semibold inline-flex items-center">
                      Payroll in draft
                    </span>
                    <span className="font-bold num">Rs 0</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 mb-1">
                    <span className="h-6 px-2.5 rounded-full bg-[#FFF3C4] text-[#6B4E00] text-[13px] font-semibold inline-flex items-center">
                      Overdue
                    </span>
                    <span className="text-[13px] text-[#52666A]">Included above</span>
                  </div>
                  {[
                    ['INV-2190 · Noor Textiles', 'Due 9 Nov · 5 days late', '22,500'],
                    ['Shop rent · November', 'Due 5 Nov · 9 days late', '45,000'],
                  ].map(([title, sub, amt]) => (
                    <div
                      key={title}
                      className="flex items-center justify-between min-h-[52px] border-t border-[#F4EFE9]"
                    >
                      <div>
                        <div className="text-[15px] font-semibold">{title}</div>
                        <div className="text-[13px] text-[#6B4E00]">{sub}</div>
                      </div>
                      <span className="text-[15px] font-bold num">
                        <span className="rs">Rs</span>
                        {amt}
                      </span>
                    </div>
                  ))}
                </section>

                <section className="bg-white border border-[#E7E0D7] rounded-[20px] px-[18px] py-3.5 flex items-center justify-between">
                  <h3 className="font-display text-[20px] font-bold">Stock watch</h3>
                  <span className="text-[15px] font-semibold text-[#0E5E66]">Open stock</span>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
