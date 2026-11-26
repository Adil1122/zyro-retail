'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  badgeTone?: 'ok' | 'warn' | 'err' | 'neutral';
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill';
}

export function Tabs({ tabs, activeId, onChange, variant = 'underline' }: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className="inline-flex flex-wrap items-center gap-[2px] p-[3px] rounded-[12px] bg-[#EAE3D9]">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`h-[40px] px-[14px] rounded-[9px] text-[15px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                active
                  ? 'bg-white text-[#0B2A2F] shadow-[0_1px_2px_rgba(10,28,22,.08)]'
                  : 'text-[#3D5357] hover:text-[#0B2A2F]'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="px-1.5 py-0.5 rounded-full text-[12px] bg-[#F1EBE3] text-[#3D5357] num">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 border-b border-[#E7E0D7] overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative px-4 py-3 text-[14px] whitespace-nowrap flex items-center gap-2 transition-colors ${
              active
                ? 'font-semibold text-[#08343A]'
                : 'font-medium text-[#52666A] hover:text-[#0B2A2F]'
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold num ${
                  tab.badgeTone === 'warn'
                    ? 'bg-[#FFF3C4] text-[#6B4E00]'
                    : tab.badgeTone === 'err'
                      ? 'bg-[#FDF0EF] text-[#B42318]'
                      : active
                        ? 'bg-[#FCEFE4] text-[#8A3D12]'
                        : 'bg-[#F1EBE3] text-[#3D5357]'
                }`}
              >
                {tab.count}
              </span>
            )}
            {active && (
              <span className="absolute bottom-0 inset-x-2 h-[3px] rounded-t-full bg-[#E58A4E]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
