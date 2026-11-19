import {
  generateNumericOtp,
  generateOpaqueToken,
  generateSalt,
  hashOtpCode,
  hashToken,
  isDevelopmentOtpModeEnabled,
  verifyOtpHash,
} from '@/lib/auth/crypto';
import { maskE164Phone, normalizePhoneToE164 } from '@/lib/auth/phone';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { getOtpProvider, type OTPProvider } from '@/features/auth/providers';
import type { OtpPurpose, OtpRequestResponse, OtpVerifyResponse } from '@/features/auth/types/auth.types';

export const OTP_TTL_SECONDS = 300; // 5 minutes
export const OTP_RESEND_COOLDOWN_SECONDS = 60; // 60 seconds
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_PHONE_RATE_WINDOW_MINUTES = 15;
export const OTP_MAX_REQUESTS_PER_PHONE_WINDOW = 20;
export const OTP_MAX_REQUESTS_PER_IP_WINDOW = 50;
export const VERIFICATION_TOKEN_TTL_SECONDS = 900; // 15 minutes to complete registration/reset after OTP verify

export interface OtpChallengeRow {
  id: string;
  phone_e164: string;
  purpose: OtpPurpose;
  otp_hash: string;
  otp_salt: string;
  verification_token_hash: string | null;
  status: 'pending' | 'verified' | 'consumed' | 'expired' | 'invalidated';
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified_at: string | null;
  consumed_at: string | null;
  request_ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface OtpChallengeRepository {
  countRecentByPhone(phoneE164: string, sinceIso: string): Promise<number>;
  countRecentByIp(ip: string, sinceIso: string): Promise<number>;
  findLatestByPhoneAndPurpose(phoneE164: string, purpose: OtpPurpose): Promise<OtpChallengeRow | null>;
  invalidatePending(phoneE164: string, purpose: OtpPurpose): Promise<void>;
  insertChallenge(input: {
    phone_e164: string;
    purpose: OtpPurpose;
    otp_hash: string;
    otp_salt: string;
    max_attempts: number;
    expires_at: string;
    request_ip: string | null;
    user_agent: string | null;
  }): Promise<OtpChallengeRow>;
  updateChallenge(
    id: string,
    patch: Partial<
      Pick<
        OtpChallengeRow,
        'status' | 'attempts' | 'verified_at' | 'consumed_at' | 'verification_token_hash' | 'expires_at'
      >
    >,
  ): Promise<void>;
  findByVerificationTokenHash(tokenHash: string): Promise<OtpChallengeRow | null>;
}

export class OtpServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'OtpServiceError';
  }
}

export class SupabaseOtpChallengeRepository implements OtpChallengeRepository {
  private get client() {
    return createSupabaseServiceClient();
  }

  async countRecentByPhone(phoneE164: string, sinceIso: string): Promise<number> {
    const { count, error } = await this.client
      .from('auth_otp_challenges')
      .select('id', { count: 'exact', head: true })
      .eq('phone_e164', phoneE164)
      .gte('created_at', sinceIso);

    if (error) throw new Error(`Failed to check phone OTP rate limit: ${error.message}`);
    return count ?? 0;
  }

  async countRecentByIp(ip: string, sinceIso: string): Promise<number> {
    const { count, error } = await this.client
      .from('auth_otp_challenges')
      .select('id', { count: 'exact', head: true })
      .eq('request_ip', ip)
      .gte('created_at', sinceIso);

    if (error) throw new Error(`Failed to check IP OTP rate limit: ${error.message}`);
    return count ?? 0;
  }

