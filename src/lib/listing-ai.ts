import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { BRAND_LINES } from "./brands";

// Smart listing, step 1: read a store's post (text and/or screenshots) into fixed fields.
// The model only READS. Deciding which catalog product it is happens in our code
// (listing-resolve.ts), where it can be tested. Nothing here publishes anything.

/** Cheap and fast; Kaa chose it for this route (spec 1quinquies). Runner-up: claude-sonnet-5-5. */
export const LISTING_MODEL = "claude-haiku-5-5";

export const ListingExtraction = z.object({
  kind: z.enum(["PHONE", "TABLET", "LAPTOP", "WATCH", "CONSOLE", "OTHER"]).nullable().describe("Device type"),
  brand: z.string().nullable().describe("Manufacturer, spelled as in the brand list when it is one of them"),
  line: z.string().nullable().describe("Range inside the brand, spelled as in the brand list when it is one of them (EliteBook, iPhone, Galaxy S, MacBook Pro)"),
  modelNumber: z
    .string()
    .nullable()
    .describe("What identifies the model inside the line (\"8 G1i\", \"16 Pro Max\", \"T14s Gen 2\", \"7530\"). Null when the post only gives a range and a CPU generation"),
  modelAsWritten: z.string().nullable().describe("The model name exactly as the post writes it"),
  storageGb: z.number().int().nullable().describe("Storage in GB (1 To = 1000)"),
  ramGb: z.number().int().nullable().describe("RAM in GB"),
  cpu: z.string().nullable().describe("Processor, shortest exact form (\"Core i7-1165G7\", \"Ryzen 9 AI 365\", \"Apple M3 Pro\", \"Core i5 11e gén.\")"),
  gpu: z.string().nullable().describe("Dedicated graphics card only (\"RTX 5070 8 Go\", \"Quadro P2000 4 Go\"); null for integrated graphics"),
  screen: z.string().nullable().describe("Size, resolution and refresh rate when given (\"17,3 pouces, 2560×1600, 240 Hz\")"),
  color: z.string().nullable().describe("Color as written; null if not stated"),
  priceDt: z.number().nullable().describe("Selling price in Tunisian dinars"),
  batteryHealth: z.number().int().nullable().describe("Battery health in %"),
  batteryCycles: z.number().int().nullable().describe("Battery charge cycles"),
  conditionAsWritten: z.string().nullable().describe("Condition words exactly as written (\"Comme neuf\", \"Neuf emballé\", \"Excellent état\")"),
  sealedNew: z.boolean().describe("True only if the post says the device is new / sealed / never used"),
  included: z.array(z.string()).describe("Accessories or extras included (\"Chargeur original\", \"Boîte\")"),
  otherSpecs: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe("Other model specs in French: ports, keyboard, fingerprint reader, OS, cache, frequency"),
  warnings: z.array(z.string()).describe("Short French notes about anything ambiguous or contradictory in the post"),
});

export type ListingExtraction = z.infer<typeof ListingExtraction>;

const BRAND_LIST = Object.entries(BRAND_LINES)
  .map(([brand, lines]) => `${brand}: ${lines.join(", ")}`)
  .join("\n");

const SYSTEM = `You read social media posts written by Tunisian phone and laptop shops (French, English, Tunisian Arabic, emojis) and extract the device being sold into fixed fields.

Rules:
- Extract only what the post or screenshot actually says. Never guess a value: a missing storage, color, battery or model number stays null. Stores answer the missing fields themselves afterwards, so an empty field is always better than a plausible one.
- Never output phone numbers, links, page names, shop names or social handles in any field.
- Use the brand and line spellings from this list when the device belongs to one of them:
${BRAND_LIST}
- modelNumber is the part that identifies the exact model inside its line. Examples: "HP EliteBook 8 G1i" → line EliteBook, modelNumber "8 G1i". "HP OMEN 17" → line OMEN, modelNumber "17". "MSI Raider 18 HX" → line Raider, modelNumber "18 HX". "iPhone 13Pro Max" → line iPhone, modelNumber "13 Pro Max". "Lenovo ThinkPad P14S" → line ThinkPad, modelNumber "P14s". "MacBook Pro 14 2023 M3 Pro" → line MacBook Pro, modelNumber "14 M3 Pro" (size and chip; the year is not part of it). "MacBook Air M2 2022" → modelNumber "M2". When the post names only a range and a CPU generation ("HP EliteBook i5 11e", "Dell Vostro i5 12th"), modelNumber is null and add a warning that the exact model is missing.
- RAM written as "18 G" or "18G" next to an Apple chip means 18 GB of RAM. "1To" means storageGb 1000.
- priceDt is the device's selling price in dinars (DT, dt, TND).
- conditionAsWritten copies only the words about the device's physical condition ("Comme neuf", "Excellent état", "Neuf emballé", "quelques rayures"); do not translate them into a grade. Origin words ("Officiel", "Importé") are not condition: put them in otherSpecs with the label "Provenance". Battery comments are not condition either.
- warnings: at most 2 short French sentences, only for something the store must fix before publishing (exact model missing, two different prices, contradictory specs). Never comment on spelling or naming.
- Write labels and spec values in French.`;

export type ListingImage = { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

export type InterpretResult = { extraction: ListingExtraction; inputTokens: number; outputTokens: number };

export class ListingAiError extends Error {}

let client: Anthropic | null = null;

/** One model call: post text and/or screenshots in, fixed fields out */
export async function interpretListing(input: { text: string; images?: ListingImage[] }): Promise<InterpretResult> {
  client ??= new Anthropic();
  const content: Anthropic.ContentBlockParam[] = [
    ...(input.images ?? []).map((img) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
    })),
    { type: "text", text: input.text.trim() ? `Post:\n${input.text.trim()}` : "Extract the device from the screenshot(s)." },
  ];

  const response = await client.messages.parse({
    model: LISTING_MODEL,
    max_tokens: 4000, // room for adaptive thinking plus the JSON
    system: SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(ListingExtraction) },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new ListingAiError("L’annonce n’a pas pu être analysée. Remplissez le formulaire à la main.");
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new ListingAiError("Analyse incomplète. Réessayez, ou remplissez le formulaire à la main.");
  }
  return {
    extraction: response.parsed_output,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
