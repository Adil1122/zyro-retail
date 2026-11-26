'use client';

import React from 'react';
import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

export interface AuthStepItem {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
  number: number;
}

interface AuthFlowShellProps {
  railTitle: string;
  railSub: string;
  steps?: AuthStepItem[];
  stepOf?: string;
  stepNo?: number;
  stepMax?: number;
  railNote?: string;
  railAltLabel?: string;
  railAltHref?: string;
  onRailAltClick?: () => void;
  helpText: string;
  title: string;
  subtitle?: string;
  maxWidth?: number;
  hasFooter?: boolean;
  hasBack?: boolean;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
  why?: string;
  nextLabel?: string;
  onNext?: () => void;
  nextHref?: string;
  nextDisabled?: boolean;
  nextBusy?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryHref?: string;
  cornerBadge?: React.ReactNode;
  children: React.ReactNode;
}

export function AuthFlowShell({
  railTitle,
  railSub,
  steps = [],
  stepOf,
  stepNo = 1,
  stepMax = 1,
  railNote,
  railAltLabel,
  railAltHref,
  onRailAltClick,
  helpText,
  title,
  subtitle,
  maxWidth = 640,
  hasFooter = true,
  hasBack = false,
  onBack,
  backHref,
  backLabel = 'Back',
  why,
  nextLabel = 'Next',
  onNext,
  nextHref,
  nextDisabled = false,
  nextBusy = false,
  secondaryLabel,
  onSecondary,
  secondaryHref,
  cornerBadge,
  children,
}: AuthFlowShellProps) {
  const pct = stepMax > 0 ? Math.round((stepNo / stepMax) * 100) : 100;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F4EFE9] text-[#0B2A2F] relative overflow-hidden">
      {/* Desktop Left Dark Teal Stepper Rail (360px) */}
      <aside
        aria-label={railTitle}
        className="hidden lg:flex w-[360px] shrink-0 min-h-screen bg-[#08343A] text-white pt-[36px] px-[32px] pb-[32px] flex-col gap-[28px]"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/welcome"
            aria-label="Zyro"
            className="w-[44px] h-[44px] rounded-[12px] bg-[#E58A4E] text-[#08343A] flex items-center justify-center font-display text-[22px] font-bold shrink-0"
          >
            Z
          </Link>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-display text-[18px] font-bold leading-[1.2]">{railTitle}</span>
            <span className="text-[14px] text-[#C9DADB]">{railSub}</span>
          </div>
        </div>

        {steps.length > 0 && (
          <ol aria-label="Steps" className="list-none m-0 p-0 flex flex-col gap-1">
            {steps.map((st) => (
              <li
                key={st.id}
                aria-current={st.active ? 'step' : undefined}
                className="flex items-center gap-[14px] min-h-[52px] py-1 px-3 rounded-[12px]"
                style={{
                  backgroundColor: st.active ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
              >
                <span
                  className="w-[30px] h-[30px] shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold"
                  style={{
                    backgroundColor: st.done ? '#7FD6A4' : st.active ? '#E58A4E' : 'transparent',
                    color: st.done || st.active ? '#08343A' : '#C9DADB',
                    border: st.done || st.active ? '0' : '2px solid #A8C3C5',
                  }}
                >
                  {st.done ? <Check className="w-4 h-4 stroke-[3]" /> : st.number}
                </span>
                <span
                  className="flex-1 text-[15px]"
                  style={{
                    fontWeight: st.active ? 700 : 500,
                    color: st.active || st.done ? '#FFFFFF' : '#C9DADB',
                  }}
                >
                  {st.label}
                </span>
              </li>
            ))}
          </ol>
        )}

        {railNote && <p className="m-0 text-[16px] leading-[1.5] text-[#C9DADB]">{railNote}</p>}

        <div className="mt-auto flex flex-col gap-3">
          {railAltLabel &&
            (railAltHref ? (
              <Link
                href={railAltHref}
                className="self-start min-h-[44px] inline-flex items-center text-white text-[16px] font-semibold underline underline-offset-[3px] hover:text-[#F2B48A]"
              >
                {railAltLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onRailAltClick}
                className="self-start min-h-[44px] text-start text-white text-[16px] font-semibold underline underline-offset-[3px] hover:text-[#F2B48A]"
              >
                {railAltLabel}
              </button>
            ))}
          <p className="m-0 text-[14px] leading-[1.5] text-[#C9DADB]">{helpText}</p>
        </div>
      </aside>

      {/* Mobile / Tablet Top Progress Bar */}
      <div className="lg:hidden shrink-0 px-4 pt-3.5 pb-2.5 flex flex-col gap-2.5 bg-white border-b border-[#E7E0D7]">
        <div className="flex items-center gap-2.5">
          <Link
            href="/welcome"
            aria-label="Zyro"
            className="w-8 h-8 rounded-[9px] bg-[#E58A4E] text-[#08343A] flex items-center justify-center font-display text-[16px] font-bold shrink-0"
          >
            Z
          </Link>
          <span className="flex-1 font-display text-[14px] font-bold truncate">{railTitle}</span>
          {stepOf && <span className="text-[14px] text-[#52666A]">{stepOf}</span>}
        </div>
        <div
          role="progressbar"
          aria-label="Steps"
          aria-valuemin={1}
          aria-valuemax={Math.max(1, stepMax)}
          aria-valuenow={stepNo}
          className="h-[6px] rounded-full bg-[#EAE3D9] overflow-hidden"
        >
          <span
            className="block h-full bg-[#08343A] rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Main Content + Sticky Bottom Action Footer */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col relative">
        <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-[48px] pt-[18px] lg:pt-[40px] pb-6 flex flex-col">
          <div style={{ maxWidth }} className="w-full flex flex-col gap-[18px] relative">
            <div className="flex flex-col gap-1.5">
              {stepOf && (
                <span className="hidden lg:inline text-[14px] font-semibold text-[#52666A]">
                  {stepOf}
                </span>
              )}
              <h1 className="m-0 font-display text-[26px] lg:text-[30px] font-bold leading-[1.2] text-[#0B2A2F]">
                {title}
              </h1>
              {subtitle && (
                <p className="m-0 text-[16px] leading-[1.5] text-[#3D5357]">{subtitle}</p>
              )}
            </div>

            {children}

            {railAltLabel && (
              <div className="lg:hidden pt-1">
                {railAltHref ? (
                  <Link
                    href={railAltHref}
                    className="inline-flex items-center min-h-[44px] text-[#0E5E66] text-[14px] font-semibold underline underline-offset-[3px]"
                  >
                    {railAltLabel}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={onRailAltClick}
                    className="min-h-[44px] text-[#0E5E66] text-[14px] font-semibold underline underline-offset-[3px] text-start"
                  >
                    {railAltLabel}
                  </button>
                )}
              </div>
            )}
          </div>
          {cornerBadge}
        </div>

        {hasFooter && (
          <div className="shrink-0 bg-white border-t border-[#E7E0D7] px-4 lg:px-[48px] py-[14px] flex flex-wrap items-center gap-x-3 gap-y-2.5">
            {hasBack &&
              (backHref ? (
                <Link
                  href={backHref}
                  aria-label={backLabel}
                  className="bs h-[52px] px-4 rounded-[12px] text-[16px] font-semibold text-[#0B2A2F] inline-flex items-center gap-2 shrink-0"
                >
                  <ChevronLeft className="w-[18px] h-[18px] rtl:rotate-180" />
                  <span className="hidden sm:inline">{backLabel}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={backLabel}
                  className="bs h-[52px] px-4 rounded-[12px] text-[16px] font-semibold text-[#0B2A2F] inline-flex items-center gap-2 shrink-0"
                >
                  <ChevronLeft className="w-[18px] h-[18px] rtl:rotate-180" />
                  <span className="hidden sm:inline">{backLabel}</span>
                </button>
              ))}

            <span role="status" className="flex-1 basis-[150px] min-w-0 text-[14px] leading-[1.4] text-[#52666A]">
              {why || ''}
            </span>

            {secondaryLabel &&
              (secondaryHref ? (
                <Link
                  href={secondaryHref}
                  className="bs h-[52px] px-4 rounded-[12px] text-[16px] font-semibold text-[#0B2A2F] inline-flex items-center shrink-0"
                >
                  {secondaryLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onSecondary}
                  className="bs h-[52px] px-4 rounded-[12px] text-[16px] font-semibold text-[#0B2A2F] inline-flex items-center shrink-0"
                >
                  {secondaryLabel}
                </button>
              ))}

            {nextHref ? (
              <Link
                href={nextHref}
                className="bk h-[52px] px-5 rounded-[12px] text-[16px] font-bold inline-flex items-center gap-2 shrink-0"
              >
                <span>{nextLabel}</span>
                <ChevronRight className="w-[18px] h-[18px] rtl:rotate-180" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled || nextBusy}
                aria-busy={nextBusy}
                className="bk h-[52px] px-5 rounded-[12px] text-[16px] font-bold inline-flex items-center gap-2 shrink-0"
              >
                <span>{nextLabel}</span>
                <ChevronRight className="w-[18px] h-[18px] rtl:rotate-180" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
