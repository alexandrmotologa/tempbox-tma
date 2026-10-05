import type { ExtractedOtp } from '@tempbox/shared-types';

/**
 * Fast regex OTP extractor for Telegram bot messages and notifications.
 */
export function extractVerificationCode(text: string): ExtractedOtp | undefined {
  if (!text) return undefined;

  // 1. Google G-xxxxxx
  const google = text.match(/\bG-(\d{6})\b/i);
  if (google) {
    return {
      code: google[1],
      kind: 'numeric',
      confidence: 0.99,
      label: 'Google Verification Code'
    };
  }

  // 2. Keyword followed by 4-8 digit number
  const codeMatch = text.match(/(?:code|otp|passcode|pin|password|código|token)[\s:=–—]+(?:is\s+)?(\d{4,8})\b/i);
  if (codeMatch) {
    return {
      code: codeMatch[1],
      kind: 'numeric',
      confidence: 0.95,
      label: 'Verification Code'
    };
  }

  // 3. Reversed phrasing: "123456 is your code"
  const revMatch = text.match(/\b(\d{4,8})\s+is\s+your\s+(?:[\w-]+\s+)?code\b/i);
  if (revMatch) {
    return {
      code: revMatch[1],
      kind: 'numeric',
      confidence: 0.95,
      label: 'Verification Code'
    };
  }

  // 4. Standalone 6-digit number in auth context
  if (/(?:verify|verification|security|authentication|login|account)/i.test(text)) {
    const standalone = text.match(/\b(\d{6})\b/);
    if (standalone) {
      return {
        code: standalone[1],
        kind: 'numeric',
        confidence: 0.85,
        label: 'Verification Code'
      };
    }
  }

  return undefined;
}
