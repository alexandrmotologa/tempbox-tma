import { describe, it, expect } from 'vitest';
import { extractOtp } from '../src/services/otp_extractor.js';

describe('OTP & Verification Code Extractor', () => {
  it('extracts Google G-xxxxxx codes accurately', () => {
    const text = 'G-492019 is your Google verification code. Do not share it.';
    const result = extractOtp(text, 'Google Verification');
    expect(result).toBeDefined();
    expect(result?.code).toBe('492019');
    expect(result?.kind).toBe('numeric');
    expect(result?.confidence).toBeGreaterThan(0.95);
  });

  it('extracts GitHub 6-digit authentication codes', () => {
    const text = 'Your GitHub authentication code is 849201. This code expires in 10 minutes.';
    const subject = 'Verification code for your account';
    const result = extractOtp(text, subject);
    expect(result).toBeDefined();
    expect(result?.code).toBe('849201');
    expect(result?.confidence).toBeGreaterThan(0.9);
  });

  it('extracts colon-separated verification codes', () => {
    const text = 'Your verification code: 629401\nValid for 15 minutes.';
    const result = extractOtp(text);
    expect(result).toBeDefined();
    expect(result?.code).toBe('629401');
  });

  it('extracts dash-split codes (e.g. 123-456)', () => {
    const text = 'Enter passcode: 928-104 on the confirmation screen.';
    const result = extractOtp(text);
    expect(result).toBeDefined();
    expect(result?.code).toBe('928104');
  });

  it('extracts reversed pattern (e.g. 741852 is your verification code)', () => {
    const text = '741852 is your security code. Please do not reply.';
    const result = extractOtp(text);
    expect(result).toBeDefined();
    expect(result?.code).toBe('741852');
  });

  it('extracts French code de vérification', () => {
    const text = 'Votre code de vérification est 384912.';
    const result = extractOtp(text);
    expect(result).toBeDefined();
    expect(result?.code).toBe('384912');
  });

  it('ignores calendar years and phone numbers', () => {
    const text = 'Copyright 2024 TempBox Inc. Call us at 1-800-555-0199.';
    const result = extractOtp(text);
    expect(result).toBeUndefined();
  });

  it('extracts alphanumeric token codes when anchored by keyword', () => {
    const text = 'Your confirmation code: A9B2C4';
    const result = extractOtp(text);
    expect(result).toBeDefined();
    expect(result?.code).toBe('A9B2C4');
    expect(result?.kind).toBe('alphanumeric');
  });
});
