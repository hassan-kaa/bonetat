// Official photos picked by eye on brand sites (src/lib/sources/brand-picks.ts), published at once.
//   npm run sync:picks
import { importBrandPicks } from "../src/lib/sources/brand-picks";

process.loadEnvFile();
importBrandPicks(console.log)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
