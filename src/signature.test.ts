import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";

import { sign, verify } from "./signature.ts";

type Vector = { secret: string; timestamp: number; body: string; header: string };
const vectors = JSON.parse(readFileSync(new URL("../fixtures/signature.json", import.meta.url), "utf8")) as Vector[];

it("signs and verifies the shared vectors, as the PHP side does", async () => {
  for (const { secret, timestamp, body, header } of vectors) {
    assert.equal(await sign(body, secret, timestamp), header);
    assert.equal(await verify(header, body, secret, { now: timestamp }), true);
  }
});

it("rejects a changed body, another secret, a stale timestamp and garbage", async () => {
  const [{ secret, timestamp, body, header }] = vectors as [Vector];
  assert.equal(await verify(header, `${body} `, secret, { now: timestamp }), false);
  assert.equal(await verify(header, body, "wrong", { now: timestamp }), false);
  assert.equal(await verify(header, body, secret, { now: timestamp + 60 }), true);
  assert.equal(await verify(header, body, secret, { now: timestamp + 360 }), false);
  for (const bad of [null, "", "garbage", `t=${timestamp}`, `t=${timestamp},v1=zz`]) {
    assert.equal(await verify(bad, body, secret, { now: timestamp }), false);
  }
});
