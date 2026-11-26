import { generateOpaqueToken, hashToken } from '@/lib/auth/crypto';
import { maskE164Phone, normalizePhoneToE164 } from '@/lib/auth/phone';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { InvitationValidationPayload } from '@/features/auth/types/auth.types';

export const DEFAULT_INVITATION_TTL_HOURS = 72;

export function generateInvitationTokenPair(): { rawToken: string; tokenHash: string } {
  const rawToken = generateOpaqueToken(32);
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

interface RawInvitationWithRelations {
  id: string;
  business_id: string;
  branch_id: string;
  role_id: string;
  invited_name: string;
  invited_phone_e164: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  businesses: { id: string; name: string; status: string; deleted_at: string | null } | null;
  branches: { id: string; name: string; is_active: boolean; deleted_at: string | null } | null;
  roles: { id: string; name: string; display_name: string } | null;
}

export function evaluateInvitationRow(
  row: RawInvitationWithRelations | null,
  now: Date = new Date(),
): InvitationValidationPayload {
  if (!row || !row.businesses || row.businesses.deleted_at || row.businesses.status !== 'active') {
    return {
      valid: false,
      status: 'invalid',
      message: 'This invitation link is invalid or the business is no longer active.',
    };
  }

  const base = {
    invitationId: row.id,
    businessId: row.business_id,
    businessName: row.businesses.name,
    branchId: row.branch_id,
    branchName: row.branches?.name || 'Main branch',
    roleId: row.role_id,
    roleName: row.roles?.name || 'cashier',
    roleDisplayName: row.roles?.display_name || 'Staff',
    invitedName: row.invited_name,
    invitedPhoneE164: row.invited_phone_e164,
    maskedPhone: maskE164Phone(row.invited_phone_e164),
    expiresAt: row.expires_at,
  };

  if (row.status === 'revoked') {
    return {
      ...base,
      valid: false,
      status: 'revoked',
      message: 'This invitation was revoked by the shop owner. Ask for a new invitation.',
    };
  }

  if (row.status === 'accepted') {
    return {
      ...base,
      valid: false,
      status: 'accepted',
      message: 'This invitation has already been accepted. Sign in with your mobile number instead.',
    };
  }

  if (row.status === 'expired' || new Date(row.expires_at).getTime() <= now.getTime()) {
    return {
      ...base,
      valid: false,
      status: 'expired',
      message: 'This invitation has expired. Ask your shop owner to send a fresh invite.',
    };
  }

  if (!row.branches || row.branches.deleted_at || !row.branches.is_active || !row.roles) {
    return {
      ...base,
      valid: false,
      status: 'invalid',
      message: 'The branch or role assigned to this invitation is no longer available.',
    };
  }

  return {
    ...base,
    valid: true,
    status: 'valid',
  };
}

export async function validateInvitationByRawToken(rawToken: string): Promise<InvitationValidationPayload> {
  const trimmed = (rawToken || '').trim();
  if (trimmed.length < 16) {
    return {
      valid: false,
      status: 'invalid',
      message: 'Invitation token is missing or malformed.',
    };
  }

  const tokenHash = hashToken(trimmed);
  const admin = createSupabaseServiceClient();

  const { data, error } = await admin
    .from('business_invitations')
    .select(
      `
      id,
      business_id,
      branch_id,
      role_id,
      invited_name,
      invited_phone_e164,
      status,
      expires_at,
      businesses:business_id ( id, name, status, deleted_at ),
      branches:branch_id ( id, name, is_active, deleted_at ),
      roles:role_id ( id, name, display_name )
    `,
    )
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate invitation: ${error.message}`);
  }

  const row = (data as unknown as RawInvitationWithRelations | null) ?? null;
  const evaluated = evaluateInvitationRow(row);

  if (row && row.status === 'pending' && evaluated.status === 'expired') {
    await admin.from('business_invitations').update({ status: 'expired' }).eq('id', row.id);
  }

  return evaluated;
}

export async function findLatestInvitationByPhone(
  phone: string,
  dialCode = '+92',
): Promise<InvitationValidationPayload> {
  const normalized = normalizePhoneToE164(phone, dialCode);
  if (!normalized.valid || !normalized.e164) {
    return {
      valid: false,
      status: 'invalid',
      message: normalized.error || 'Enter a valid mobile number.',
    };
  }

  const admin = createSupabaseServiceClient();
  const { data, error } = await admin
    .from('business_invitations')
    .select(
      `
      id,
      business_id,
      branch_id,
      role_id,
      invited_name,
      invited_phone_e164,
      status,
      expires_at,
      businesses:business_id ( id, name, status, deleted_at ),
      branches:branch_id ( id, name, is_active, deleted_at ),
      roles:role_id ( id, name, display_name )
    `,
    )
    .eq('invited_phone_e164', normalized.e164)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up invitation: ${error.message}`);
  }

  const row = (data as unknown as RawInvitationWithRelations | null) ?? null;
  if (!row) {
    return {
      valid: false,
      status: 'invalid',
      message: 'This number does not have a pending shop invitation yet. Ask your shop owner to invite you.',
    };
  }

  return evaluateInvitationRow(row);
}
