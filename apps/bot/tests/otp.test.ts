import { describe, it, expect } from 'vitest';
import { extractVerificationCode } from '../src/otp.js';

describe('Bot Verification Code Extraction', () => {
  it('extracts Google verification code', () => {
    const res = extractVerificationCode('G-749201 is your security code');
    expect(res).toBeDefined();
    expect(res?.code).toBe('749201');
  });

  it('extracts standard keyword code', () => {
    const res = extractVerificationCode('Your verification code is 849201');
    expect(res).toBeDefined();
    expect(res?.code).toBe('849201');
  });

  it('extracts passcode', () => {
    const res = extractVerificationCode('Use passcode: 1234 to verify');
    expect(res).toBeDefined();
    expect(res?.code).toBe('1234');
  });
});
