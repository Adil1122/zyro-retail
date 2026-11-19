import { isDevelopmentOtpModeEnabled } from '@/lib/auth/crypto';
import type { OtpDispatchInput, OtpDispatchResult, OTPProvider } from './otp-provider.interface';

/**
 * DevelopmentOTPProvider:
 * Generates / dispatches OTPs locally without invoking any external SMS gateway.
 * Strictly guards devOtp exposure behind BOTH NODE_ENV === 'development' AND
 * AUTH_OTP_MODE === 'development'.
 */
export class DevelopmentOTPProvider implements OTPProvider {
  readonly providerName = 'development';

  async sendOtp(input: OtpDispatchInput): Promise<OtpDispatchResult> {
    const devMode = isDevelopmentOtpModeEnabled();

    if (devMode) {
      // eslint-disable-next-line no-console
      console.info(
        `[ZYRO DEV OTP] purpose=${input.purpose} phone=${input.phoneE164} code=${input.code} ttl=${input.expiresInSeconds}s`,
      );
    }

    return {
      delivered: true,
      channel: 'development',
      providerReference: `dev-${Date.now()}`,
      ...(devMode ? { devOtp: input.code } : {}),
    };
  }

  async resendOtp(input: OtpDispatchInput): Promise<OtpDispatchResult> {
    return this.sendOtp(input);
  }

  verifyOtpFormat(code: string): boolean {
    return /^\d{6}$/.test(code.trim());
  }
}
