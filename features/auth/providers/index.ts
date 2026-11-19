import { DevelopmentOTPProvider } from './development-otp.provider';
import type { OTPProvider } from './otp-provider.interface';

export type SupportedOtpProviderName = 'development' | 'supabase_phone' | 'twilio' | 'vonage' | 'pakistan_sms';

/**
 * Resolves the active server-side OTP provider.
 * Falls back to DevelopmentOTPProvider until an external SMS adapter (Twilio, Vonage, etc.)
 * is registered, so phone verification works without extra env configuration.
 */
export function getOtpProvider(): OTPProvider {
  const configured = (process.env.AUTH_OTP_PROVIDER || 'development')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .toLowerCase();

  switch (configured) {
    case '':
    case 'development':
    case 'dev':
    case 'developmentotpprovider':
    default:
      return new DevelopmentOTPProvider();
  }
}

export { DevelopmentOTPProvider };
export type { OTPProvider, OtpDispatchInput, OtpDispatchResult } from './otp-provider.interface';
