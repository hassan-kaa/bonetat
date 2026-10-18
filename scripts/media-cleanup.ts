// The photo lifecycle job: withdraws abandoned corrections, releases photos of withdrawn offers and of
// sold units whose warranty is over, then deletes every queued file whose grace period has passed.
// Safe to run any time (daily in production).
//   npm run media:cleanup
import { runDeletions } from "../src/lib/catalog-photos";
import { sweepOfferPhotos } from "../src/lib/offer-photos";

process.loadEnvFile();

async function main() {
  await sweepOfferPhotos(console.log);
  const { deleted, kept } = await runDeletions(console.log);
  console.log(`✓ ${deleted} file(s) deleted${kept ? `, ${kept} kept (still in use)` : ""}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
