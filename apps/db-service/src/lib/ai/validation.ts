import dns from 'node:dns/promises';
import net from 'node:net';
import { AiPublicError } from './errors';

const PRIVATE_HOSTS = new Set(['0.0.0.0', 'localhost']);

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [first, second] = parts;

  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    first === 0
  );
}

function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) {
    return isPrivateIpv4(address);
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();

    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd');
  }

  return false;
}

export async function assertSafeBaseUrl(value: string): Promise<string> {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new AiPublicError('INVALID_BASE_URL', 422);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AiPublicError('INVALID_BASE_URL', 422);
  }

  const hostname = url.hostname.toLowerCase();

  if (PRIVATE_HOSTS.has(hostname) || hostname.endsWith('.localhost') || !hostname.includes('.')) {
    throw new AiPublicError('INVALID_BASE_URL', 422);
  }

  if (isPrivateIp(hostname)) {
    throw new AiPublicError('INVALID_BASE_URL', 422);
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });

    if (addresses.some((item) => isPrivateIp(item.address))) {
      throw new AiPublicError('INVALID_BASE_URL', 422);
    }
  } catch (error) {
    if (error instanceof AiPublicError) {
      throw error;
    }

    throw new AiPublicError('INVALID_BASE_URL', 422, 'Base URL 无法解析');
  }

  return url.toString().replace(/\/+$/u, '');
}
