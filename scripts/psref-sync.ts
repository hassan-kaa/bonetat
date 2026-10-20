/* eslint-disable no-console */
// Lenovo's model history from PSREF: checks every candidate name against its official spec sheet and keeps the
// ones that exist (src/lib/sources/lenovo-psref.ts). Writes .cache/lenovo-psref.json, read by `npm run catalog:build`.
// A few thousand light HEAD requests, 6 at a time; already-checked names are skipped on a rerun.
//   npm run sync:psref
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { psrefCandidates, psrefModel, specUrl } from "../src/lib/sources/lenovo-psref";

const CACHE = ".cache/psref-checked.json";
const OUT = ".cache/lenovo-psref.json";
const UA = "Mozilla/5.0 (compatible; BonetatCatalog/1.0; +catalog)";

async function exists(url: string): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
      return res.ok;
    } catch {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  return false;
}

async function main() {
  mkdirSync(".cache", { recursive: true });
  const checked: Record<string, boolean> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const todo = psrefCandidates().filter((c) => !(c.name in checked));
  console.log(`${todo.length} names to check (${Object.keys(checked).length} already checked)`);
  let done = 0;
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let c = queue.shift(); c; c = queue.shift()) {
        checked[c.name] = await exists(specUrl(c));
        if (++done % 250 === 0) {
          console.log(`  ${done}/${todo.length}`);
          writeFileSync(CACHE, JSON.stringify(checked));
        }
      }
    })
  );
  writeFileSync(CACHE, JSON.stringify(checked));
  const models = new Map<string, NonNullable<ReturnType<typeof psrefModel>>>();
  for (const [name, ok] of Object.entries(checked)) {
    const m = ok ? psrefModel(name) : null;
    if (m) models.set(`${m.line}|${m.modelNumber}`.toLowerCase(), m);
  }
  writeFileSync(OUT, JSON.stringify([...models.values()], null, 1));
  console.log(`✓ ${Object.values(checked).filter(Boolean).length} spec sheets found → ${models.size} catalog models in ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
