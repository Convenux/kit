import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Catalog } from "./i18n.ts";

/** Every .ts/.tsx file under `dir`, minus tests, declarations and whatever `skip` names. */
export function sourceFiles(dir: string, skip: (path: string) => boolean = () => false): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (skip(path)) return [];
    if (entry.isDirectory()) return sourceFiles(path, skip);
    return /\.tsx?$/.test(entry.name) && !/\.(test|d)\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const STRING = String.raw`(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|\`((?:[^\`\\$]|\\.)*)\`)`;
const unescape = (s: string) => s.replace(/\\(.)/g, (_, c: string) => (c === "n" ? "\n" : c));

/** The literal phrases of t('…') and msg('…'), and the plural keys of tn(n, '…', '…'). */
export function phrases(code: string[]): { singular: Set<string>; plural: Set<string> } {
  const singular = new Set<string>();
  const plural = new Set<string>();
  for (const text of code) {
    for (const m of text.matchAll(new RegExp(String.raw`\b(?:t|msg)\(\s*${STRING}`, "g"))) {
      singular.add(unescape(m[1] ?? m[2] ?? m[3]!));
    }
    for (const m of text.matchAll(new RegExp(String.raw`\btn\([^,]+,\s*${STRING}\s*,\s*${STRING}`, "g"))) {
      plural.add(unescape(m[4] ?? m[5] ?? m[6]!));
    }
  }
  return { singular, plural };
}

export type CatalogProblems = { missing: string[]; unused: string[]; placeholders: string[] };

/** What each catalog lacks, keeps for nothing, or translates with different {placeholders}. */
export function catalogProblems(files: string[], catalogs: Record<string, Catalog>): Record<string, CatalogProblems> {
  // A template literal's line breaks are LF at runtime whatever the file has: so must its key be.
  const { singular, plural } = phrases(files.map((file) => readFileSync(file, "utf8").replace(/\r\n?/g, "\n")));
  const names = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  return Object.fromEntries(
    Object.entries(catalogs).map(([lang, catalog]) => [
      lang,
      {
        missing: [
          ...[...singular].filter((p) => typeof catalog[p] !== "string"),
          ...[...plural].filter((p) => typeof catalog[p] !== "object"),
        ],
        unused: Object.keys(catalog).filter((p) => !singular.has(p) && !plural.has(p)),
        placeholders: Object.entries(catalog)
          .filter(([english, entry]) => names(typeof entry === "string" ? entry : entry.other) !== names(english))
          .map(([english]) => english),
      },
    ]),
  );
}
