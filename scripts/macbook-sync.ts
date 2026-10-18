// Official MacBook photos from Apple, one per color, into the catalog (stored on R2, published).
// Safe to run again: colors that already have an Apple photo are skipped.
//   npm run sync:macbook                      every MacBook
//   npm run sync:macbook -- "MacBook Pro 14 M4 Pro"   one model
import { syncAppleMacbooks } from "../src/lib/sources/apple";

process.loadEnvFile();

async function main() {
  const only = process.argv.slice(2).find((a) => !a.startsWith("-"));
  const report = await syncAppleMacbooks({ only, log: console.log });
  const count = (r: string) => report.filter((x) => x.result === r).length;
  console.log(`\n✓ ${count("imported")} photos added, ${count("already")} already there, ${count("not found")} colors without an official image, ${count("duplicate")} duplicates skipped${count("model missing") ? `, ${count("model missing")} models not in the catalog` : ""}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
