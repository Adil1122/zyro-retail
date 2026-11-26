import type { OtpPurpose } from '@/features/auth/types/auth.types';

export interface OtpDispatchInput {
  phoneE164: string;
  purpose: OtpPurpose;
  code: string;
  expiresInSeconds: number;
}

export interface OtpDispatchResult {
  delivered: boolean;
  channel: 'development' | 'sms';
  providerReference: string;
  /** Strictly populated ONLY by DevelopmentOTPProvider when dev mode double-gate passes */
  devOtp?: string;
}

export interface OTPProvider {
  readonly providerName: string;
  sendOtp(input: OtpDispatchInput): Promise<OtpDispatchResult>;
  resendOtp(input: OtpDispatchInput): Promise<OtpDispatchResult>;
  verifyOtpFormat(code: string): boolean;
}
