import { describe, it, expect } from 'vitest';
import { extractMagicLink } from '../src/services/magic_link_extractor.js';

describe('Magic Link & Verification Link Extractor', () => {
  it('extracts HTML button activation link', () => {
    const html = `
      <div style="font-family: sans-serif;">
        <h2>Verify your email</h2>
        <a href="https://auth.notion.so/confirm_email?token=sec_99182a8b91">Confirm email address</a>
        <p><a href="https://notion.so/privacy">Privacy Policy</a></p>
      </div>
    `;
    const result = extractMagicLink(html);
    expect(result).toBeDefined();
    expect(result?.url).toBe('https://auth.notion.so/confirm_email?token=sec_99182a8b91');
    expect(result?.label).toBe('Confirm email address');
    expect(result?.domain).toBe('auth.notion.so');
  });

  it('extracts plain text magic link', () => {
    const text = 'Click this link to log in: https://app.supabase.com/auth/v1/verify?token=pk_123456&type=magiclink';
    const result = extractMagicLink(undefined, text);
    expect(result).toBeDefined();
    expect(result?.url).toBe('https://app.supabase.com/auth/v1/verify?token=pk_123456&type=magiclink');
    expect(result?.domain).toBe('app.supabase.com');
  });

  it('ignores social links and unsubscribe links', () => {
    const html = `
      <div>
        <p>Thanks for joining our newsletter.</p>
        <a href="https://twitter.com/example">Follow on Twitter</a>
        <a href="https://example.com/unsubscribe?user=91">Unsubscribe from this list</a>
      </div>
    `;
    const result = extractMagicLink(html);
    expect(result).toBeUndefined();
  });
});
