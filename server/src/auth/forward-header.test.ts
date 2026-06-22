import { describe, it, expect } from 'vitest';
import type express from 'express';
import { ForwardHeaderProvider } from './forward-header.ts';

function fakeReq(headers: Record<string, string | string[]>, remoteAddress = '10.20.0.2'): express.Request {
  return { headers, socket: { remoteAddress } } as unknown as express.Request;
}

describe('ForwardHeaderProvider', () => {
  it('reads the configured header (case-insensitive) and trims', () => {
    const p = new ForwardHeaderProvider('Cf-Access-Authenticated-User-Email', []);
    const id = p.resolve(fakeReq({ 'cf-access-authenticated-user-email': '  a@b.com  ' }));
    expect(id).toEqual({ user: 'a@b.com' });
  });

  it('returns null when the header is missing', () => {
    const p = new ForwardHeaderProvider('X-User', []);
    expect(p.resolve(fakeReq({}))).toBeNull();
  });

  it('returns null when the header is empty after trim', () => {
    const p = new ForwardHeaderProvider('X-User', []);
    expect(p.resolve(fakeReq({ 'x-user': '   ' }))).toBeNull();
  });

  it('rejects a multi-valued (comma) header as forged', () => {
    const p = new ForwardHeaderProvider('X-User', []);
    expect(p.resolve(fakeReq({ 'x-user': 'real@b.com, evil@x.com' }))).toBeNull();
  });

  it('rejects a duplicate header delivered as an array', () => {
    const p = new ForwardHeaderProvider('X-User', []);
    expect(p.resolve(fakeReq({ 'x-user': ['real@b.com', 'evil@x.com'] }))).toBeNull();
  });

  it('ignores the header when the peer is not a trusted proxy', () => {
    const p = new ForwardHeaderProvider('X-User', ['10.20.0.2/32']);
    expect(p.resolve(fakeReq({ 'x-user': 'a@b.com' }, '10.99.0.1'))).toBeNull();
  });

  it('accepts the header when the peer is a trusted proxy', () => {
    const p = new ForwardHeaderProvider('X-User', ['10.20.0.2/32']);
    expect(p.resolve(fakeReq({ 'x-user': 'a@b.com' }, '10.20.0.2'))).toEqual({ user: 'a@b.com' });
  });
});
