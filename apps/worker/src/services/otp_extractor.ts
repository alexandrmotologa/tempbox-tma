import type { ExtractedOtp, OtpKind } from '@tempbox/shared-types';

interface Candidate {
  code: string;
  kind: OtpKind;
  confidence: number;
  label?: string;
  snippet?: string;
}

const KEYWORD_PATTERNS = [
  /verification\s+code/i,
  /security\s+code/i,
  /confirmation\s+code/i,
  /authentication\s+code/i,
  /one-time\s+(?:password|code|passcode)/i,
  /\botp\b/i,
  /\bpasscode\b/i,
  /\bpin\b/i,
  /login\s+code/i,
  /access\s+code/i,
  /código\s+de\s+verificación/i,
  /code\s+de\s+vérification/i,
  /bestätigungscode/i
];

/**
 * Extracts verification codes and OTPs from email text, HTML, and subject lines.
 */
export function extractOtp(text?: string, subject?: string): ExtractedOtp | undefined {
  const combined = [subject || '', text || ''].filter(Boolean).join('\n\n');
  if (!combined.trim()) return undefined;

  const candidates: Candidate[] = [];

  // 1. Provider-specific high-confidence patterns
  // Google: G-123456
  const googleMatch = combined.match(/\bG-(\d{6})\b/i);
  if (googleMatch) {
    return {
      code: googleMatch[1],
      kind: 'numeric',
      confidence: 0.98,
      label: 'Google Verification Code',
      contextSnippet: extractSnippet(combined, googleMatch.index ?? 0, googleMatch[0].length)
    };
  }

  // GitHub: authentication code is 123456
  const githubMatch = combined.match(/(?:github\s+authentication\s+code\s+is\s+|verification\s+code\s+is\s+)(\d{6})/i);
  if (githubMatch) {
    return {
      code: githubMatch[1],
      kind: 'numeric',
      confidence: 0.99,
      label: 'Authentication Code',
      contextSnippet: extractSnippet(combined, githubMatch.index ?? 0, githubMatch[0].length)
    };
  }

  // 2. Keyword-anchored patterns: "code: 123456", "code is 123456", "passcode: 1234"
  const anchoredRegex = /(?:code|passcode|otp|pin|token|password)[\s:=–—]+(?:is\s+)?([A-Z0-9]{4,8}|\d{3}[-\s]\d{3})\b/gi;
  let anchorMatch: RegExpExecArray | null;
  while ((anchorMatch = anchoredRegex.exec(combined)) !== null) {
    const rawCode = anchorMatch[1].replace(/[-\s]/g, '');
    if (isValidCode(rawCode)) {
      candidates.push({
        code: rawCode,
        kind: /^\d+$/.test(rawCode) ? 'numeric' : 'alphanumeric',
        confidence: 0.95,
        label: 'Verification Code',
        snippet: extractSnippet(combined, anchorMatch.index, anchorMatch[0].length)
      });
    }
  }

  // 3. Reversed anchored pattern: "123456 is your ... code"
  const reversedRegex = /\b(\d{4,8})\s+is\s+your\s+(?:[\w-]+\s+)?(?:verification|security|login|confirmation|authentication|activation)\s+code/gi;
  let revMatch: RegExpExecArray | null;
  while ((revMatch = reversedRegex.exec(combined)) !== null) {
    const rawCode = revMatch[1];
    if (isValidCode(rawCode)) {
      candidates.push({
        code: rawCode,
        kind: 'numeric',
        confidence: 0.96,
        label: 'Verification Code',
        snippet: extractSnippet(combined, revMatch.index, revMatch[0].length)
      });
    }
  }

  // 4. Standalone 6-digit or split 3-3 numbers if keyword exists nearby
  const hasKeyword = KEYWORD_PATTERNS.some((pattern) => pattern.test(combined));
  if (hasKeyword) {
    // Check 6-digit numbers
    const numRegex = /\b(\d{3}[-\s]?\d{3}|\d{4,8})\b/g;
    let numMatch: RegExpExecArray | null;
    while ((numMatch = numRegex.exec(combined)) !== null) {
      const rawCode = numMatch[1].replace(/[-\s]/g, '');
      const idx = numMatch.index;

      if (!isValidCode(rawCode)) continue;

      // Calculate proximity score to nearest keyword
      let proximityScore = 0.7;
      const snippet = extractSnippet(combined, idx, numMatch[0].length);

      if (KEYWORD_PATTERNS.some((p) => p.test(snippet))) {
        proximityScore = 0.88;
      }

      candidates.push({
        code: rawCode,
        kind: 'numeric',
        confidence: proximityScore,
        label: 'Verification Code',
        snippet
      });
    }
  }

  if (candidates.length === 0) return undefined;

  // Sort by highest confidence and prefer 6 digits (the most common standard OTP length)
  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const aIs6 = a.code.length === 6 ? 1 : 0;
    const bIs6 = b.code.length === 6 ? 1 : 0;
    return bIs6 - aIs6;
  });

  const best = candidates[0];
  return {
    code: best.code,
    kind: best.kind,
    confidence: best.confidence,
    label: best.label,
    contextSnippet: best.snippet
  };
}

function isValidCode(code: string): boolean {
  if (!code || code.length < 4 || code.length > 8) return false;

  // Filter out probable calendar years
  const num = Number(code);
  if (!isNaN(num) && num >= 1970 && num <= 2040 && code.length === 4) {
    return false;
  }

  // Filter out repeated single digits (e.g. 0000, 111111)
  if (/^(\d)\1+$/.test(code)) return false;

  return true;
}

function extractSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 35);
  const end = Math.min(text.length, index + length + 35);
  let snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}
