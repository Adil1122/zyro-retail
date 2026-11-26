'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  sub?: string;
  icon?: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'end';
  header?: React.ReactNode;
}

export function Dropdown({ trigger, items, align = 'end', header }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={`anim-up absolute top-full mt-2 z-50 min-w-[230px] rounded-[14px] bg-white border border-[#E7E0D7] shadow-[0_18px_48px_rgba(10,28,22,.18)] py-1.5 ${
            align === 'start' ? 'start-0' : 'end-0'
          }`}
        >
          {header && <div className="px-3.5 py-2 border-b border-[#F1EBE3]">{header}</div>}
          <div className="py-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`w-full px-3.5 py-2.5 text-start flex items-center gap-2.5 text-[14px] transition-colors ${
                  item.active
                    ? 'bg-[#FCEFE4] text-[#8A3D12] font-semibold'
                    : item.danger
                      ? 'text-[#B42318] hover:bg-[#FDF0EF]'
                      : 'text-[#0B2A2F] hover:bg-[#F8F4EF]'
                }`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <div className="min-w-0 flex-1">
                  <div className="truncate">{item.label}</div>
                  {item.sub && <div className="text-[12px] text-[#52666A] truncate">{item.sub}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
