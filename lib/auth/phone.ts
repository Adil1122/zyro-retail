const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export interface NormalizedPhoneResult {
  valid: boolean;
  e164: string | null;
  error?: string;
}

/**
 * Normalizes user-entered mobile phone numbers to strict E.164 format.
 * Handles:
 *  - Already-prefixed international numbers (e.g. "+92 321 4567890", "00923214567890")
 *  - Pakistani local format ("0321 4567890", "321 4567890") when dialCode is "+92"
 *  - Generic dialCode + local subscriber digits
 */
export function normalizePhoneToE164(rawInput: string, defaultDialCode = '+92'): NormalizedPhoneResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { valid: false, e164: null, error: 'Mobile number is required.' };
  }

  let cleaned = trimmed.replace(/[\s\-().]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  let candidate: string;
  if (cleaned.startsWith('+')) {
    candidate = '+' + cleaned.slice(1).replace(/\D/g, '');
  } else {
    const digitsOnly = cleaned.replace(/\D/g, '');
    const cleanDial = '+' + defaultDialCode.replace(/\D/g, '');
    const dialDigits = cleanDial.slice(1);

    if (digitsOnly.startsWith(dialDigits) && digitsOnly.length >= dialDigits.length + 7) {
      candidate = '+' + digitsOnly;
    } else if (digitsOnly.startsWith('0')) {
      candidate = cleanDial + digitsOnly.replace(/^0+/, '');
    } else {
      candidate = cleanDial + digitsOnly;
    }
  }

  // Country-specific sanity check for Pakistan (+92 mobile numbers are 10 digits starting with 3)
  if (candidate.startsWith('+92')) {
    const national = candidate.slice(3);
    if (!/^3\d{9}$/.test(national)) {
      return {
        valid: false,
        e164: null,
        error: 'Enter a valid 10-digit Pakistani mobile number starting with 3 (e.g. +92 300 1234567).',
      };
    }
  }

  if (!E164_REGEX.test(candidate)) {
    return {
      valid: false,
      e164: null,
      error: 'Enter a valid mobile number in international format (e.g. +92 300 1234567).',
    };
  }

  return { valid: true, e164: candidate };
}

export function maskE164Phone(phoneE164: string): string {
  if (!phoneE164) return '';
  if (phoneE164.startsWith('+92') && phoneE164.length === 13) {
    return `+92 ${phoneE164.slice(3, 6)} ••••${phoneE164.slice(-3)}`;
  }
  const visiblePrefix = phoneE164.slice(0, Math.min(5, phoneE164.length - 3));
  const visibleSuffix = phoneE164.slice(-3);
  return `${visiblePrefix}••••${visibleSuffix}`;
}

export function formatE164ForDisplay(phoneE164: string): string {
  if (!phoneE164) return '';
  if (phoneE164.startsWith('+92') && phoneE164.length === 13) {
    return `+92 ${phoneE164.slice(3, 6)} ${phoneE164.slice(6)}`;
  }
  return phoneE164;
}

export interface PasswordValidationResult {
  valid: boolean;
  minLengthOk: boolean;
  hasDigitOk: boolean;
  notPhoneOk: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string, phoneE164?: string | null): PasswordValidationResult {
  const minLengthOk = password.length >= 8;
  const hasDigitOk = /\d/.test(password);

  const pwDigits = password.replace(/\D/g, '');
  const phoneNational = phoneE164 ? phoneE164.replace(/\D/g, '').slice(-10) : '';
  const notPhoneOk = !phoneNational || phoneNational.length < 7 || !pwDigits.includes(phoneNational);

  const errors: string[] = [];
  if (!minLengthOk) errors.push('Password must be at least 8 characters.');
  if (!hasDigitOk) errors.push('Password must include at least one number.');
  if (!notPhoneOk) errors.push('Password must not contain your mobile number.');

  return {
    valid: minLengthOk && hasDigitOk && notPhoneOk,
    minLengthOk,
    hasDigitOk,
    notPhoneOk,
    errors,
  };
}
