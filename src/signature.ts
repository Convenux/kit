/**
 * `Convenux-Signature: t=<unix>,v1=<hex>`: HMAC-SHA256 over "<t>.<body>". The timestamp is
 * inside the signed string, so the tolerance window is the replay guard. Web Crypto, so the
 * same code runs in Node and in a Cloudflare Worker.
 */
export const TOLERANCE_SECONDS = 300;

const encoder = new TextEncoder();

function key(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function sign(body: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): Promise<string> {
  const mac = await crypto.subtle.sign("HMAC", await key(secret, "sign"), encoder.encode(`${timestamp}.${body}`));
  return `t=${timestamp},v1=${[...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function verify(
  header: string | null | undefined,
  body: string,
  secret: string,
  { tolerance = TOLERANCE_SECONDS, now = Date.now() / 1000 }: { tolerance?: number; now?: number } = {},
): Promise<boolean> {
  const parts = new Map(
    (header ?? "").split(",").map((pair) => {
      const [name = "", ...value] = pair.trim().split("=");
      return [name, value.join("=")] as const;
    }),
  );
  const timestamp = Number(parts.get("t"));
  const given = parts.get("v1") ?? "";
  if (!Number.isInteger(timestamp) || timestamp <= 0 || !/^[0-9a-f]{64}$/i.test(given)) return false;
  if (Math.abs(now - timestamp) > tolerance) return false;
  // subtle.verify compares in constant time.
  const mac = Uint8Array.from(given.match(/../g)!, (pair) => parseInt(pair, 16));
  return crypto.subtle.verify("HMAC", await key(secret, "verify"), mac, encoder.encode(`${timestamp}.${body}`));
}
