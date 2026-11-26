'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type BadgeTone = 'ok' | 'warn' | 'err' | 'info' | 'neutral' | 'copper';

export interface BadgeProps {
  tone?: BadgeTone;
  withIcon?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', withIcon = false, children, className = '' }: BadgeProps) {
  const styles: Record<BadgeTone, string> = {
    ok: 'bg-[#E8F6EE] text-[#14532D] border-[#C6E8D3]',
    warn: 'bg-[#FFF3C4] text-[#6B4E00] border-[#EBD892]',
    err: 'bg-[#FDF0EF] text-[#B42318] border-[#F2C4BE]',
    info: 'bg-[#EDF3FF] text-[#1E40AF] border-[#D0E0FF]',
    neutral: 'bg-[#F1EBE3] text-[#3D5357] border-[#E7E0D7]',
    copper: 'bg-[#FCEFE4] text-[#8A3D12] border-[#E2B48F]',
  };

  const Icon =
    tone === 'ok'
      ? CheckCircle2
      : tone === 'warn'
        ? AlertTriangle
        : tone === 'err'
          ? AlertCircle
          : Info;

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-[24px] px-[9px] rounded-full text-[13px] font-semibold border whitespace-nowrap ${styles[tone]} ${className}`}
    >
      {withIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </span>
  );
}
