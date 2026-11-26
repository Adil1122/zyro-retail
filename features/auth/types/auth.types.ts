export type OtpPurpose = 'owner_register' | 'staff_invite' | 'password_reset';

export interface CountryDialCode {
  code: string;
  dialCode: string;
  name: string;
  currency: string;
  timezone: string;
  placeholder: string;
}

export const COUNTRY_OPTIONS: CountryDialCode[] = [
  {
    code: 'PK',
    dialCode: '+92',
    name: 'Pakistan',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    placeholder: '300 1234567',
  },
  {
    code: 'AE',
    dialCode: '+971',
    name: 'United Arab Emirates',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    placeholder: '50 1234567',
  },
  {
    code: 'SA',
    dialCode: '+966',
    name: 'Saudi Arabia',
    currency: 'SAR',
    timezone: 'Asia/Riyadh',
    placeholder: '50 1234567',
  },
  {
    code: 'GB',
    dialCode: '+44',
    name: 'United Kingdom',
    currency: 'GBP',
    timezone: 'Europe/London',
    placeholder: '7700 900123',
  },
  {
    code: 'US',
    dialCode: '+1',
    name: 'United States',
    currency: 'USD',
    timezone: 'America/New_York',
    placeholder: '415 5550199',
  },
];

export const SUPPORTED_CURRENCIES = ['PKR', 'AED', 'SAR', 'USD', 'GBP', 'EUR'] as const;

export interface OtpRequestResponse {
  ok: boolean;
  challengeId: string;
  phoneE164: string;
  maskedPhone: string;
  purpose: OtpPurpose;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  /** Strictly populated ONLY when NODE_ENV === 'development' AND AUTH_OTP_MODE === 'development' */
  devOtp?: string;
  devMode?: boolean;
  message?: string;
}

export interface OtpVerifyResponse {
  ok: boolean;
  verified: boolean;
  phoneE164: string;
  purpose: OtpPurpose;
  verificationToken: string;
  expiresAt: string;
}

export interface WorkspaceBranchSummary {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  isMain: boolean;
  isDefault: boolean;
}

export interface WorkspaceMembershipSummary {
  memberId: string;
  businessId: string;
  businessName: string;
  businessStatus: 'active' | 'suspended' | 'archived';
  shopKit: string;
  currency: string;
  timezone: string;
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  isSystemRole: boolean;
  memberStatus: 'invited' | 'active' | 'suspended' | 'removed';
  permissions: string[];
  branches: WorkspaceBranchSummary[];
  defaultBranchId: string | null;
}

export interface AuthSessionPayload {
  authenticated: boolean;
  configured: boolean;
  user: {
    id: string;
    fullName: string;
    shortName: string;
    phone: string | null;
    email: string | null;
    avatarBg: string;
    avatarFg: string;
    initials: string;
  } | null;
  memberships: WorkspaceMembershipSummary[];
  activeBusinessId: string | null;
  activeBranchId: string | null;
  activeMembership: WorkspaceMembershipSummary | null;
  accountStatus:
    | 'unauthenticated'
    | 'active'
    | 'needs_workspace_selection'
    | 'pending'
    | 'disabled'
    | 'no_membership';
  recommendedRedirect: string;
}

export interface InvitationValidationPayload {
  valid: boolean;
  status: 'valid' | 'expired' | 'revoked' | 'accepted' | 'invalid';
  invitationId?: string;
  businessId?: string;
  businessName?: string;
  branchId?: string;
  branchName?: string;
  roleId?: string;
  roleName?: string;
  roleDisplayName?: string;
  invitedName?: string;
  invitedPhoneE164?: string;
  maskedPhone?: string;
  expiresAt?: string;
  message?: string;
}

export interface BusinessInvitationRecord {
  id: string;
  businessId: string;
  branchId: string;
  branchName: string;
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  invitedName: string;
  invitedPhoneE164: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
}
