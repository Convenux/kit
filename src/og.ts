import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

/** The cover's two stops as `@utility cover` draws them, for a hue. */
export function coverStops(hue: number): [string, string] {
  return [oklch(0.42, 0.14, hue), oklch(0.22, 0.08, hue + 40)];
}

/** An oklch colour as rgb(), clipped to sRGB. Satori cannot read oklch(). */
export function oklch(l: number, c: number, h: number): string {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
  const channels = linear.map((value) => {
    const v = Math.min(1, Math.max(0, value));
    return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
  });
  return `rgb(${channels.join(", ")})`;
}

const TIMEOUT_MS = 3000;
/** Next's fetch cache keeps no body over 2 MB. */
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

/**
 * An organiser's logo as a data URI for Satori, or null to draw initials: 3 s all told,
 * 2 MB, PNG or JPEG by header and bytes. Anyone can propose a logo URL and this runs on
 * our server, so only public addresses are fetched, checked again at every redirect.
 */
export function inlineLogo(url: string | null | undefined): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  return Promise.race([
    fetchLogo(url, signal).catch(() => null),
    // The DNS lookup does not take a signal, so the deadline is raced rather than passed.
    new Promise<null>((resolve) => signal.addEventListener("abort", () => resolve(null))),
  ]);
}

async function fetchLogo(url: string, signal: AbortSignal): Promise<string | null> {
  let target = new URL(url);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!/^https?:$/.test(target.protocol) || !(await isPublic(target.hostname))) return null;

    const response = await fetch(target, {
      redirect: "manual",
      signal,
      headers: { Accept: "image/png,image/jpeg;q=0.9" },
      // Next's data cache: regenerating a card does not fetch the logo again.
      next: { revalidate: 86_400 },
    } as RequestInit);
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel();
      target = new URL(location, target);
      continue;
    }

    const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (
      !response.ok ||
      (type !== "image/png" && type !== "image/jpeg") ||
      Number(response.headers.get("content-length") ?? 0) > MAX_BYTES
    ) {
      await response.body?.cancel();
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_BYTES || sniff(bytes) !== type) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  }
  return null;
}

/** What the first bytes say a file is, for the two formats a card will draw. */
export function sniff(bytes: Uint8Array): "image/png" | "image/jpeg" | null {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, i) => bytes[i] === byte)) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

/** Loopback, private, link-local (cloud metadata lives there), CGNAT, multicast, reserved. */
const PRIVATE = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const) {
  PRIVATE.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  PRIVATE.addSubnet(network, prefix, "ipv6");
}

/**
 * Whether every address a host name resolves to is a public one. An IPv4-mapped IPv6
 * address is checked against the IPv4 rules (BlockList does that itself).
 *
 * ponytail: the fetch resolves the name again, so a host that answers differently the
 * second time (DNS rebinding) gets through; pin the address with a custom dispatcher
 * if logos ever come from somewhere less moderated than the suggestion queue.
 */
export async function isPublic(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[(.*)\]$/, "$1");
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true });
  return (
    addresses.length > 0 &&
    addresses.every(
      ({ address, family }) => !PRIVATE.check(address, family === 6 ? "ipv6" : "ipv4"),
    )
  );
}
