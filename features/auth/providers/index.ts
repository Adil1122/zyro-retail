import { DevelopmentOTPProvider } from './development-otp.provider';
import type { OTPProvider } from './otp-provider.interface';

export type SupportedOtpProviderName = 'development' | 'supabase_phone' | 'twilio' | 'vonage' | 'pakistan_sms';

/**
 * Resolves the active server-side OTP provider.
 * To add Twilio, Vonage, Supabase Phone Auth, or a Pakistani SMS gateway later,
 * implement OTPProvider and wire it here without modifying auth forms or DB schema.
 */
export function getOtpProvider(): OTPProvider {
  const configured = (process.env.AUTH_OTP_PROVIDER || 'development').trim().toLowerCase();

  switch (configured) {
    case 'development':
      return new DevelopmentOTPProvider();
    default:
      throw new Error(
        `Unsupported AUTH_OTP_PROVIDER="${configured}". Register an SMS OTPProvider adapter before enabling it in production.`,
      );
  }
}

export { DevelopmentOTPProvider };
export type { OTPProvider, OtpDispatchInput, OtpDispatchResult } from './otp-provider.interface';
