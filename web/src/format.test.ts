import { describe, it, expect } from 'vitest';
import { formatRate, formatRelative, formatContainerMem } from './format.ts';

describe('formatRate', () => {
  it('uses MB/s at or above 1 MB/s', () => {
    expect(formatRate(2 * 1024 * 1024)).toBe('2.0 MB/s');
  });
  it('uses KB/s below 1 MB/s', () => {
    expect(formatRate(50 * 1024)).toBe('50 KB/s');
  });
});

describe('formatRelative', () => {
  it('reports seconds for a recent time', () => {
    expect(formatRelative(new Date(Date.now() - 5000).toISOString())).toBe('5s ago');
  });
  it('reports minutes past a minute', () => {
    expect(formatRelative(new Date(Date.now() - 120000).toISOString())).toBe('2m ago');
  });
});

describe('formatContainerMem', () => {
  const GB = 1024 ** 3;
  it('shows used / limit', () => {
    expect(formatContainerMem(GB, 2 * GB)).toBe('1.0G / 2.0G');
  });
  it('shows unlimited when limit is 0', () => {
    expect(formatContainerMem(GB, 0)).toBe('1.0G / unlimited');
  });
});
