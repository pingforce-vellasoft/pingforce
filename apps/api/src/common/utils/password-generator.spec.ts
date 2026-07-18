import { generateStrongPassword } from './password-generator';

describe('generateStrongPassword', () => {
  const POLICY = {
    upper: /[A-Z]/,
    lower: /[a-z]/,
    digit: /[0-9]/,
    special: /[^A-Za-z0-9]/,
  };

  it('always satisfies the platform password policy', () => {
    // Probabilistic guarantees — run many times to catch a bad shuffle/fill.
    for (let i = 0; i < 500; i++) {
      const pwd = generateStrongPassword();
      expect(pwd.length).toBeGreaterThanOrEqual(12);
      expect(pwd).toMatch(POLICY.upper);
      expect(pwd).toMatch(POLICY.lower);
      expect(pwd).toMatch(POLICY.digit);
      expect(pwd).toMatch(POLICY.special);
    }
  });

  it('clamps a too-short requested length up to the 12-char minimum', () => {
    expect(generateStrongPassword(4).length).toBe(12);
  });

  it('honours a longer requested length', () => {
    expect(generateStrongPassword(32).length).toBe(32);
  });

  it('produces distinct values across calls (CSPRNG, not constant)', () => {
    const set = new Set(
      Array.from({ length: 100 }, () => generateStrongPassword()),
    );
    expect(set.size).toBe(100);
  });
});
