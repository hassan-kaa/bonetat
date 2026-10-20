/* eslint-disable no-console */
// Catalog coverage, measured on real shop posts (scripts/fixtures/coverage-posts.json). Two separate questions
// per post, so we know which half to fix:
//   in catalog?  does a product of the expected family exist at all (data)
//   found?       does the smart listing land on it: exact product, or among the suggestions (reading + matching)
// Costs real money (one Claude call per post, about 0.002 DT). Run: npm run coverage:eval [-- --only=12]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { interpretListing } from "../src/lib/listing-ai";
import { resolveListing } from "../src/lib/listing-resolve";
import { displayName } from "../src/lib/catalog";
import { normalize } from "../src/lib/icecat-match";
import { prisma } from "../src/lib/prisma";

type Case = { post: string; family?: string; model?: string; vague?: boolean; out?: boolean; unsure?: boolean; note?: string };

const starts = (name: string, prefix: string) => normalize(name).startsWith(normalize(prefix));

async function main() {
  process.loadEnvFile();
  const { cases } = JSON.parse(readFileSync("scripts/fixtures/coverage-posts.json", "utf8")) as { cases: Case[] };
  const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
  const products = (await prisma.product.findMany({ where: { status: { not: "MERGED" } }, select: { brand: true, model: true } })).map(displayName);

  const tally = { found: 0, suggested: 0, askedModel: 0, wrong: 0, notFound: 0, inCatalog: 0, scored: 0 };
  const rows = [];
  for (const [i, c] of cases.entries()) {
    if (only && String(i + 1) !== only) continue;
    const title = c.post.split("\n")[0].slice(0, 60);
    if (c.out) {
      console.log(`#${String(i + 1).padStart(2)} —   out of scope   ${title}`);
      continue;
    }
    tally.scored++;
    const inCatalog = products.some((p) => starts(p, c.family!));
    if (inCatalog) tally.inCatalog++;

    const ai = await interpretListing({ text: c.post });
    const r = await resolveListing(ai.extraction);
    const ok = (name: string) => (c.model ? normalize(name) === normalize(c.model) : starts(name, c.family!));
    let verdict: string;
    if (r.product && ok(r.product.name)) verdict = "FOUND";
    else if (r.product) verdict = "WRONG";
    else if (r.candidates.some((x) => ok(x.label))) verdict = "SUGGESTED";
    else if (c.vague && r.missing.some((m) => m.startsWith("Modèle exact"))) verdict = "ASKED MODEL";
    else verdict = "NOT FOUND";
    tally[({ FOUND: "found", WRONG: "wrong", SUGGESTED: "suggested", "ASKED MODEL": "askedModel", "NOT FOUND": "notFound" } as const)[verdict as "FOUND"]]++;

    const read = [r.brand ?? r.brandUnknown, r.line, r.modelNumber].filter(Boolean).join(" ") || "?";
    const got = r.product?.name ?? (r.candidates.length ? `suggests ${r.candidates.map((x) => x.label).join(" ; ")}` : "nothing");
    console.log(`#${String(i + 1).padStart(2)} ${inCatalog ? "✓" : "✗"}cat ${verdict.padEnd(11)} want ${(c.model ?? c.family)!.padEnd(30)} read "${read}" → ${got}`);
    rows.push({ i: i + 1, want: c.model ?? c.family, inCatalog, verdict, read, got, cond: ai.extraction.conditionAsWritten, sealed: ai.extraction.sealedNew });
  }
  mkdirSync(".cache", { recursive: true });
  writeFileSync(".cache/coverage-eval.json", JSON.stringify(rows, null, 1));
  const pct = (n: number) => `${Math.round((100 * n) / Math.max(tally.scored, 1))} %`;
  console.log(`\n${tally.scored} posts scored`);
  console.log(`  in catalog:  ${tally.inCatalog} (${pct(tally.inCatalog)})   ← data`);
  console.log(`  found:       ${tally.found} exact + ${tally.suggested} suggested + ${tally.askedModel} vague handled = ${pct(tally.found + tally.suggested + tally.askedModel)}   ← what a shop gets`);
  console.log(`  wrong model: ${tally.wrong}    not found: ${tally.notFound}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
