import type { ExtractedMagicLink } from '@tempbox/shared-types';

const NEGATIVE_URL_PATTERNS = [
  /unsubscribe/i,
  /optout/i,
  /privacy/i,
  /terms/i,
  /help\./i,
  /support\./i,
  /twitter\.com/i,
  /x\.com/i,
  /linkedin\.com/i,
  /facebook\.com/i,
  /instagram\.com/i,
  /\.(png|jpe?g|gif|svg|ico|css|js)(\?|$)/i
];

const POSITIVE_KEYWORD_PATTERNS = [
  /verify/i,
  /verification/i,
  /confirm/i,
  /confirmation/i,
  /activate/i,
  /activation/i,
  /magic\s*link/i,
  /sign\s*in/i,
  /log\s*in/i,
  /authenticate/i,
  /callback/i,
  /accept\s*invite/i,
  /best[aä]tigen/i,
  /confirmer/i
];

/**
 * Extracts action and magic verification links from email HTML and plain text bodies.
 */
export function extractMagicLink(html?: string, text?: string): ExtractedMagicLink | undefined {
  const candidates: Array<{ url: string; label: string; confidence: number }> = [];

  // 1. Parse HTML anchor tags
  if (html) {
    const anchorRegex = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gis;
    let match: RegExpExecArray | null;

    while ((match = anchorRegex.exec(html)) !== null) {
      const url = match[1].trim();
      const rawLabel = match[2].replace(/<[^>]*>/g, '').trim();

      if (isNegativeUrl(url, rawLabel)) continue;

      let confidence = 0.5;

      // Check anchor text
      if (POSITIVE_KEYWORD_PATTERNS.some((p) => p.test(rawLabel))) {
        confidence += 0.35;
      }

      // Check URL query parameters and path
      if (/token|verify|confirm|auth|callback|magic|activate/i.test(url)) {
        confidence += 0.2;
      }

      if (confidence >= 0.7) {
        candidates.push({
          url,
          label: rawLabel || 'Verification Link',
          confidence: Math.min(0.99, confidence)
        });
      }
    }
  }

  // 2. Parse Plain Text URLs
  if (text) {
    const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`]+)/g;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[1].trim();
      if (isNegativeUrl(url)) continue;

      if (/token=|verify|confirm|activate|magic_link|auth\/callback/i.test(url)) {
        candidates.push({
          url,
          label: 'Verification Link',
          confidence: 0.85
        });
      }
    }
  }

  if (candidates.length === 0) return undefined;

  // Sort by highest confidence
  candidates.sort((a, b) => b.confidence - a.confidence);
  const best = candidates[0];

  let domain = '';
  try {
    domain = new URL(best.url).hostname;
  } catch {
    domain = 'external';
  }

  return {
    url: best.url,
    label: best.label,
    domain,
    confidence: best.confidence
  };
}

function isNegativeUrl(url: string, label?: string): boolean {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return true;
  if (label && /unsubscribe|opt-out|manage preferences/i.test(label)) return true;
  return NEGATIVE_URL_PATTERNS.some((pattern) => pattern.test(url));
}
