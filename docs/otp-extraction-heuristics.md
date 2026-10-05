# Verification Code & OTP Extraction Heuristics

Temporary email addresses are frequently used to sign up on services requiring a one-time verification code (OTP). This document outlines the heuristic matching strategy used in TempBox.

## Matching Rules

The extractor evaluates email subjects, plain text bodies, and rendered HTML using weighted confidence scoring:

### 1. Provider-Specific Patterns (Confidence: 0.98 - 0.99)
- **Google Accounts:** Matches `G-\d{6}` (e.g., `G-492019`).
- **GitHub Auth:** Matches `(?:github\s+authentication\s+code\s+is\s+|verification\s+code\s+is\s+)\d{6}`.

### 2. Keyword-Anchored Codes (Confidence: 0.95)
Matches patterns where standard auth keywords directly precede a 4 to 8 character alphanumeric or numeric token:
- Pattern: `(?:code|passcode|otp|pin|token|password)[\s:=–—]+(?:is\s+)?([A-Z0-9]{4,8}|\d{3}[-\s]\d{3})\b`
- Examples:
  - `Your verification code is: 849201`
  - `Security code: 591-204`
  - `Confirmation passcode: 4920`

### 3. Inverted Phrasing (Confidence: 0.96)
Matches statements where the numerical token precedes the intent:
- Pattern: `\b(\d{4,8})\s+is\s+your\s+(?:[\w-]+\s+)?(?:verification|security|login|confirmation|authentication|activation)\s+code`
- Example: `741852 is your verification code.`

### 4. Proximity Matching (Confidence: 0.70 - 0.88)
When multi-language keywords (`código de verificación`, `code de vérification`, `bestätigungscode`) appear anywhere in the email body, the extractor scans for 6-digit integers within a 50-character window.

## Negative Filters & Disambiguation

To prevent false positives, candidates are filtered through the following rules:
- **Calendar Years:** 4-digit numbers between 1970 and 2040 without explicit code phrasing are ignored.
- **Repeated Digits:** Trivial patterns like `0000` or `111111` are rejected.
- **Hex Colors & CSS:** Values preceded by `#` or followed by `px`, `rem`, or `em` are excluded.
- **Timestamps:** Strings matching ISO dates or time offsets (`2024-10-06`, `12:00:00`) are excluded.
