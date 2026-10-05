import assert from "node:assert/strict";
import { it } from "node:test";

import { initials, logoLook, logoTile } from "./logo.ts";

it("squares a logo on its plate, unless it is known to be wide", () => {
  assert.deepEqual(logoTile(undefined), { plate: "light", inset: true });
  assert.deepEqual(logoTile({ square: true, bleed: true, plate: "dark" }), { plate: "dark", inset: false });
  assert.deepEqual(logoTile({ square: true, plate: "#12AB34" }), { plate: "#12AB34", inset: true });
  assert.deepEqual(logoTile({ square: true, plate: "url(x)" }), { plate: "light", inset: true });
  assert.equal(logoTile({ square: false, plate: "light" }), null);
  assert.equal(logoLook(null, undefined), null);
  assert.equal(logoLook("https://x/logo.png", { square: true, plate: "dark" }, "var(--ink)")?.style.backgroundColor, "var(--ink)");
});

it("draws two letters for a name", () => {
  assert.equal(initials("Dutch Comic Con"), "DC");
  assert.equal(initials("DoKomi"), "DO");
  assert.equal(initials("!!"), "??");
});
