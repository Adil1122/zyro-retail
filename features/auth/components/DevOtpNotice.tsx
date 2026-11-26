'use client';

import React from 'react';
import { FlaskConical, Copy, Check } from 'lucide-react';

interface DevOtpNoticeProps {
  devOtp?: string | null;
  onUseCode?: (code: string) => void;
}

/**
 * Displays a clearly labeled DEVELOPMENT OTP box ONLY when the server
 * explicitly returned `devOtp` (which itself is double-gated by
 * NODE_ENV === 'development' && AUTH_OTP_MODE === 'development').
 */
export function DevOtpNotice({ devOtp, onUseCode }: DevOtpNoticeProps) {
  const [copied, setCopied] = React.useState(false);

  if (!devOtp) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(devOtp);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="max-w-[440px] rounded-[14px] border border-[#E2B48F] bg-[#FCEFE4] px-4 py-3 flex flex-col gap-2 text-[#0B2A2F]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-[#8A3D12]">
          <FlaskConical className="w-4 h-4" />
          VERIFICATION CODE
        </span>
        <span className="text-[12px] text-[#8A3D12]">Shown on screen · SMS skipped for now</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span dir="ltr" className="mono text-[26px] font-bold tracking-[0.28em] text-[#08343A]">
          {devOtp}
        </span>

        <div className="flex items-center gap-1.5">
          {onUseCode && (
            <button
              type="button"
              onClick={() => onUseCode(devOtp)}
              className="h-[36px] px-3 rounded-[9px] bg-[#08343A] text-white text-[13px] font-semibold hover:opacity-95"
            >
              Fill code
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="h-[36px] px-2.5 rounded-[9px] bg-white border border-[#E2B48F] text-[#0B2A2F] text-[13px] font-semibold inline-flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#14532D]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
