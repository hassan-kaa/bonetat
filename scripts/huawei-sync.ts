// Official Huawei watch photos (consumer.huawei.com/fr), one per model and color, pending review.
//   npm run sync:huawei              dry run: which image each model and color would get
//   npm run sync:huawei -- --apply   import as drafts, validated on /admin/catalog/review
import { importHuaweiWatches, planHuaweiWatches } from "../src/lib/sources/huawei";

process.loadEnvFile();

async function main() {
  const plan = await planHuaweiWatches();
  for (const p of plan) {
    console.log(`${p.model}${p.productId ? "" : "  (not in the catalog)"}: ${p.shots.length ? "" : "no image found"}`);
    for (const s of p.shots) console.log(`  ${s.color.padEnd(16)} ${s.path.split("/").slice(-2).join("/")}`);
  }
  if (process.argv.includes("--apply")) console.log(await importHuaweiWatches(plan, console.log));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
