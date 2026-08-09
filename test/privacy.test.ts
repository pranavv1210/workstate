import { describe, expect, it } from 'vitest';
import { filterExcludedPaths, isExcludedPath } from '../src/domain/privacy';

describe('privacy exclusions', () => {
  it('excludes common secret-looking paths', () => {
    expect(isExcludedPath('.env')).toBe(true);
    expect(isExcludedPath('apps/api/.env.local')).toBe(true);
    expect(isExcludedPath('credentials.json')).toBe(true);
    expect(isExcludedPath('config/service-account.json')).toBe(true);
    expect(isExcludedPath('keys/private.pem')).toBe(true);
    expect(isExcludedPath('private.key')).toBe(true);
    expect(isExcludedPath('secret.txt')).toBe(true);
    expect(isExcludedPath('token.txt')).toBe(true);
    expect(isExcludedPath('src/payment_service.ts')).toBe(false);
  });

  it('filters excluded files from relevant files', () => {
    expect(filterExcludedPaths(['src/payment.ts', '.env', 'secret-token.txt'])).toEqual(['src/payment.ts']);
  });
});
