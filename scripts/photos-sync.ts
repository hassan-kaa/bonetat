/* eslint-disable no-console */
// Photos for the whole catalog, no admin step: official photo for every color on sale, a cover for every model.
//   npm run images:sync
import { syncAllPhotos } from "../src/lib/auto-photos";
import { prisma } from "../src/lib/prisma";

async function main() {
  process.loadEnvFile();
  await syncAllPhotos(console.log);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
