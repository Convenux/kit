import assert from "node:assert/strict";
import { createServer } from "node:http";
import { describe, it } from "node:test";

import { inlineLogo, isPublic, oklch, sniff } from "./og.ts";

describe("oklch", () => {
  it("lands on sRGB's own primaries", () => {
    assert.equal(oklch(0.6279554, 0.2576833, 29.2338851), "rgb(255, 0, 0)");
    assert.equal(oklch(1, 0, 0), "rgb(255, 255, 255)");
  });
});

describe("inlineLogo", () => {
  it("never fetches a private address", async () => {
    let asked = 0;
    const server = createServer((_, response) => {
      asked++;
      response.writeHead(200, { "Content-Type": "image/png" }).end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };

    assert.equal(await inlineLogo(`http://127.0.0.1:${port}/logo.png`), null);
    assert.equal(await inlineLogo(`http://localhost:${port}/logo.png`), null);
    assert.equal(asked, 0);
    server.close();
  });

  it("refuses anything but http(s)", async () => {
    assert.equal(await inlineLogo("file:///etc/passwd"), null);
    assert.equal(await inlineLogo("not a url"), null);
  });
});

describe("isPublic", () => {
  it("knows the addresses a server must not be pointed at", async () => {
    for (const address of ["127.0.0.1", "10.0.0.8", "172.20.1.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "[::1]", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      assert.equal(await isPublic(address), false, address);
    }
    for (const address of ["93.184.215.14", "1.1.1.1", "2606:4700:4700::1111"]) {
      assert.equal(await isPublic(address), true, address);
    }
  });
});

describe("sniff", () => {
  it("reads PNG and JPEG from their first bytes, and nothing else", () => {
    assert.equal(sniff(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), "image/png");
    assert.equal(sniff(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
    assert.equal(sniff(new TextEncoder().encode("<svg xmlns=")), null);
    assert.equal(sniff(new TextEncoder().encode("RIFF....WEBP")), null);
  });
});