  async findLatestByPhoneAndPurpose(phoneE164: string, purpose: OtpPurpose): Promise<OtpChallengeRow | null> {
    const { data, error } = await this.client
      .from('auth_otp_challenges')
      .select('*')
      .eq('phone_e164', phoneE164)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Failed to query OTP challenge: ${error.message}`);
    return (data as OtpChallengeRow | null) ?? null;
  }

  async invalidatePending(phoneE164: string, purpose: OtpPurpose): Promise<void> {
    const { error } = await this.client
      .from('auth_otp_challenges')
      .update({ status: 'invalidated' })
      .eq('phone_e164', phoneE164)
      .eq('purpose', purpose)
      .eq('status', 'pending');

    if (error) throw new Error(`Failed to invalidate previous OTP challenges: ${error.message}`);
  }

  async insertChallenge(input: {
    phone_e164: string;
    purpose: OtpPurpose;
    otp_hash: string;
    otp_salt: string;
    max_attempts: number;
    expires_at: string;
    request_ip: string | null;
    user_agent: string | null;
  }): Promise<OtpChallengeRow> {
    const { data, error } = await this.client
      .from('auth_otp_challenges')
      .insert({
        phone_e164: input.phone_e164,
        purpose: input.purpose,
        otp_hash: input.otp_hash,
        otp_salt: input.otp_salt,
        status: 'pending',
        attempts: 0,
        max_attempts: input.max_attempts,
        expires_at: input.expires_at,
        request_ip: input.request_ip,
        user_agent: input.user_agent,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create OTP challenge: ${error?.message ?? 'Unknown error'}`);
    }
    return data as OtpChallengeRow;
  }

  async updateChallenge(
    id: string,
    patch: Partial<
      Pick<
        OtpChallengeRow,
        'status' | 'attempts' | 'verified_at' | 'consumed_at' | 'verification_token_hash' | 'expires_at'
      >
    >,
  ): Promise<void> {
    const { error } = await this.client.from('auth_otp_challenges').update(patch).eq('id', id);
    if (error) throw new Error(`Failed to update OTP challenge: ${error.message}`);
  }

  async findByVerificationTokenHash(tokenHash: string): Promise<OtpChallengeRow | null> {
    const { data, error } = await this.client
      .from('auth_otp_challenges')
      .select('*')
      .eq('verification_token_hash', tokenHash)
      .maybeSingle();

    if (error) throw new Error(`Failed to validate OTP verification token: ${error.message}`);
    return (data as OtpChallengeRow | null) ?? null;
  }
}

export interface OtpServiceOptions {
  repository?: OtpChallengeRepository;
  provider?: OTPProvider;
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
}

export class OtpService {
  private readonly repo: OtpChallengeRepository;
  private readonly provider: OTPProvider;
  private readonly now: () => Date;
  private readonly env: NodeJS.ProcessEnv;

  constructor(options: OtpServiceOptions = {}) {
    this.repo = options.repository ?? new SupabaseOtpChallengeRepository();
    this.provider = options.provider ?? getOtpProvider();
    this.now = options.now ?? (() => new Date());
    this.env = options.env ?? process.env;
  }

