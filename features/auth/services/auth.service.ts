'use client';

import type {
  AuthSessionPayload,
  BusinessInvitationRecord,
  InvitationValidationPayload,
  OtpPurpose,
  OtpRequestResponse,
  OtpVerifyResponse,
} from '@/features/auth/types/auth.types';

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new AuthApiError(
      (typeof data.error === 'string' && data.error) ||
        (typeof data.message === 'string' && data.message) ||
        `Request failed (${res.status})`,
      res.status,
      typeof data.code === 'string' ? data.code : undefined,
      data,
    );
  }
  return data as T;
}

export const authService = {
  async getSession(): Promise<AuthSessionPayload> {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    return parseJsonResponse<AuthSessionPayload>(res);
  },

  async requestOtp(params: {
    phone: string;
    dialCode?: string;
    purpose: OtpPurpose;
    isResend?: boolean;
  }): Promise<OtpRequestResponse> {
    const res = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    return parseJsonResponse<OtpRequestResponse>(res);
  },

  async verifyOtp(params: {
    phone: string;
    dialCode?: string;
    purpose: OtpPurpose;
    code: string;
  }): Promise<OtpVerifyResponse> {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    return parseJsonResponse<OtpVerifyResponse>(res);
  },

  async registerOwner(params: {
    fullName: string;
    phone: string;
    dialCode?: string;
    email?: string;
    password: string;
    confirmPassword: string;
    acceptedTerms: boolean;
    verificationToken: string;
    businessName: string;
    businessPhone?: string;
    businessType: string;
    country?: string;
    currency?: string;
    timezone?: string;
    branchName: string;
    city?: string;
    address?: string;
  }): Promise<{
    ok: boolean;
    userId: string;
    workspace: { businessId: string; branchId: string; memberId: string; roleId: string };
    signedIn: boolean;
    session: AuthSessionPayload | null;
    redirectTo: string;
  }> {
    const res = await fetch('/api/auth/register/owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    return parseJsonResponse(res);
  },

  async signInWithPassword(params: {
    identifier: string;
    dialCode?: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<{
    ok: boolean;
    session: AuthSessionPayload;
    redirectTo: string;
  }> {
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    return parseJsonResponse(res);
  },

  async selectWorkspace(params: { businessId: string; branchId?: string }): Promise<{
    ok: boolean;
    businessId: string;
    branchId: string | null;
    redirectTo: string;
  }> {
    const res = await fetch('/api/auth/workspace/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    return parseJsonResponse(res);
  },

  async signOut(): Promise<{ ok: boolean }> {
    const res = await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
    });
    return parseJsonResponse(res);
  },

  async resetPassword(params: {
    phone: string;
    dialCode?: string;
    verificationToken: string;
    newPassword: string;
    confirmPassword: string;
    autoSignIn?: boolean;
  }): Promise<{
    ok: boolean;
    passwordReset: boolean;
    signedIn: boolean;
    session: AuthSessionPayload | null;
    redirectTo: string;
  }> {
    const res = await fetch('/api/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    return parseJsonResponse(res);
  },

  async validateInvitation(params: {
    token?: string;
    phone?: string;
    dialCode?: string;
  }): Promise<InvitationValidationPayload> {
    const res = await fetch('/api/auth/invitations/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    const data = (await res.json().catch(() => ({}))) as InvitationValidationPayload;
    if (res.status >= 500) {
      throw new AuthApiError(data.message || 'Unable to validate invitation.', res.status);
    }
    return data;
  },

  async registerInvitedUser(params: {
    invitationToken?: string;
    phone?: string;
    dialCode?: string;
    fullName: string;
    password: string;
    confirmPassword: string;
    verificationToken: string;
  }): Promise<{
    ok: boolean;
    userId: string;
    membership: {
      businessId: string;
      branchId: string;
      memberId: string;
      roleId: string;
      roleName: string;
    };
    signedIn: boolean;
    session: AuthSessionPayload | null;
    redirectTo: string;
  }> {
    const res = await fetch('/api/auth/register/invited-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    return parseJsonResponse(res);
  },

  async listInvitations(businessId?: string): Promise<{ ok: boolean; invitations: BusinessInvitationRecord[] }> {
    const qs = businessId ? `?businessId=${encodeURIComponent(businessId)}` : '';
    const res = await fetch(`/api/auth/invitations${qs}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    return parseJsonResponse(res);
  },

  async createInvitation(params: {
    businessId?: string;
    branchId: string;
    roleId: string;
    invitedName: string;
    phone: string;
    dialCode?: string;
    expiresInHours?: number;
  }): Promise<{
    ok: boolean;
    invitation: BusinessInvitationRecord;
    invitePath: string;
    inviteUrl: string;
  }> {
    const res = await fetch('/api/auth/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    return parseJsonResponse(res);
  },

  async revokeInvitation(invitationId: string, businessId?: string): Promise<{ ok: boolean }> {
    const res = await fetch('/api/auth/invitations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ invitationId, businessId, action: 'revoke' }),
    });
    return parseJsonResponse(res);
  },
};
