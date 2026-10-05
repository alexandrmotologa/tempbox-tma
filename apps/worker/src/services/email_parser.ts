import PostalMime from 'postal-mime';
import type { EmailAttachment } from '@tempbox/shared-types';

export interface ParsedEmailResult {
  from: {
    name?: string;
    address: string;
  };
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
  spf?: 'pass' | 'fail' | 'softfail' | 'none';
  dkim?: 'pass' | 'fail' | 'softfail' | 'none';
  dmarc?: 'pass' | 'fail' | 'softfail' | 'none';
  attachments: EmailAttachment[];
}

/**
 * Parses raw email content (MIME stream, ArrayBuffer, or string) into structured email data.
 */
export async function parseRawEmail(rawInput: ReadableStream | ArrayBuffer | string): Promise<ParsedEmailResult> {
  let buffer: ArrayBuffer;

  if (typeof rawInput === 'string') {
    const encoder = new TextEncoder();
    buffer = encoder.encode(rawInput).buffer as ArrayBuffer;
  } else if (rawInput instanceof ArrayBuffer) {
    buffer = rawInput;
  } else {
    // ReadableStream handling
    const reader = rawInput.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    buffer = combined.buffer as ArrayBuffer;
  }

  const parser = new PostalMime();
  const parsed = await parser.parse(buffer);

  // Flatten headers to string map
  const headersRecord: Record<string, string> = {};
  if (parsed.headers && Array.isArray(parsed.headers)) {
    for (const h of parsed.headers) {
      headersRecord[h.key.toLowerCase()] = String(h.value);
    }
  }

  // Parse SPF / DKIM / DMARC from Authentication-Results header
  const authResults = headersRecord['authentication-results'] || '';
  const spf = extractAuthStatus(authResults, 'spf');
  const dkim = extractAuthStatus(authResults, 'dkim');
  const dmarc = extractAuthStatus(authResults, 'dmarc');

  const attachments: EmailAttachment[] = (parsed.attachments || []).map((att) => ({
    filename: att.filename || 'attachment',
    mimeType: att.mimeType || 'application/octet-stream',
    size: att.content ? (att.content as ArrayBuffer).byteLength || 0 : 0,
    contentId: att.contentId
  }));

  const toList = (parsed.to || []).map((t) => t.address).filter(Boolean) as string[];

  return {
    from: {
      name: parsed.from?.name,
      address: parsed.from?.address || 'unknown@sender.com'
    },
    to: toList,
    subject: parsed.subject || '(No Subject)',
    text: parsed.text,
    html: parsed.html,
    headers: headersRecord,
    spf,
    dkim,
    dmarc,
    attachments
  };
}

function extractAuthStatus(header: string, authType: 'spf' | 'dkim' | 'dmarc'): 'pass' | 'fail' | 'softfail' | 'none' {
  if (!header) return 'none';
  const regex = new RegExp(`${authType}=(\\w+)`, 'i');
  const match = header.match(regex);
  if (!match) return 'none';
  const val = match[1].toLowerCase();
  if (val === 'pass') return 'pass';
  if (val === 'fail') return 'fail';
  if (val === 'softfail') return 'softfail';
  return 'none';
}
