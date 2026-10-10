/* eslint-disable no-console */
// Run every real post in scripts/fixtures/listing-posts.json through the smart listing
// (AI extraction + catalog resolution) and print what a store would see. Costs real money
// (Claude Haiku 5.5, about 0.002 DT per post). Full results: .cache/listing-eval.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { interpretListing } from "../src/lib/listing-ai";
import { resolveListing } from "../src/lib/listing-resolve";
import { prisma } from "../src/lib/prisma";

const INPUT_PER_MTOK = 0.1;
const OUTPUT_PER_MTOK = 0.5;

async function main() {
  process.loadEnvFile();
  const { posts } = JSON.parse(readFileSync("scripts/fixtures/listing-posts.json", "utf8")) as { posts: string[] };
  const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
  const results = [];
  let tokensIn = 0;
  let tokensOut = 0;
  for (const [i, post] of posts.entries()) {
    if (only && String(i + 1) !== only) continue;
    const t = Date.now();
    const ai = await interpretListing({ text: post });
    const r = await resolveListing(ai.extraction);
    tokensIn += ai.inputTokens;
    tokensOut += ai.outputTokens;
    results.push({ post: post.split("\n")[0], extraction: ai.extraction, resolved: r });
    const x = ai.extraction;
    const p = r.prefill;
    console.log(`\n#${i + 1} ${post.split("\n")[0].slice(0, 70)}  (${Date.now() - t} ms)`);
    console.log(`   ${r.brand ?? r.brandUnknown ?? "?"} | ${r.line ?? "?"}${r.lineIsNew ? " (nouvelle gamme)" : ""} | ${r.modelNumber ?? "—"}  →  ${r.product ? `PRODUIT: ${r.product.name}` : r.candidates.length ? `suggestions: ${r.candidates.map((c) => c.label).join(" ; ")}` : "nouveau modèle"}`);
    console.log(`   ${p.storageGb ?? "–"} Go · RAM ${p.ramGb ?? "–"} · ${p.option ?? "–"} · couleur ${p.colorAsWritten ?? "–"} · ${p.priceMillimes ? p.priceMillimes / 1000 + " DT" : "prix –"} · batterie ${p.batteryHealth ?? "–"} · état « ${x.conditionAsWritten ?? "–"} »${x.sealedNew ? " NEUF" : ""}`);
    console.log(`   à compléter : ${r.missing.join(", ")}`);
    if (p.sellerNote) console.log(`   inclus : ${p.sellerNote}`);
    if (r.warnings.length) console.log(`   ⚠ ${r.warnings.join(" | ")}`);
  }
  mkdirSync(".cache", { recursive: true });
  writeFileSync(".cache/listing-eval.json", JSON.stringify(results, null, 1));
  const usd = (tokensIn * INPUT_PER_MTOK + tokensOut * OUTPUT_PER_MTOK) / 1e6;
  console.log(`\n${results.length} annonces · ${tokensIn} tokens entrée, ${tokensOut} sortie · ≈ ${usd.toFixed(4)} $ (${(usd / results.length).toFixed(5)} $ par annonce)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
