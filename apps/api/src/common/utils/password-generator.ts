import { randomInt } from 'crypto';

// Character sets exclude visually ambiguous glyphs (0/O, 1/l/I) so a
// temporary password read from an email is less error-prone to type.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%&*?';
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

const pick = (set: string): string => set[randomInt(set.length)];

/**
 * Generates a cryptographically-random password that always satisfies the
 * platform policy (IsStrongPassword: 12+ chars, upper/lower/digit/special).
 * Uses crypto.randomInt — never Math.random — because this is a secret.
 *
 * @param length total length, minimum 12 (clamped up if a smaller value passed)
 */
export function generateStrongPassword(length = 16): string {
  const size = Math.max(12, length);
  // Guarantee one of each required class, then fill the rest from the full set.
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < size) {
    chars.push(pick(ALL));
  }
  // Fisher–Yates shuffle so the guaranteed characters are not always leading.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
