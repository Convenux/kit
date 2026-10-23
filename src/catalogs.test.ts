import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";

import { catalogProblems, sourceFiles } from "./catalogs.ts";

it("finds missing, unused and mismatched phrases", () => {
  const dir = mkdtempSync(join(tmpdir(), "kit-"));
  writeFileSync(join(dir, "page.tsx"), `t("Hello {name}"); msg('Bye'); tn(n, "{count} guest", "{count} guests");`);
  writeFileSync(join(dir, "page.test.ts"), `t("Ignored")`);
  const problems = catalogProblems(sourceFiles(dir), {
    nl: { "Hello {name}": "Hallo {naam}", Old: "Oud", "{count} guests": { one: "{count} gast", other: "{count} gasten" } },
  });
  assert.deepEqual(problems.nl, { missing: ["Bye"], unused: ["Old"], placeholders: ["Hello {name}"] });
});

it("reads a multi-line phrase the same from a CRLF checkout", () => {
  const dir = mkdtempSync(join(tmpdir(), "kit-"));
  writeFileSync(join(dir, "page.tsx"), "t(`Your plan\r\nis empty.`);");
  const problems = catalogProblems(sourceFiles(dir), { nl: { "Your plan\nis empty.": "Je plan\nis leeg." } });
  assert.deepEqual(problems.nl, { missing: [], unused: [], placeholders: [] });
});
