import { BlockList, isIP } from 'node:net';
import { lookup as dnsLookup } from 'node:dns/promises';

/**
 * Tenant SMTP hosts are tenant-supplied, so the API would otherwise connect
 * wherever a tenant admin points it — loopback, the VCN, the cloud metadata
 * endpoint. Only public addresses are allowed; operators can exempt exact
 * hostnames (the QA stack's Mailpit) through TENANT_SMTP_ALLOWED_HOSTS.
 */
const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv4');
}
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv6');
}

/** True when `ip` is a literal address outside every private/reserved range. */
export function isPublicAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return !blocked.check(ip, 'ipv4');
  if (family !== 6) return false;
  // IPv4-mapped IPv6 (::ffff:10.0.0.1) is judged by its IPv4 part.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return isPublicAddress(mapped[1]);
  return !blocked.check(ip, 'ipv6');
}

export function allowedSmtpHosts(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

export type SmtpHostCheck =
  | { readonly ok: true; readonly connectTo: string }
  | { readonly ok: false; readonly reason: 'UNRESOLVABLE' | 'PRIVATE_ADDRESS' };

type Lookup = (
  host: string,
) => Promise<readonly { readonly address: string }[]>;

const defaultLookup: Lookup = (host) => dnsLookup(host, { all: true });

/**
 * Resolves `host` and returns the address to connect to. Every resolved
 * address must be public, so a name with one private record is refused.
 * Connecting to the checked address (not the name again) stops a second,
 * different DNS answer from slipping past the check.
 */
export async function checkSmtpHost(
  host: string,
  allowed: ReadonlySet<string>,
  lookup: Lookup = defaultLookup,
): Promise<SmtpHostCheck> {
  const name = host.trim().toLowerCase();
  if (allowed.has(name)) return { ok: true, connectTo: host.trim() };
  let addresses: readonly { readonly address: string }[];
  try {
    addresses = isIP(name) ? [{ address: name }] : await lookup(name);
  } catch {
    return { ok: false, reason: 'UNRESOLVABLE' };
  }
  if (!addresses.length) return { ok: false, reason: 'UNRESOLVABLE' };
  if (!addresses.every((a) => isPublicAddress(a.address))) {
    return { ok: false, reason: 'PRIVATE_ADDRESS' };
  }
  return { ok: true, connectTo: addresses[0].address };
}
