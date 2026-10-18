// Photos of Xiaomi, Samsung, Oppo models and Apple watches from Tunisianet's listings (one per model and color).
//   npm run sync:tunisianet              dry run: what would match, nothing imported
//   npm run sync:tunisianet -- --apply   import (pending review on /admin/catalog/review)
//   npm run sync:tunisianet -- --laptops [--apply]   the same for laptops
// Withdraw them all at once if ever needed: every photo is source RETAILER.
import { importTunisianet, planTunisianet, readListings } from "../src/lib/sources/tunisianet";
import { planTunisianetLaptops, readLaptopListings } from "../src/lib/sources/tunisianet-laptops";

process.loadEnvFile();
const BRANDS = ["Xiaomi", "Samsung", "Oppo", "Apple", "Garmin"];

async function laptops() {
  const listings = await readLaptopListings();
  const { planned, skipped } = await planTunisianetLaptops(listings);
  console.log(`■ ${listings.length} laptop listings, ${planned.length} model × color matches`);
  for (const p of planned) console.log(`  ${p.model.padEnd(36)} ${p.color.padEnd(14)} ← ${p.listing.title.slice(0, 70)}`);
  const why = new Map<string, number>();
  for (const s of skipped) why.set(s.why.split(" (")[0], (why.get(s.why.split(" (")[0]) ?? 0) + 1);
  console.log(`\nskipped: ${[...why].map(([k, n]) => `${n} ${k}`).join(", ")}`);
  for (const s of skipped.filter((x) => x.why.startsWith("modèle"))) console.log(`  ${s.why}`);
  if (process.argv.includes("--apply")) console.log(await importTunisianet(planned, console.log));
  process.exit(0);
}

async function main() {
  if (process.argv.includes("--laptops")) return laptops();
  const listings = await readListings(console.log);
  const { planned, skipped } = await planTunisianet(listings, BRANDS);
  console.log(`\n■ ${listings.length} listings read, ${planned.length} model × color matches`);
  for (const b of BRANDS) {
    const mine = planned.filter((p) => p.listing.title.toLowerCase().includes(b.toLowerCase()) || (b === "Xiaomi" && /redmi|poco/i.test(p.listing.title)));
    console.log(`\n${b}: ${mine.length}`);
    for (const p of mine) console.log(`  ${p.model.padEnd(24)} ${p.color.padEnd(18)} ← ${p.listing.title.slice(0, 80)}`);
  }
  const why = new Map<string, number>();
  for (const s of skipped) why.set(s.why.split(" (")[0], (why.get(s.why.split(" (")[0]) ?? 0) + 1);
  console.log(`\nskipped: ${[...why].map(([k, n]) => `${n} ${k}`).join(", ")}`);
  for (const s of skipped.filter((x) => x.why.startsWith("pack"))) console.log(`  pack: ${s.title.slice(0, 90)}`);
  if (process.argv.includes("--apply")) console.log(await importTunisianet(planned, console.log));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
