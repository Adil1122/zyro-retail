import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
}

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  actions,
  backHref,
  onBack,
}: PageHeaderProps) {
  const backButtonClass =
    'w-9 h-9 rounded-[10px] border border-[#D6CDC1] bg-white hover:bg-[#F8F4EF] text-[#0B2A2F] flex items-center justify-center shrink-0 transition-colors';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div className="flex items-start gap-3 min-w-0">
        {backHref ? (
          <Link href={backHref} aria-label="Back" className={backButtonClass}>
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </Link>
        ) : onBack ? (
          <button type="button" onClick={onBack} aria-label="Back" className={backButtonClass}>
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
        ) : null}

        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[12px] font-semibold uppercase tracking-wider text-[#52666A] mb-0.5">
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-[22px] sm:text-[26px] font-bold text-[#0B2A2F] tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-[14px] text-[#52666A] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
