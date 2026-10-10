/* eslint-disable no-console */
// Fill the catalog in advance: curated list + Icecat reference + Wikidata. Only adds missing models.
//   npm run catalog:build
// Needs the reference catalog loaded first (npm run catalog:reference).
import { buildCatalog } from "../src/lib/catalog-build";
import { prisma } from "../src/lib/prisma";

async function main() {
  process.loadEnvFile();
  const res = await buildCatalog(console.log);
  console.log(`Ajoutés : ${Object.entries(res.added).map(([s, n]) => `${n} (${s})`).join(", ") || "aucun"}. Catalogue : ${res.total} modèles.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
