import React from 'react';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'default' | 'warn' | 'err' | 'ok';
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function StatCard({ label, value, sub, tone = 'default', icon, onClick }: StatCardProps) {
  const accentCls = {
    default: 'text-[#0B2A2F]',
    warn: 'text-[#6B4E00]',
    err: 'text-[#B42318]',
    ok: 'text-[#14532D]',
  }[tone];

  return (
    <Card onClick={onClick} className="flex flex-col justify-between gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-[#52666A]">{label}</span>
        {icon && <span className="text-[#52666A]">{icon}</span>}
      </div>
      <div className={`font-display text-[22px] sm:text-[26px] font-bold tracking-tight num ${accentCls}`}>
        {value}
      </div>
      {sub && <div className="text-[12px] text-[#52666A]">{sub}</div>}
    </Card>
  );
}
