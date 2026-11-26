'use client';

import React, { useState } from 'react';
import { LogOut, X } from 'lucide-react';

interface SignOutConfirmModalProps {
  open: boolean;
  userName?: string;
  shopName?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

export function SignOutConfirmModal({
  open,
  userName,
  shopName,
  onCancel,
  onConfirm,
}: SignOutConfirmModalProps) {
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="zyro-signout-title"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#08343A]/45 backdrop-blur-[2px] p-4"
    >
      <div className="anim-up w-full max-w-[420px] rounded-[18px] bg-white border border-[#E7E0D7] shadow-[0_24px_64px_rgba(10,28,22,.28)] p-6 flex flex-col gap-4 text-[#0B2A2F]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-[#FDF0EF] text-[#B42318] flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5" />
            </span>
            <div>
              <h2 id="zyro-signout-title" className="m-0 font-display text-[20px] font-bold">
                Sign out of Zyro?
              </h2>
              {shopName && <p className="m-0 text-[13px] text-[#52666A]">{shopName}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-[#F1EBE3] text-[#3D5357] flex items-center justify-center hover:bg-[#E7E0D7]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="m-0 text-[15px] leading-[1.5] text-[#3D5357]">
          {userName
            ? `You will be signed out of ${userName}’s account on this device. Any unsaved draft bills should be held or saved first.`
            : 'You will be signed out on this device. You can sign back in with your mobile number and password at any time.'}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="bs h-[46px] px-4 rounded-[12px] text-[15px] font-semibold text-[#0B2A2F]"
          >
            Stay signed in
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="h-[46px] px-5 rounded-[12px] bg-[#B42318] text-white text-[15px] font-bold hover:opacity-95 disabled:opacity-60"
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
}
