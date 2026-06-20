const GB = 1024 ** 3;

export function gb(bytes: number): number {
  return bytes / GB;
}

export function formatGB(bytes: number): string {
  const v = gb(bytes);
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)}G`;
}

export function formatUsage(used: number, total: number): string {
  return `${formatGB(used)}/${formatGB(total)}`;
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return d > 0 ? `up ${d}d` : `up ${h}h`;
}

export function formatRate(bytesPerSec: number): string {
  const mb = bytesPerSec / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB/s`;
  return `${Math.round(bytesPerSec / 1024)} KB/s`;
}

export function formatRelative(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function formatContainerMem(used: number, limit: number): string {
  return `${formatGB(used)} / ${limit > 0 ? formatGB(limit) : 'unlimited'}`;
}
