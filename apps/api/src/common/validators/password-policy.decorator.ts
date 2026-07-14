import { applyDecorators } from '@nestjs/common';
import { Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Platform password policy (PasswordPolicy.md §5 / Authentication.md §5):
 * 12–128 chars with at least one uppercase, lowercase, digit and special
 * character. Tenants may tighten this but never reduce it.
 */
export function IsStrongPassword(): PropertyDecorator {
  return applyDecorators(
    MinLength(12, { message: 'Password must be at least 12 characters long' }),
    MaxLength(128, { message: 'Password must be at most 128 characters long' }),
    Matches(/[A-Z]/, {
      message: 'Password must contain an uppercase letter',
    }),
    Matches(/[a-z]/, {
      message: 'Password must contain a lowercase letter',
    }),
    Matches(/[0-9]/, { message: 'Password must contain a number' }),
    Matches(/[^A-Za-z0-9]/, {
      message: 'Password must contain a special character',
    }),
  );
}
