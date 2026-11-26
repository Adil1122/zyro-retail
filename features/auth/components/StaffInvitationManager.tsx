'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link2, Trash2, UserPlus } from 'lucide-react';
import { PhoneInputField } from '@/features/auth/components/PhoneInputField';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { authService } from '@/features/auth/services/auth.service';
import type { BusinessInvitationRecord } from '@/features/auth/types/auth.types';
import { useZyro } from '@/hooks/useZyro';

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
}

interface StaffInvitationManagerProps {
  roles: RoleOption[];
}

/**
 * Reusable panel for Owners / Managers with `staff.manage` or `settings.manage`
 * to issue secure single-use staff invitations (Cashier, Stockkeeper, or custom roles),
 * copy the one-time invite link, and revoke pending invitations.
 */
export function StaffInvitationManager({ roles }: StaffInvitationManagerProps) {
  const auth = useAuth();
  const { notify } = useZyro();

  const branches = auth.activeMembership?.branches ?? [];
  const [invitations, setInvitations] = useState<BusinessInvitationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [invitedName, setInvitedName] = useState('');
  const [dialCode, setDialCode] = useState('+92');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [roleId, setRoleId] = useState(roles.find((r) => r.name === 'cashier')?.id ?? roles[0]?.id ?? '');
  const [creating, setCreating] = useState(false);
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadInvitations = useCallback(async () => {
    if (!auth.configured || !auth.activeMembership) return;
    setLoading(true);
    try {
      const res = await authService.listInvitations(auth.activeMembership.businessId);
      setInvitations(res.invitations);
    } catch {
      // ignore load errors when not permitted
    } finally {
      setLoading(false);
    }
  }, [auth.configured, auth.activeMembership]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitedName.trim() || !phone.trim() || !branchId || !roleId) return;

    setCreating(true);
    setLatestInviteUrl(null);
    try {
      const res = await authService.createInvitation({
        businessId: auth.activeMembership?.businessId,
        branchId,
        roleId,
        invitedName: invitedName.trim(),
        phone: phone.trim(),
        dialCode,
      });

      setLatestInviteUrl(res.inviteUrl);
      setInvitedName('');
      setPhone('');
      notify(`Invitation created for ${res.invitation.invitedName}`, 'ok');
      await loadInvitations();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to create invitation', 'err');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      await authService.revokeInvitation(invitationId, auth.activeMembership?.businessId);
      notify('Invitation revoked', 'info');
      await loadInvitations();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to revoke invitation', 'err');
    }
  };

  const copyLatestUrl = async () => {
    if (!latestInviteUrl) return;
    try {
      await navigator.clipboard.writeText(latestInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <section className="rounded-[16px] bg-white border border-[#E7E0D7] p-5 flex flex-col gap-4 text-[#0B2A2F]">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-[#FCEFE4] text-[#8A3D12] flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5" />
        </span>
        <div>
          <h3 className="m-0 text-[16px] font-bold">Invite staff member</h3>
          <p className="m-0 text-[13px] text-[#52666A]">
            Cashiers, stockkeepers and custom roles join through a verified mobile invitation.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inv-name" className="text-[13px] font-semibold text-[#3D5357]">
            Staff full name
          </label>
          <input
            id="inv-name"
            type="text"
            required
            value={invitedName}
            onChange={(e) => setInvitedName(e.target.value)}
            placeholder="Ali Hassan"
            className="field h-[48px] border border-[#8A8276] rounded-[12px] bg-white px-3 text-[15px]"
          />
        </div>

        <PhoneInputField
          id="inv-phone"
          label="Invited mobile number"
          dialCode={dialCode}
          onDialCodeChange={setDialCode}
          value={phone}
          onChange={setPhone}
          helperText="The invited employee must verify this exact number via OTP."
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="inv-branch" className="text-[13px] font-semibold text-[#3D5357]">
            Assigned branch
          </label>
          <select
            id="inv-branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="field h-[48px] border border-[#8A8276] rounded-[12px] bg-white px-3 text-[15px]"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="inv-role" className="text-[13px] font-semibold text-[#3D5357]">
            Assigned role
          </label>
          <select
            id="inv-role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="field h-[48px] border border-[#8A8276] rounded-[12px] bg-white px-3 text-[15px]"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={creating || !invitedName.trim() || !phone.trim() || !branchId || !roleId}
            className="bk h-[46px] px-5 rounded-[12px] text-[14px] font-bold inline-flex items-center gap-2 disabled:opacity-55"
          >
            <Link2 className="w-4 h-4" />
            <span>{creating ? 'Creating invite…' : 'Create secure invitation link'}</span>
          </button>
        </div>
      </form>

      {latestInviteUrl && (
        <div className="rounded-[12px] bg-[#E8F6EE] border border-[#A7DFC0] p-3.5 flex flex-col gap-2">
          <div className="text-[13px] font-bold text-[#14532D]">
            One-time invitation link ready (copy and share with your staff member)
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={latestInviteUrl}
              className="flex-1 min-w-0 h-[40px] rounded-[9px] bg-white border border-[#A7DFC0] px-3 mono text-[13px] text-[#0B2A2F]"
            />
            <button
              type="button"
              onClick={copyLatestUrl}
              className="h-[40px] px-3 rounded-[9px] bg-[#08343A] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="pt-2 border-t border-[#F1EBE3] flex flex-col gap-2">
          <div className="text-[12px] font-bold uppercase tracking-wider text-[#52666A]">
            Recent invitations {loading ? '· refreshing…' : ''}
          </div>
          <div className="flex flex-col gap-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] px-3.5 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-[#0B2A2F] truncate">
                    {inv.invitedName} · {inv.roleDisplayName}
                  </div>
                  <div className="text-[12px] text-[#52666A] mono">
                    {inv.invitedPhoneE164} · {inv.branchName} · {inv.status}
                  </div>
                </div>
                {inv.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => void handleRevoke(inv.id)}
                    className="h-[36px] px-3 rounded-[9px] bg-white border border-[#E7E0D7] text-[#B42318] text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#FDF0EF]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
