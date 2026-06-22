function ipToLong(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    n = (n << 8) | octet;
  }
  return n >>> 0;
}

export function normalizeIp(ip: string | undefined): string {
  if (!ip) return '';
  return ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
}

export function ipMatchesCidr(ip: string, cidr: string): boolean {
  const norm = normalizeIp(ip);
  if (cidr === norm) return true; // bare IP or exact IPv6 string
  const slash = cidr.indexOf('/');
  if (slash === -1) return false;
  const range = cidr.slice(0, slash);
  const bits = Number(cidr.slice(slash + 1));
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipLong = ipToLong(norm);
  const rangeLong = ipToLong(range);
  if (ipLong === null || rangeLong === null) return false;
  if (bits === 0) return true;
  const mask = (~0 << (32 - bits)) >>> 0;
  return (ipLong & mask) === (rangeLong & mask);
}

export function ipMatchesAny(ip: string | undefined, cidrs: string[]): boolean {
  const norm = normalizeIp(ip);
  return cidrs.some((cidr) => ipMatchesCidr(norm, cidr));
}
