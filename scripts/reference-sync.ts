/* eslint-disable no-console */
// Load the Icecat reference catalog (every brand of the Brand list) into the database.
//   npm run catalog:reference                    uses the cached index (downloads it if missing, stale, or a brand was added)
//   npm run catalog:reference -- --refresh-index re-download the Icecat index first
import { syncReferenceCatalog } from "../src/lib/reference-catalog";
import { prisma } from "../src/lib/prisma";

async function main() {
  process.loadEnvFile(); // ICECAT_* and DATABASE_URL from .env
  const res = await syncReferenceCatalog({ refreshIndex: process.argv.includes("--refresh-index"), log: console.log });
  console.log(`Catalogue de référence : ${res.rows} modèles lus, ${res.created} nouveaux.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
