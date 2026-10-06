import { execFileSync } from "node:child_process";
import { globSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

rmSync("dist", { recursive: true, force: true });
execFileSync(process.execPath, [fileURLToPath(import.meta.resolve("typescript/bin/tsc")), "-p", "tsconfig.build.json"], { stdio: "inherit" });

// tsc keeps `.ts` in a declaration's relative imports; consumers get the `.js` files.
for (const file of globSync("dist/**/*.d.ts")) {
  writeFileSync(file, readFileSync(file, "utf8").replace(/(?<=from "\.{1,2}\/[^"]+)\.tsx?(?=")/g, ".js"));
}