  async requestOtp(params: {
    phone: string;
    dialCode?: string;
    purpose: OtpPurpose;
    requestIp?: string | null;
    userAgent?: string | null;
    isResend?: boolean;
  }): Promise<OtpRequestResponse> {
    const normalized = normalizePhoneToE164(params.phone, params.dialCode || '+92');
    if (!normalized.valid || !normalized.e164) {
      throw new OtpServiceError(normalized.error || 'Invalid mobile number.', 400, 'INVALID_PHONE');
    }

    const phoneE164 = normalized.e164;
    const nowDate = this.now();
    const nowMs = nowDate.getTime();
    const windowSinceIso = new Date(nowMs - OTP_PHONE_RATE_WINDOW_MINUTES * 60_000).toISOString();

    // 1. Check resend cooldown (60 seconds) only on explicit resend actions
    if (params.isResend) {
      const latest = await this.repo.findLatestByPhoneAndPurpose(phoneE164, params.purpose);
      if (latest) {
        const elapsedSeconds = Math.floor((nowMs - new Date(latest.created_at).getTime()) / 1000);
        if (elapsedSeconds >= 0 && elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
          const retryAfterSeconds = OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
          throw new OtpServiceError(
            `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
            429,
            'OTP_COOLDOWN',
            { retryAfterSeconds },
          );
        }
      }
    }

    // 2. Per-phone rate limit
    const recentPhoneCount = await this.repo.countRecentByPhone(phoneE164, windowSinceIso);
    if (recentPhoneCount >= OTP_MAX_REQUESTS_PER_PHONE_WINDOW) {
      throw new OtpServiceError(
        'Too many verification codes requested for this number. Please try again in 15 minutes.',
        429,
        'OTP_PHONE_RATE_LIMIT',
      );
    }

    // 3. Per-IP rate limit
    if (params.requestIp) {
      const recentIpCount = await this.repo.countRecentByIp(params.requestIp, windowSinceIso);
      if (recentIpCount >= OTP_MAX_REQUESTS_PER_IP_WINDOW) {
        throw new OtpServiceError(
          'Too many verification requests from this network. Please wait and try again.',
          429,
          'OTP_IP_RATE_LIMIT',
        );
      }
    }

    // 4. Invalidate any previous pending codes for this phone + purpose
    await this.repo.invalidatePending(phoneE164, params.purpose);

    // 5. Generate CSPRNG 6-digit OTP & store ONLY salted HMAC-SHA256 hash
    const rawOtp = generateNumericOtp(6);
    const salt = generateSalt(16);
    const otpHash = hashOtpCode(rawOtp, salt);
    const expiresAt = new Date(nowMs + OTP_TTL_SECONDS * 1000).toISOString();

    const created = await this.repo.insertChallenge({
      phone_e164: phoneE164,
      purpose: params.purpose,
      otp_hash: otpHash,
      otp_salt: salt,
      max_attempts: OTP_MAX_ATTEMPTS,
      expires_at: expiresAt,
      request_ip: params.requestIp ?? null,
      user_agent: params.userAgent ?? null,
    });

    // 6. Dispatch via OTPProvider
    const dispatchPayload = {
      phoneE164,
      purpose: params.purpose,
      code: rawOtp,
      expiresInSeconds: OTP_TTL_SECONDS,
    };

    const dispatchResult = params.isResend
      ? await this.provider.resendOtp(dispatchPayload)
      : await this.provider.sendOtp(dispatchPayload);

    const exposeDevOtp = isDevelopmentOtpModeEnabled(this.env) && Boolean(dispatchResult.devOtp);

    return {
      ok: true,
      challengeId: created.id,
      phoneE164,
      maskedPhone: maskE164Phone(phoneE164),
      purpose: params.purpose,
      expiresInSeconds: OTP_TTL_SECONDS,
      resendCooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      ...(exposeDevOtp ? { devOtp: rawOtp, devMode: true } : {}),
    };
  }

  async verifyOtp(params: {
    phone: string;
    dialCode?: string;
    purpose: OtpPurpose;
    code: string;
  }): Promise<OtpVerifyResponse> {
    const normalized = normalizePhoneToE164(params.phone, params.dialCode || '+92');
    if (!normalized.valid || !normalized.e164) {
      throw new OtpServiceError(normalized.error || 'Invalid mobile number.', 400, 'INVALID_PHONE');
    }

    const cleanCode = (params.code || '').trim();
    if (!this.provider.verifyOtpFormat(cleanCode)) {
      throw new OtpServiceError('Enter the 6-digit verification code.', 400, 'INVALID_OTP_FORMAT');
    }

    const phoneE164 = normalized.e164;
    const challenge = await this.repo.findLatestByPhoneAndPurpose(phoneE164, params.purpose);

    if (!challenge || challenge.status === 'invalidated' || challenge.status === 'consumed') {
      throw new OtpServiceError(
        'No active verification code found. Request a new code and try again.',
        400,
        'OTP_NOT_FOUND',
      );
    }

    const nowMs = this.now().getTime();
    if (challenge.status === 'expired' || new Date(challenge.expires_at).getTime() <= nowMs) {
      if (challenge.status === 'pending') {
        await this.repo.updateChallenge(challenge.id, { status: 'expired' });
      }
      throw new OtpServiceError(
        'This verification code has expired. Request a new code.',
        400,
        'OTP_EXPIRED',
      );
    }

    if (challenge.status === 'verified') {
      throw new OtpServiceError(
        'This code was already verified. Request a new code if you need to restart.',
        400,
        'OTP_ALREADY_USED',
      );
    }

    if (challenge.attempts >= challenge.max_attempts) {
      await this.repo.updateChallenge(challenge.id, { status: 'invalidated' });
      throw new OtpServiceError(
        'Too many incorrect attempts. Request a new verification code.',
        429,
        'OTP_MAX_ATTEMPTS',
        { remainingAttempts: 0 },
      );
    }

    const matched = verifyOtpHash(cleanCode, challenge.otp_salt, challenge.otp_hash);

    if (!matched) {
      const nextAttempts = challenge.attempts + 1;
      const remainingAttempts = Math.max(0, challenge.max_attempts - nextAttempts);
      await this.repo.updateChallenge(challenge.id, {
        attempts: nextAttempts,
        status: nextAttempts >= challenge.max_attempts ? 'invalidated' : 'pending',
      });

      if (remainingAttempts === 0) {
        throw new OtpServiceError(
          'Too many incorrect attempts. Request a new verification code.',
          429,
          'OTP_MAX_ATTEMPTS',
          { remainingAttempts: 0 },
        );
      }

      throw new OtpServiceError(
        `Incorrect verification code. ${remainingAttempts} ${remainingAttempts === 1 ? 'try' : 'tries'} left.`,
        400,
        'OTP_MISMATCH',
        { remainingAttempts },
      );
    }

    // Verified! Mint single-use opaque verification proof token (store ONLY SHA-256 hash)
    const verificationToken = generateOpaqueToken(32);
    const verificationTokenHash = hashToken(verificationToken);
    const proofExpiresAt = new Date(nowMs + VERIFICATION_TOKEN_TTL_SECONDS * 1000).toISOString();

    await this.repo.updateChallenge(challenge.id, {
      status: 'verified',
      verified_at: new Date(nowMs).toISOString(),
      verification_token_hash: verificationTokenHash,
      expires_at: proofExpiresAt,
    });

    return {
      ok: true,
      verified: true,
      phoneE164,
      purpose: params.purpose,
      verificationToken,
      expiresAt: proofExpiresAt,
    };
  }

  /**
   * Validates and consumes a verified OTP proof token (single-use).
   * Used by /api/auth/register/owner, /api/auth/register/invited-user, and /api/auth/password/reset.
   */
  async assertAndConsumeVerifiedToken(params: {
    verificationToken: string;
    phoneE164: string;
    purpose: OtpPurpose;
    consumeNow?: boolean;
  }): Promise<OtpChallengeRow> {
    if (!params.verificationToken || params.verificationToken.trim().length < 16) {
      throw new OtpServiceError('Phone verification is required before continuing.', 401, 'OTP_TOKEN_MISSING');
    }

    const tokenHash = hashToken(params.verificationToken.trim());
    const challenge = await this.repo.findByVerificationTokenHash(tokenHash);

    if (!challenge) {
      throw new OtpServiceError(
        'Phone verification session is invalid. Verify your number again.',
        401,
        'OTP_TOKEN_INVALID',
      );
    }

    if (challenge.purpose !== params.purpose || challenge.phone_e164 !== params.phoneE164) {
      throw new OtpServiceError(
        'Phone verification does not match this request. Verify your number again.',
        401,
        'OTP_TOKEN_MISMATCH',
      );
    }

    if (challenge.status !== 'verified') {
      throw new OtpServiceError(
        'This phone verification has already been used or invalidated. Request a new code.',
        401,
        'OTP_TOKEN_USED',
      );
    }

    const nowMs = this.now().getTime();
    if (new Date(challenge.expires_at).getTime() <= nowMs) {
      await this.repo.updateChallenge(challenge.id, { status: 'expired' });
      throw new OtpServiceError(
        'Your phone verification expired. Request a new code to continue.',
        401,
        'OTP_TOKEN_EXPIRED',
      );
    }

    if (params.consumeNow !== false) {
      await this.repo.updateChallenge(challenge.id, {
        status: 'consumed',
        consumed_at: new Date(nowMs).toISOString(),
      });
    }

    return challenge;
  }

  async markConsumed(challengeId: string): Promise<void> {
    await this.repo.updateChallenge(challengeId, {
      status: 'consumed',
      consumed_at: this.now().toISOString(),
    });
  }
}
