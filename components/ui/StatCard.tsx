import React from 'react';
import { Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'default' | 'warn' | 'err' | 'ok';
  icon?: React.ReactNode;
  chip?: string;
  chipTone?: 'neutral' | 'warn' | 'err' | 'ok';
  money?: boolean;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
  icon,
  chip,
  chipTone = 'neutral',
  money = false,
  onClick,
}: StatCardProps) {
  const accentCls = {
    default: 'text-[#0B2A2F]',
    warn: 'text-[#6B4E00]',
    err: 'text-[#B42318]',
    ok: 'text-[#14532D]',
  }[tone];

  const chipStyles = {
    neutral: 'bg-[#F1EBE3] text-[#3D5357]',
    warn: 'bg-[#FFF3C4] text-[#6B4E00]',
    err: 'bg-[#FDF0EF] text-[#B42318]',
    ok: 'bg-[#E8F6EE] text-[#14532D]',
  }[chipTone];

  const ChipIcon =
    chipTone === 'warn' ? AlertTriangle : chipTone === 'err' ? AlertCircle : Info;

  return (
    <Card
      onClick={onClick}
      padding="none"
      className="px-4 py-3.5 flex flex-col justify-between gap-1 min-w-0"
    >
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[#3D5357]">
        {icon && (
          <span className="w-[28px] h-[28px] rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center shrink-0">
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
      </div>

      <div
        className={`font-display text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] leading-[1.15] whitespace-nowrap num ${accentCls}`}
      >
        {money ? (
          <>
            <span className="rs">Rs</span>
            {String(value).replace(/^Rs\s*/i, '')}
          </>
        ) : (
          value
        )}
      </div>

      {sub && (
        <div className="text-[13px] text-[#52666A] truncate num">{sub}</div>
      )}

      {chip && (
        <span
          className={`self-start mt-0.5 h-[24px] px-[9px] rounded-full text-[13px] font-semibold inline-flex items-center gap-[5px] num ${chipStyles}`}
        >
          <ChipIcon className="w-[13px] h-[13px] shrink-0" />
          {chip}
        </span>
      )}
    </Card>
  );
}
