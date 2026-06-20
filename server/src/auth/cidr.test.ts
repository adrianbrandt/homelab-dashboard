import { describe, it, expect } from 'vitest';
import { normalizeIp, ipMatchesAny } from './cidr.ts';

describe('cidr', () => {
  it('strips the IPv4-mapped IPv6 prefix', () => {
    expect(normalizeIp('::ffff:10.20.0.2')).toBe('10.20.0.2');
    expect(normalizeIp('10.20.0.2')).toBe('10.20.0.2');
    expect(normalizeIp(undefined)).toBe('');
  });

  it('matches an exact /32', () => {
    expect(ipMatchesAny('10.20.0.2', ['10.20.0.2/32'])).toBe(true);
    expect(ipMatchesAny('10.20.0.3', ['10.20.0.2/32'])).toBe(false);
  });

  it('matches inside a subnet', () => {
    expect(ipMatchesAny('172.18.5.9', ['172.18.0.0/16'])).toBe(true);
    expect(ipMatchesAny('172.19.5.9', ['172.18.0.0/16'])).toBe(false);
  });

  it('matches an IPv4-mapped peer against a v4 cidr', () => {
    expect(ipMatchesAny('::ffff:10.20.0.2', ['10.20.0.2/32'])).toBe(true);
  });

  it('matches a bare IP entry (no slash) exactly', () => {
    expect(ipMatchesAny('127.0.0.1', ['127.0.0.1'])).toBe(true);
  });

  it('returns false for an empty proxy list semantics (handled by caller)', () => {
    expect(ipMatchesAny('10.0.0.1', [])).toBe(false);
  });
});
