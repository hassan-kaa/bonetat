// What makes two products the same product. Pure functions, safe on client and server.
//
// A product is identified by brand + line + model number ("Dell" + "Vostro" + "15 3520"),
// never by its free-text name: "HP EliteBook 8 G1i", "hp elitebook 8 g1i 14 pouces" and
// "HP Elite Book 8 G1i" must all land on the same key.
import { normalize } from "./icecat-match";

export type Identity = { brand: string; line?: string | null; modelNumber?: string | null; model?: string | null };

/** "Elite Book" and "EliteBook" are the same line: spaces inside a line name don't count */
const squash = (s: string) => normalize(s).replace(/ /g, "");

/**
 * The model number without the line's last word in front: "Galaxy S" + "S23" and "Galaxy S" + "23"
 * are the same phone, so are "Reno" + "Reno4 Pro" and "Reno" + "4 Pro". Used for the identity only.
 */
function numberWithoutLine(line: string, modelNumber: string): string {
  const last = normalize(line).split(" ").pop() ?? "";
  const n = normalize(modelNumber);
  if (last && n.startsWith(last) && /^\s?\d/.test(n.slice(last.length))) return n.slice(last.length).trim();
  return n;
}

/**
 * "dell|vostro|15 3520". Products created before lines existed (no line / model number)
 * fall back to brand + model name, minus a repeated brand word.
 */
export function canonicalKey(input: Identity): string {
  // "+" is part of the model ("Note 14 Pro+" ≠ "Note 14 Pro"): spelled out before punctuation is stripped
  const plus = (v?: string | null) => v?.replace(/\+/g, " plus ");
  const id = { ...input, line: plus(input.line), modelNumber: plus(input.modelNumber), model: plus(input.model) };
  const brand = squash(id.brand);
  if (id.line && id.modelNumber) return `${brand}|${squash(id.line)}|${numberWithoutLine(id.line, id.modelNumber)}`;
  const model = normalize(id.model ?? id.modelNumber ?? "")
    .split(" ")
    .filter((w) => w !== brand)
    .join(" ");
  return `${brand}|${model}`;
}

/**
 * Split an Icecat or store model name into line + model number, using the brand's known lines.
 * "Galaxy S23" with line "Galaxy S" → { line: "Galaxy S", modelNumber: "S23" }:
 * the longest known line whose words start the name wins. Unknown line: first word.
 */
export function splitModel(modelName: string, lines: string[]): { line: string; modelNumber: string } | null {
  const words = modelName.trim().split(/\s+/);
  if (words.length < 2) return null;
  const n = normalize(modelName);
  const known = [...lines]
    .sort((a, b) => normalize(b).length - normalize(a).length)
    .find((l) => n === normalize(l) || n.startsWith(normalize(l) + " ") || n.startsWith(normalize(l)));
  if (known) {
    // Remove the line's words (or letters, for "Galaxy S" + "S23") from the front
    const lineWords = normalize(known).split(" ").length;
    let rest = words.slice(lineWords - 1).join(" ");
    const lastLineWord = normalize(known).split(" ").pop()!;
    const first = normalize(rest.split(" ")[0]);
    rest = first === lastLineWord ? rest.split(" ").slice(1).join(" ") : rest;
    if (!rest) return null;
    return { line: known, modelNumber: rest };
  }
  return { line: words[0], modelNumber: words.slice(1).join(" ") };
}

/**
 * The product name from its line and model number, as people write it:
 * "Galaxy S" + "S23" → "Galaxy S23", "Moto G" + "G84" → "Moto G84", "EliteBook" + "8 G1i" → "EliteBook 8 G1i".
 */
export function modelName(line: string, modelNumber: string): string {
  const words = line.trim().split(/\s+/);
  const last = words[words.length - 1];
  const num = modelNumber.trim();
  // "Galaxy S" + "S23" → "Galaxy S23"; "P" + "P30" → "P30"; "Reno" + "Reno4 Pro" → "Reno4 Pro"
  if (num.toLowerCase().startsWith(last.toLowerCase()) && num.length > last.length) {
    return [...words.slice(0, -1), num].join(" ");
  }
  return `${line.trim()} ${num}`;
}

/** Classic edit distance, on short strings only (model numbers) */
export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

export type KnownProduct = { id: string; brand: string; line: string | null; modelNumber: string | null; canonicalKey: string };

/**
 * Products that may be the one the store is about to create: same brand and line, and a model
 * number one typo away ("8 G1i" vs "8 G1a"), or one containing the other ("840" vs "840 G11").
 * An exact key match is returned first: that one blocks creation.
 */
export function nearDuplicates<T extends KnownProduct>(id: Identity, products: T[]): { exact: T | null; close: T[] } {
  const key = canonicalKey(id);
  const exact = products.find((p) => p.canonicalKey === key) ?? null;
  if (!id.line || !id.modelNumber) return { exact, close: [] };
  const brand = squash(id.brand);
  const line = squash(id.line);
  const num = normalize(id.modelNumber).replace(/ /g, "");
  const close = products.filter((p) => {
    if (p === exact || squash(p.brand) !== brand || !p.line || squash(p.line) !== line || !p.modelNumber) return false;
    const other = normalize(p.modelNumber).replace(/ /g, "");
    return editDistance(num, other) <= 1 || (num.length >= 2 && other.length >= 2 && (num.includes(other) || other.includes(num)));
  });
  return { exact, close };
}
