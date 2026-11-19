'use client';

import React from 'react';
import Link from 'next/link';
import { AuthFlowShell } from '@/features/auth/AuthFlowShell';

interface AuthStatusCardProps {
  railTitle: string;
  railSub: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconTone?: 'warn' | 'err' | 'ok' | 'info';
  body: string;
  details?: Array<{ label: string; value: string }>;
  primaryLabel: string;
  primaryHref?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondary?: () => void;
}

const TONE_CLASSES: Record<NonNullable<AuthStatusCardProps['iconTone']>, string> = {
  warn: 'bg-[#FFF3C4] text-[#6B4E00]',
  err: 'bg-[#FDF0EF] text-[#B42318]',
  ok: 'bg-[#E8F6EE] text-[#14532D]',
  info: 'bg-[#EDF3FF] text-[#1E40AF]',
};

export function AuthStatusCard({
  railTitle,
  railSub,
  title,
  subtitle,
  icon,
  iconTone = 'info',
  body,
  details,
  primaryLabel,
  primaryHref,
  onPrimary,
  secondaryLabel,
  secondaryHref,
  onSecondary,
}: AuthStatusCardProps) {
  return (
    <AuthFlowShell
      railTitle={railTitle}
      railSub={railSub}
      railAltLabel="Back to welcome"
      railAltHref="/welcome"
      helpText="Stuck? Message Zyro support and we’ll help you get back in."
      title={title}
      subtitle={subtitle}
      maxWidth={620}
      hasFooter={false}
    >
      <section className="rounded-[16px] bg-white border border-[#E7E0D7] p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3.5">
          <span
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${TONE_CLASSES[iconTone]}`}
          >
            {icon}
          </span>
          <p className="m-0 text-[15px] leading-[1.6] text-[#3D5357] pt-0.5">{body}</p>
        </div>

        {details && details.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {details.map((item) => (
              <div
                key={item.label}
                className="rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] px-3.5 py-2.5 flex flex-col gap-0.5"
              >
                <span className="text-[12px] text-[#52666A]">{item.label}</span>
                <span className="text-[14px] font-bold text-[#0B2A2F]">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          {primaryHref ? (
            <Link
              href={primaryHref}
              className="bk h-[48px] px-5 rounded-[12px] text-[15px] font-bold inline-flex items-center justify-center"
            >
              {primaryLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onPrimary}
              className="bk h-[48px] px-5 rounded-[12px] text-[15px] font-bold inline-flex items-center justify-center"
            >
              {primaryLabel}
            </button>
          )}

          {secondaryLabel &&
            (secondaryHref ? (
              <Link
                href={secondaryHref}
                className="bs h-[48px] px-4 rounded-[12px] text-[15px] font-semibold text-[#0B2A2F] inline-flex items-center justify-center"
              >
                {secondaryLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSecondary}
                className="bs h-[48px] px-4 rounded-[12px] text-[15px] font-semibold text-[#0B2A2F] inline-flex items-center justify-center"
              >
                {secondaryLabel}
              </button>
            ))}
        </div>
      </section>
    </AuthFlowShell>
  );
}
