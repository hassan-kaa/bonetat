# 🔥 Bonétat — Rebirth Plan

> **What this file is.** The execution plan for relaunching Bonétat professionally. `SECOND_BRAIN.md` holds the *why* and long-term identity; this file holds the *what's next and in what order*. Work through it top-to-bottom. Check items off as they're done.
>
> **Last updated:** 2026-10-08

---

## 1. Decisions Locked

### Added 2026-08-06 — Product architecture pivot (the Back Market model)

| Decision | Choice | Implication |
| --- | --- | --- |
| **Catalog model** | **Device + Offers** (product-centric), replacing per-listing pages | One page per device ("iPhone 13") with storage/color/grade pickers; the cheapest matching ACTIVE offer wins the buy box. Vendors compete on price behind the scenes. This is what separates Bonétat from eBay/Tayara-style classifieds. |
| **Vendor visibility** | Name + rating only | "Vendu par TechStore ★4.8 · Vendeur certifié" on the buy box. No public store pages, no Instagram links, not browsable. Kills disintermediation while keeping warranty transparency. Vendor pitch shifts from "get a storefront" to "get access to buyers + a ready-made catalog". |
| **Device catalog ownership** | Bonétat owns the device catalog | Vendors pick a device and publish an offer in <2 min — no title, description, or photos to write (device provides them). Kills the image-upload blocker for vendor onboarding. Admin device-CRUD is a needed follow-up (currently seed-only). |
| **Grade ⇄ battery link** | ~~Enforced in listing form~~ **Superseded 2026-10-09: unlinked, see §1quater** | Each grade imposes a minimum battery health (≥90/85/80/75%) — the grading standard is now code, not just copy. |

### Locked 2026-08-05

| Decision | Choice | Implication |
| --- | --- | --- |
| **Launch model** | Full marketplace — on-platform COD checkout | We own the order flow, buyer protection, and courier/cash reconciliation. This is the true Back Market model. |
| **Revenue** | Commission per sale | Enforceable because checkout is on-platform. Introductory rate should be low (see §5) to kill vendor objections. |
| **Timeline** | Quality-driven, no hard date | Launch when the experience is clearly better than browsing Instagram — but with milestones (§7) so "no date" ≠ "no urgency". |
| **Supply status** | No vendor contact yet | **The demo IS the sales tool.** We polish the product with realistic seeded inventory first, then pitch stores with something they can see and touch. |
| **Codebase** | Keep and evolve — no rewrite | Next.js 15 + Prisma + Postgres + Tailwind is the right stack. The MVP skeleton (storefront, checkout, vendor/admin panels, OTP auth) is sound. |

---

## 1bis. Refactor Status (2026-08-06) — Device + Offers shipped

Everything below is implemented, typechecked and linted:

- **Schema v2**: `Device` (canonical catalog: brand, model, slug, new-price, fixed specs, images) + `Offer` (vendor, grade, storage, color, battery %, warranty, price, stock, seller note). `OrderItem` now references offers. Old `Product` model removed.
- **Catalog**: one card per device, "dès X TND", offer/grade counts, discount vs new. Sort by cheapest offer. The server-component `onChange` crash on the old catalog page is fixed (sort is now a client component).
- **Device page**: storage → color → grade pickers built from real offers (unavailable combos disabled, per-grade prices shown), buy box with cheapest offer, savings vs new, battery/warranty/COD line, "Vendu par X ★ · certifié", collapsible "other offers for this config" list, sticky mobile buy bar, AggregateOffer JSON-LD.
- **Cart/checkout/orders**: offer-based end-to-end; the orders API now recomputes prices server-side (never trusts client totals) before creating the order and decrementing stock.
- **Vendor flow**: "Nouvelle offre" = pick device → config → price. Grade-vs-battery floor enforced. Listings/dashboard/orders pages updated.
- **Admin**: offer moderation queue, dashboard counts, order details show device + config + vendor.
- **Removed**: `/stores` pages, vendor strips, Instagram links on buyer surfaces; sitemap now device-based.
- **Seed**: 12 devices, ~30 offers, 3 vendors — including 3 vendors competing on the same iPhone 13 config (`/products/iphone-13` is the demo).

**To run locally** (sandbox can't execute Prisma/Next binaries):
```
npx prisma generate
npx prisma db push   # WARNING: drops old Product tables — dev data only
npm run db:seed
npm run dev
```

### Image library + variants (2026-08-06)

**Bonétat owns all product photography.** `DeviceImage` rows are keyed by device + color, so a store listing a blue iPhone 15 automatically gets the blue photos. Vendors never upload anything — the color field in the offer form is a **dropdown populated from the image library**, which guarantees every listing has matching visuals and keeps the catalog looking uniform (the opposite of Instagram's inconsistent phone snaps). The seed refuses to create an offer whose color isn't in the library.

- **Gallery follows the selection** — changing color swaps the photos; clickable thumbnails; resets on any picker change.
- **Price shown per state** — each grade button displays its own price in bold plus "−X% vs neuf", so the state/price trade-off is visible before selecting.
- **Catalog cards** use the cheapest offer's color image.
- **Seed coverage**: 12 devices, 41 colors in the library, ~60 offers. iPhone 11 has 64 Go in 3 colors and 128 Go in 2, with up to 4 grades each — the variant test case.

**Known follow-ups**: admin CRUD for the device catalog + image library (seed-only today); "request a device/color" flow for vendors; replace Unsplash placeholders with real studio shots before launch.

---

## 1ter. Redesign + catalog v3 (2026-10-08)

### Decisions locked

| Decision | Choice | Implication |
| --- | --- | --- |
| **Partner visibility** | ~~Hidden from buyers~~ **Reversed 2026-10-10: the shop's name is shown on every offer ("Vendu par TechStore Sousse")**, so buyers know who they buy from. Contact details stay stripped from everything a store writes. | The shop's name appears on the buy box, cards and cart. Bonétat still guarantees and answers for every order. Risk: buyers contacting shops directly; mitigated by stripping contact details. |
| **Naming** | Product → Variant → Offer | Product = page ("iPhone 11 Pro"); Variant = what the device is (storage, RAM, option, color), Bonétat-owned; Offer = a partner's unit (condition, battery, IMEI, price, stock). |
| **Scope** | All tech, phones first | Categories: iPhone, Android, iPad, Android tablets, MacBook, laptops, watches, consoles. |
| **Visual identity** | "Bleu de Sidi Bou Saïd" #1747C8, bougainvillea pink #E0317A for "new", green #0A9447 for savings, Readex Pro | Prototype approved on the Design canvas. |
| **Commission** | ~~5 % introductory~~ **Fixed at 2.5 % (2026-10-10)**, 2 % was the alternative | `COMMISSION_RATE` in `src/lib/money.ts`; shown to stores unrounded ("2,5 %"). Orders placed before keep their recorded 5 %. |

### Shipped
- **Schema v3**: `Product`, `Variant`, `Offer` (+ `previousPriceMillimes` for "Prix en baisse"), `Address`, `Favorite` (price alerts), vendor legal/bank fields + `qualityScore` + `partnerCode`, per-item fulfillment, order numbers, item snapshots.
- **Variant engine** (`src/lib/configurator.ts`): every option shows the exact price you get by clicking it, sold-out values stay visible, selection lives in the URL, sibling models (11 / 11 Pro / 11 Pro Max) switch while keeping state/storage/color. E2E-tested: 0 mismatches over 140+ clicks across phones, laptops, tablets, watches, consoles.
- **Buyer**: new home (live condition demo hero, category tiles, arrivals, variant cards with reason tags), catalog with one card per variant, cart that re-checks price/stock, checkout with address book, atomic stock reservation.
- **Client space**: orders + timeline + cancel, reviews, devices with warranty countdown and fault reporting, price alerts, addresses, profile.
- **Partner space**: dashboard (sales, to-ship, quality score breakdown, buy-box share, next payout), orders to ship + Bonétat packing slip, offers table with inline price/stock and position, 4-step publish flow with grade ⇄ battery rule, payouts, store profile, application flow.
- **Admin**: order confirmation/delivery/cancel, offer moderation with rejection reasons, partner approval + quality score.

### Still open
- **Seller of record**: hiding partners makes Bonétat the face of every warranty claim. Decide whose name is on the invoice before launch (see §9).
- Multi-partner orders ship as several parcels; checkout charges one 8 DT fee. Courier cost per parcel is on Bonétat for now.
- Admin catalog CRUD (products, variants, photos) is still seed-only.
- Price-alert notifications are stored but not sent (needs SMS/WhatsApp provider).
- Arabic/RTL: font and `User.locale` are ready, strings are not translated yet.

---

## 1quater. Imaging + variants foundation (spec, 2026-10-09, awaiting approval)

### Decisions locked (2026-10-09)

| Decision | Choice | Implication |
| --- | --- | --- |
| **Two image layers** | Catalog photos (Bonétat) + unit photos (partner) | Cards and the product hero show clean catalog photos. The product page also shows the real unit photos of the offer currently in the buy box. |
| **Catalog photo source** | **Open Icecat** for every brand it covers. Apple (not in the free tier) stays on the illustration until a paid tier or an optional shoot of top models | Shooting everything ourselves doesn't scale. Playbook: `docs/IMAGE-REGISTER.md`. |
| **Grade ⇄ battery** (replaces the 2026-08-06 link) | **Unlinked.** The grade is appearance + function only; battery is measured per unit and shown everywhere. One floor for all grades: 75 % | A "Comme neuf" phone can have a 78 % battery. Each grade button shows the battery of the unit you'd get. |
| **Hosting** | We store and serve every image ourselves | No hotlinking. Our own storage + CDN (content delivery network), cached forever. |
| **Unit photo rules** | Light: 1 to 3 photos, no guided slots | Partners are vetted before approval, so trust is handled at onboarding, not at upload. |
| **One offer = one physical unit** | `stockQty` removed. A partner with 3 identical phones creates 3 offers ("Dupliquer" copies config + price, photos re-uploaded) | Unit photos always show the exact device the buyer receives. Refurbished stock is rarely identical, so this costs partners little. |
| **Missing catalog photo** | Any finish is sellable. No approved FRONT → `DeviceArt` illustration in the finish hex, with a visible "Illustration" badge | Partners are never blocked by curation. Kaa aims for full brand coverage; the admin coverage view lists what's missing. |

### What breaks in the current model

1. **Color is a free string.** `Variant.color` is text and the gallery joins on it (`imagesByColor[current.color]` in `Configurator.tsx`). A typo or a rename ("Bleu" to "Bleu alpin") silently drops the photos and falls back to `"*"`.
2. **Variants are a cartesian product.** The seed builds storage × RAM × option × color. Real lineups have holes (colors not sold in every storage, RAM tied to storage), so we create variants that never existed and show "épuisé" forever.
3. **Hex is duplicated** on every variant (same color repeated for each storage).
4. **`next.config.ts` allows `hostname: "**"`.** Anyone can use our image optimizer as a free proxy for any site (cost + abuse). Lock it to our image host.
5. **No upload storage exists** yet.

### Data model

```prisma
/// A color as the manufacturer sells it, for one product ("Bleu alpin" on iPhone 13 Pro).
model Finish {
  id        String        @id @default(cuid())
  productId String
  slug      String        // "bleu-alpin", stable, used to match across sibling products
  nameFr    String
  nameAr    String?
  hex       String
  family    ColorFamily   // BLACK, WHITE, GREY, SILVER, GOLD, BLUE, GREEN, PURPLE, PINK, RED, YELLOW, ORANGE, OTHER
  aliases   String[]      // ["Sierra Blue", "Bleu Sierra"], used by importers and sibling matching
  position  Int           @default(0)

  product  Product        @relation(fields: [productId], references: [id], onDelete: Cascade)
  images   CatalogImage[]
  variants Variant[]

  @@unique([productId, slug])
}

/// Bonétat-owned catalog photo, one per finish + angle.
model CatalogImage {
  id          String      @id @default(cuid())
  finishId    String
  angle       ImageAngle  // FRONT, BACK, SIDE, DETAIL
  position    Int         @default(0)
  key         String      // storage path, content-hashed: catalog/<product>/<finish>/<hash>
  width       Int
  height      Int
  blurDataUrl String      // tiny placeholder, no layout shift
  source      ImageSource // ICECAT, PRESS_KIT, OWN_SHOOT, OTHER
  sourceRef   String?     // Icecat id or original URL, for audit
  status      ImageStatus @default(DRAFT) // DRAFT, APPROVED, ARCHIVED
  createdAt   DateTime    @default(now())

  finish Finish @relation(fields: [finishId], references: [id], onDelete: Cascade)

  @@index([finishId, status])
}

model Variant {
  // ...storageGb, ramGb, option, newPriceMillimes, position unchanged
  finishId  String        // replaces color + colorHex
  /// "256|8|-|bleu-alpin". Postgres treats NULLs as distinct, so a plain
  /// @@unique on the nullable axes would not block duplicates. This does.
  signature String
  @@unique([productId, signature])
}

/// Partner photo of the actual unit(s) behind an offer.
model OfferPhoto {
  id        String   @id @default(cuid())
  offerId   String
  key       String   // offers/<offerId>/<hash>
  width     Int
  height    Int
  position  Int      @default(0)
  createdAt DateTime @default(now())

  offer Offer @relation(fields: [offerId], references: [id], onDelete: Cascade)

  @@index([offerId])
}
```

`ProductImage` is removed. `Variant.color` / `colorHex` move to `Finish`.

### Rules the code enforces

1. **Variants are explicit.** The seed and admin CRUD declare the real list of variants. No cartesian generation.
2. **Every finish the brand launched is sellable.** If it has no APPROVED `FRONT` image, the front slot shows the `DeviceArt` illustration in the finish hex with an "Illustration" badge, and the other angles are simply absent. Unit photos still show the real device.
3. **Same angle survives a color switch.** If the buyer is on BACK and changes color, the gallery stays on BACK.
4. **Sibling switch keeps color by finish**, matching `slug`, then `aliases`, then `family` (11 "Vert" to 11 Pro "Vert nuit" lands on green, not the default).
5. **Fallback order for any image slot:** approved catalog image, then `DeviceArt` illustration (front only, badged). Never a broken image.
6. **Unit photos:** 1 required, 3 max, shown only for the offer in the buy box, labelled "Photos de l'appareil que vous recevrez".
7. **One offer = one unit.** No quantity anywhere (cart, checkout, partner tables). Selling an offer sets it to `SOLD` atomically (`update ... where status = ACTIVE`); a cancelled order puts it back to `ACTIVE`. If a cart offer sells before checkout, the cart proposes the next cheapest offer for the same variant + grade.

### Catalog photo standard

- 1600 × 1600 square, device centered, about 80 % of the frame height, same padding on every image.
- One neutral background for the whole site (transparent sources flattened onto it).
- FRONT is required, BACK strongly recommended, SIDE and DETAIL optional.

### Storage and delivery

- **Cloudflare R2** bucket behind our own domain (e.g. `img.bonetat.tn`). R2 has no egress fees, which matters for an image-heavy catalog.
- **Content-hashed keys** + `Cache-Control: public, max-age=31536000, immutable`. Replacing a photo creates a new key, so no cache purge is ever needed.
- **Sizes pre-generated at ingest** with `sharp`: 400, 800, 1600 px WebP + blur placeholder. A custom `next/image` loader picks the right one. Runner-up: let `next/image` resize on demand from the locked R2 host. Simpler, and the better choice if we self-host Next (optimization is free there), worse on Vercel where each transform is billed.
- **Unit photo upload:** browser gets a presigned PUT URL to `uploads/tmp/`, then a server route auto-rotates, **strips EXIF** (photo metadata: GPS location, phone owner name), resizes, converts to WebP, writes to `offers/<offerId>/`. An R2 lifecycle rule deletes `uploads/tmp/` after 24 h.

### Curation pipeline (Kaa)

1. **Import:** `scripts/images/import.ts` reads `catalog-src/icecat.csv` (product slug, finish slug, Icecat ID) plus optional own-shoot folders, normalizes to the standard above and creates `DRAFT` rows.
2. **Review:** `/admin/catalog/[product]` lists finishes as rows and angles as columns. Approve, reject, reorder, edit name / hex / family / aliases.
3. **Coverage view:** products whose finishes are missing an approved FRONT, sorted by how many partner requests or offers are blocked on them.

### What depends on it (refactor surface)

| Surface | Change |
| --- | --- |
| `src/lib/configurator.ts` | `color` axis becomes `finishId`. Swatches read `Finish.hex`. |
| Product page + `Configurator.tsx` | Gallery keyed by `finishId` + angle. Unit photos block under the gallery, tied to the buy-box offer. |
| `VariantCard`, catalog, home | FRONT image of the cheapest offer's finish, `DeviceArt` fallback. |
| Catalog filters, suggestions | `Finish.family` gives a cross-brand "Couleur" filter and "same color, other model" suggestions. |
| Vendor `PublishFlow.tsx` | Color step shows approved finishes with their FRONT thumbnail. New step: upload 1 to 3 unit photos. |
| Admin offer moderation | Shows unit photos. |
| Stock removal | `OfferStatus` gains `SOLD`. Drop `stockQty` from schema, `configurator.ts` tie-breaker, `queries.ts`, cart store + page (no qty stepper), `api/cart`, `api/orders` (reserve = ACTIVE→SOLD), order cancel routes (SOLD→ACTIVE), vendor `OffersTable` / `EditOffer` / `PublishFlow` / listings API, sitemap. Vendor table gets "Dupliquer". |
| Sitemap / JSON-LD (structured data for Google) | Uses catalog image URLs. |
| `prisma/seed.ts` | Explicit variant lists, finishes with family + aliases. |

### Build order

1. Schema (`Finish`, `CatalogImage`, `OfferPhoto`, `Variant.finishId` + `signature`). Dev data only, so reseed instead of migrating.
2. Storage: R2 bucket + domain, `src/lib/storage.ts` (presign, put), `src/lib/images.ts` (sharp pipeline). Lock `next.config.ts` to the image host.
3. Configurator + product page + cards on `finishId`. Re-run the 140-click E2E (end-to-end) check.
4. Seed rewrite with explicit variants.
5. Import script + admin catalog review screen.
6. Vendor publish flow: finish picker + unit photo upload + "Dupliquer". Admin moderation shows photos.
7. Buyer: unit photos on the product page, "Illustration" badge on fallback.

Stock removal goes in step 1 (schema) and step 3 (app code), since it touches the same files.

### Status (2026-10-09)

**Shipped** (typechecked, linted, 34 unit tests passing, order lifecycle tested end to end on the dev server):
- Schema v4: `Finish`, `CatalogImage`, `OfferPhoto`, `Variant.finishId` + `signature`, `OfferStatus.SOLD`. `stockQty`, `OrderItem.qty` and `ProductImage` removed.
- Steps 1, 3, 4: configurator, product page (gallery by finish + angle, "Illustration" badge, sibling color matching by slug / alias / family), cards, cart, checkout, orders, account pages, sitemap + JSON-LD images. Seed with explicit lineups (166 real variants instead of 169).
- One offer = one unit: order moves ACTIVE to SOLD atomically, cancel puts it back, cart swaps a sold unit for an identical one, partner "Dupliquer" + "Publier un appareil identique".
- `next.config.ts` locked to our image host. Vitest set up (`npm test`).

**Shipped 2026-10-09 (later):** storage (local in dev, R2 driver ready), normalizer (white 1600 px square, 3 WebP sizes, content-hashed), Icecat import from the admin (`/admin/catalog/[slug]`: paste a manufacturer code per color), review (angle, validate one image per angle, archive), coverage view. Tested end to end with Galaxy S23 Noir via Icecat. Grading opens as a modal from the product page.

**Shipped 2026-10-09 (sync):** `npm run images:sync` matches every color to Icecat automatically (index + color fields), puts certain official matches online, and turns the rest (including branded refurbished listings) into one-click suggestions with previews. 66 unit tests.

**Next:** R2 account + domain before launch, 6 (unit photo upload), 7 (unit photos on the product page). Curation playbook: `docs/IMAGE-REGISTER.md`.

### Failure modes to watch

1. **Unit photos can leak the partner** (shop logo, branded mat, receipt in frame, store name on a sticker). Partners are hidden from buyers, so admin moderation must check this. It's the one upload rule we can't drop.
2. **Icecat images vary in angle and lighting** even after normalization. Expect to swap some by hand on the review screen. Requiring only FRONT keeps the load manageable.
3. **"Dupliquer" invites photo reuse.** A partner with 5 phones may upload the same photos 5 times. Catch it with a perceptual hash (image fingerprint) check across a partner's offers, flagged in moderation, not blocked.
4. **Many identical offers crowd the "autres offres" list.** Group offers with the same variant + grade + price into one line.
5. **An offer can sell while it sits in another buyer's cart.** Handled by rule 7 (atomic SOLD + cart proposes the next offer).

### Open decisions

1. ~~Offers with stock > 1~~ **Decided 2026-10-09:** stock removed, one offer = one unit (see decisions table).
2. ~~Hosting target~~ **Decided 2026-10-09:** Vercel for now. Sizes are pre-generated at ingest, so image delivery costs nothing on Vercel and moves unchanged to any host. Note: Vercel Hobby (free) forbids commercial use, so launch on `bonetat.tn` needs Vercel Pro or a move. Images on R2 are unaffected either way.
3. ~~Background color~~ **Decided 2026-10-09:** `#F2F4F7`, a cool light grey that sits with the Sidi Bou Saïd blue and keeps white devices visible.

---

## 1sexies. Catalog complete in advance, photos automatic, admin moderates offers only (2026-10-10)

### Decisions locked

| Decision | Choice | Implication |
| --- | --- | --- |
| **Catalog** | Built in advance from 3 sources: a curated list in code (`src/data/curated-models.ts`: phones, tablets, watches, Apple, consoles), the Icecat reference (laptops above all, names with a recognised line only) and Wikidata (older phones). 1,490 models | Stores search one catalog and pick. No "official vs ours", no approval. `npm run catalog:build` adds missing models; `db:seed` runs it. |
| **Missing model** | Rare fallback, live at once, duplicate-checked, no approval | Admin tool "Modèles ajoutés par les ateliers" to fix or merge, not a to-do list. |
| **Photos** | Automatic: when a color gets its first unit, its official Icecat photos in that color are imported and put online in the background | No photo validation. Refurbished listings never used; no official photo for that color = illustration. |
| **Admin** | Only moderates offers: Valider or "Demander une correction" (reason) | The store corrects grade / battery / IMEI / price / note and resubmits. |

**Added 2026-10-10 (later):**
- **Photos for every product, no admin step:** `npm run images:sync` gives every color on sale its official photo in that color, and every model a **cover** (official main photo, any color) shown with "couleur indicative" when the selected color has no photo. Publishing runs both lookups in the background for that color and model. The Icecat suggestion queue is gone.
- **Store photos of the unit:** up to 3, at publish or later on the offer page; metadata (GPS) stripped; shown to buyers as "Photos de l’appareil que vous recevrez" and in moderation.
- **Shop name shown to buyers** on every offer (decision reversed, see 1ter).

Real posts (15): 7 land on the exact product, 2 on the right choices, 4 vague posts send the store to a pre-filled search, 2 models missing from every source (Precision 7530, Nitro ANV17). Known gap: curated phone list must be extended as stores report models (Infinix, Tecno, Realme variants).

## 1septies. Live updates, filters, computers first, several shops per unit (2026-10-10)

### Decisions locked
- **Live updates by polling, not websockets.** Every open page asks `/api/live` every 8 s while visible (and on focus): toasts for new notifications, silent refresh when offers or the user's orders changed. Runs on Vercel with no extra service. Runner-up: Pusher/Ably, the day polling load or latency matters.
- **Notifications** (table `notifications`) on: offer validated / correction requested (store), new or resubmitted offer (admins), order placed (buyer, shops, admins), admin confirms / delivers / cancels / opens a claim (buyer, shops), buyer cancels (shops, admins), shop ships (buyer), shop account approved (store).
- **Filters:** grades, brands, processor, RAM and SSD are multi-select with OR inside one filter and AND across filters (`?grade=BON,CORRECT&brand=Apple,Samsung`). Price is a two-handle interval (`min`, `max` in DT), bounds from the units on sale. Facet counts show what each choice would give with the other filters kept. Active filters show as removable chips above the results, "Tout effacer" at the top of the filter panel.
- **Computers are a priority category** (many PC shops expected at launch). `/catalog?type=laptop` = every laptop, MacBook and PC together. Right after phones in the nav, footer, home tiles (one wide tile) and catalog chips. Laptop-only filters: processor family, RAM, SSD, dedicated graphics card, read from the model, option and spec sheet (`src/lib/pc-filters.ts`), so stores fill nothing extra.
- **Several shops, same configuration and grade:** the buy box shows the cheapest unit, except that a unit with the store's own photos wins when it costs at most 2 % more (`PHOTO_PREMIUM`, `rankUnits`). Product cards and cart replacements use the same rule. Below the buy box: one row per shop (identical units grouped, "3 disponibles"), price gap to the cheapest, battery, "Photos réelles" thumbnails, 3 rows then "Voir les N ateliers".

### Failure modes to watch
- Polling: 8 s × every open tab hits the database. Fine for launch traffic; watch it on Vercel and Neon.
- The 2 % photo rule can be gamed with one useless photo. Moderation should reject photos that don't show the unit.
- Processor detection depends on the text. A laptop whose catalog entry names no processor doesn't appear under any processor filter.

## 1quinquies. Smart listing + store-created products (spec approved 2026-10-09, built 2026-10-10)

### Why

Stores already describe every device in a social post. If listing on Bonétat means retyping laptop specs field by field, they won't list, and supply is the asset. Two features, one flow: **(1) list from what the store already has** (a pasted post, screenshots, a post link), **(2) list a model we don't have yet** without waiting, and without duplicate products.

### Decisions locked (2026-10-09)

| Decision | Choice | Implication |
| --- | --- | --- |
| **Three ways in** | Manual form, paste the post, or a post link | All three land on the same pre-filled publish form. Nothing is ever published by the AI. |
| **AI model** | Claude Haiku 5.5, one call per listing, structured JSON output | About 3,000 tokens in, 500 out: ~0.002 DT per listing. Runner-up Claude Sonnet 5.5 (20× the price) if tests show Haiku misreads laptop specs. |
| **Product identity** | Structured, never free text: brand (list) → line (list) → model (list or new, with model number) | Dedupe on a normalized key, not on names. |
| **Reference catalog** | Icecat index rows imported into our database (`ReferenceProduct`) | Picking a reference model creates a canonical product instantly, with specs and photos. |
| **New products** | From the reference catalog: **live immediately**. Typed by hand: **live immediately as "provisional"**, admin confirms or merges within 24 h | The store is never blocked. Duplicates are prevented at entry and fixed in one click when they slip through. |
| **Spec edits** | Unit specs (RAM, SSD, CPU, color) free per offer. Model specs (screen, ports) = suggestions to admin | One store can't rewrite the page every other store sells on. |

### Realistic approaches considered for the interpreter

| Approach | Verdict |
| --- | --- |
| **One LLM call with a strict JSON schema, then deterministic matching in our code** | **Chosen.** Cheap, fast (1 to 3 s), testable. The model only extracts; our code decides what product it is. |
| Regex / keyword parser, no AI | Breaks on emoji-heavy, multilingual posts like the HP example. Fine as a fallback for price and storage only. |
| Agent with tools (search catalog, ask questions) | Overkill and slower; the matching is deterministic and belongs in code. |

### Data model

```prisma
model Product {
  // ...existing fields
  line         String?        // "Vostro", "EliteBook", "Galaxy S", "iPhone": from a per-brand list
  modelNumber  String?        // "3520", "8 G1i", "S23": the part that identifies the model inside a line
  /// "dell|vostro|15 3520": brand + line + model number, normalized. The dedupe key.
  canonicalKey String   @unique
  status       ProductStatus  @default(ACTIVE) // ACTIVE, PROVISIONAL, MERGED
  mergedIntoId String?        // MERGED products redirect here (offers moved, old URL 301s)
  createdByVendorId String?   // set when a store created it
  referenceId  String?        // the ReferenceProduct it came from, if any
}

/// Icecat index rows for every brand stores might sell, imported by the sync script. Search source, never shown to buyers.
model ReferenceProduct {
  id          String  @id @default(cuid())
  icecatId    Int     @unique
  brand       String
  modelName   String  // as Icecat writes it
  productCode String  // manufacturer code, e.g. SM-S911BZKDEUE
  searchText  String  // normalized brand + model + code, trigram-indexed (pg_trgm) for typo-tolerant search
  picWidth    Int
}

/// A store's correction to model-level specs, reviewed by admin
model SpecSuggestion {
  id        String   @id @default(cuid())
  productId String
  vendorId  String
  changes   Json     // [{ label, from, to }]
  status    SuggestionStatus @default(PENDING) // PENDING, ACCEPTED, REJECTED
  createdAt DateTime @default(now())
}

/// Every interpretation, for cost tracking, debugging and improving the prompt
model ListingDraft {
  id        String   @id @default(cuid())
  vendorId  String
  source    String   // "manual" | "paste" | "link" | "screenshot"
  input     String   // the pasted text or the link (screenshots: storage keys)
  extracted Json     // what the AI returned
  offerId   String?  // set when the store published from it
  inputTokens  Int?
  outputTokens Int?
  createdAt DateTime @default(now())
}
```

`Brand` and `ProductLine` become small admin-managed lists (seeded from the catalog and the Icecat index), so the store always picks, never types, a brand or line.

### The flow

```
┌ Nouvelle offre ─────────────────────────────────────────────────┐
│  [ Remplir à la main ]  [ Coller mon annonce ]  [ Lien de publication ] │
│                                                                   │
│  Collez le texte de votre publication, ajoutez 1 à 3 captures :   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ 🔥 HP EliteBook 8 G1i – Puissance & Élégance …              │   │
│  └───────────────────────────────────────────────────────────┘   │
│  [+ captures d’écran]                       [ Analyser → ]       │
└───────────────────────────────────────────────────────────────────┘
```

1. **Interpret** (paste, screenshots, or link). The link is best effort: we fetch the public page and read its preview text and image (the same data WhatsApp shows when you share a link). Facebook and Instagram often hide posts behind a login; then the screen says so and asks for the text or a screenshot instead. No scraping behind logins.
2. **Extract** with one AI call into a fixed schema: brand, model words, model number, RAM, storage, CPU, screen, color, price, condition words, battery %, included items, warnings ("neuf", "grade A", missing fields).
3. **Resolve the product** in our code, in this order:
   1. exact `canonicalKey` match in our catalog → that product
   2. typo-tolerant search in our catalog and in `ReferenceProduct` → **up to 3 candidates** shown as cards: "C’est l’un de ces modèles ?"
   3. none fits → **"Nouveau modèle"** form, pre-filled, structured:

```
┌ Nouveau modèle ────────────────────────────────────────────────┐
│ Marque    [ HP            ▾ ]   (liste)                          │
│ Gamme     [ EliteBook     ▾ ]   (liste de la marque, ou + ajouter) │
│ Modèle    [ 8 G1i           ]   n° de modèle, pas de description  │
│ Type      [ Ordinateur    ▾ ]                                    │
│                                                                  │
│ ⚠ Proche de : HP EliteBook 840 G11, HP EliteBook 8 G1a           │
│   [ C’est celui-là ]  [ Non, c’est bien un nouveau modèle ]       │
└──────────────────────────────────────────────────────────────────┘
```

   The duplicate check runs on every keystroke: same `canonicalKey` blocks creation ("ce modèle existe déjà"); a close match (same brand + line, model number within one character or token) asks to confirm.
4. **Pre-filled publish form**: the existing 4 steps, with every extracted value filled and **each field marked "lu dans votre annonce"** (store can change it) or **"manquant"** (store must answer). Grade and battery are always confirmed by the store; the grade buttons never default from the post's wording.
5. **Publish**: the offer goes to moderation as today (24 h). If the product is provisional, its review rides in the same queue: admin sees "nouveau modèle proposé par TechStore" with **Confirmer**, **Fusionner avec…** (search) or **Corriger** (brand, line, model number). Merging moves the offers and redirects the old URL.
6. **Photos**: confirming a product queues it for the Icecat sync. Until then, the illustration and the store's unit photos.

### What the store edits, and where it goes

| Field | Level | Store edits it? |
| --- | --- | --- |
| RAM, storage, CPU (Version), color | Variant | Yes, per offer; a new combination creates the variant |
| Price, grade, battery, serial, included items | Offer | Yes, as today |
| Screen, ports, weight, description | Product (shared) | Suggestion to admin, applied on accept |

### Failure modes to watch

1. **Wrong model picked from close candidates** ("EliteBook 840 G11" vs "8 G1i"). Candidates always show the model number in bold and a photo when we have one; the canonical key makes a wrong pick visible in the admin queue.
2. **Line lists drift** (stores adding "Elitebook", "Elite Book"). New lines go through the same provisional review; normalization (case, spaces, accents) runs before the duplicate check.
3. **AI cost or abuse** (a store pasting essays in a loop). Input capped (4,000 characters, 3 screenshots), 30 interpretations per store per day, every call logged in `ListingDraft` with its tokens.

### Status (2026-10-10)

**Shipped, all 6 build steps.** Tested end to end through the API on real posts; 86 unit tests.
- Product identity (`canonicalKey`), brand and line lists, existing products backfilled without losing photos.
- Reference catalog: 124,661 Icecat models in Postgres, typo-tolerant (pg_trgm), cleaned of SKUs, accessories and refurbished listings. `npm run catalog:reference`.
- Interpreter (Claude Haiku 5.5, structured output): 15 real posts → right model / suggestions on all but the ones with no model number (correctly asks), $0.00055 per post. `npm run listing:eval` replays them.
- Publish flow: 3 ways in, "C’est l’un de ces modèles ?", "Nouveau modèle" with live duplicate check, new configurations and colors on the fly, "lu dans votre annonce" markers, phone numbers stripped from notes and specs.
- Admin: "Nouveaux modèles" (confirm / correct / merge; merge moves offers, the old URL 308-redirects), spec corrections from stores.
- A new model's empty spec sheet is filled from the post.

**2026-10-10:** reference catalog limited to devices (Icecat categories: smartphones, mobile phones, tablets, laptops, smartwatches, consoles), each with its device type, so picking a reference model is one click. 40 brands. Result: 60,552 models. Strong for laptops (ASUS 18k, MSI 11k, HP 7k, Lenovo 4k…) and Samsung phones (2.6k). **Weak for phones Tunisian shops sell most:** Xiaomi 1, Apple 68, Google 0, Infinix / Tecno / Realme / OnePlus / Nothing 0. Free Icecat doesn't carry them; see §9.

**Not verified yet:** the post-link import against a real public Facebook / Instagram post (no URL to test with). Unsupported or private links fall back to "collez le texte".

### Build order

1. Schema: product identity fields + `canonicalKey` backfill, `Brand`/`ProductLine` lists, `ReferenceProduct` (+ pg_trgm index), `SpecSuggestion`, `ListingDraft`. Sync script also fills `ReferenceProduct` for every brand on the list, not only catalog brands.
2. Product resolution in code (canonical key, typo-tolerant search, candidate ranking) with unit tests on real names.
3. "Nouveau modèle" form with live duplicate check; provisional products; admin confirm / merge / correct.
4. Interpreter: Claude Haiku 5.5 call with JSON schema, paste + screenshots, pre-filled form with "lu" / "manquant" markers. Tested on 20 real posts from partner stores before launch.
5. Link import (best effort, preview metadata only).
6. Spec suggestions: store side + admin review.

## 2. Honest Assessment of Where We Are

### What the legacy code already does well
- Correct domain model: `User / Vendor / Product / Order / OrderItem / Review / Payout` with commission tracked per order item and money in **integer millimes** (no float bugs).
- Full loop implemented: browse → PDP → cart → COD checkout → order tracking; vendor listing management; admin vetting/moderation.
- Phone/OTP auth with Tunisian number validation (`+216`).
- Condition grades (`Comme neuf / Très bon / Bon / Correct`) and warranty months are enforced fields — the trust layer exists in the schema.

### Gaps blocking a professional launch
| # | Gap | Severity |
| --- | --- | --- |
| G1 | **No i18n / no Arabic / no RTL** — FR-only hardcoded strings | High |
| G2 | **OTP is mock** (logged to console) — no real SMS provider | Blocker |
| G3 | **No image upload** — products need real photos from vendors | Blocker |
| G4 | **Reviews schema exists but no UI/flow** — trust flywheel not wired | High |
| G5 | **No SEO layer** — no metadata, structured data (Product/Offer schema.org), sitemap | High |
| G6 | **No deployment** — not hosted, no domain, no analytics | Blocker |
| G7 | **Design is functional, not branded** — no logo, palette, or trust-signal-rich UI worthy of the "professional" bar | High |
| G8 | **No courier integration / COD reconciliation ledger** — manual only | Medium (manual is OK at launch volume) |
| G9 | **No vendor pitch materials** — nothing to show stores | High |
| G10 | **Search is basic** — no model/storage/price faceting polish, no fuzzy matching ("iphone 13" vs "iPhone 13 Pro") | Medium |

---

## 3. Strategy: The Cold-Start Play

With zero vendors signed, the sequence matters more than the feature list.

**The play:** build a product so polished that a store owner seeing a 5-minute demo says "my products would look better here than on my Instagram page." Then onboard 2–3 pilot stores **free**, launch quietly with real inventory, and use early buyer traffic + reviews to recruit the next wave at the real commission rate.

**Sequence:**
1. **Polish the product** with realistic seeded inventory (real Tunisian market phones, real TND prices, quality photos) so it looks alive, not empty.
2. **Build the vendor pitch kit** (§6) — one-pager + live demo + the grading standard doc.
3. **Pitch 10–15 Instagram pages / shops**, aiming to close 2–3 pilots. Offer: **0% commission for 3 months**, we photograph/help list their first 20 products ourselves (white-glove onboarding — do things that don't scale).
4. **Soft launch** with pilot inventory. Drive traffic via the vendors' own Instagram pages (they announce "we're now on Bonétat") — their audience bootstraps ours.
5. **Convert to paid commission** once orders flow and value is proven.

**Anti-disintermediation (why stores stay after the free period):**
- We handle COD collection, courier dispatch, and buyer disputes — real work they currently do manually via DMs.
- Reviews and vendor rating live on-platform only; their trust score is an asset they can't take off-platform.
- Buyer protection badge only applies to on-platform orders — buyers themselves will prefer ordering through Bonétat.

---

## 4. Product Enhancement Plan

### 4.1 Buyer experience (the trust showcase)
- [x] **Condition-grade visual system**: color-coded badges with dot indicators + per-grade criteria (battery threshold, cosmetic state) shown on PDP, homepage and `/grading`. *(2026-08-05)*
- [ ] **Brand & visual identity**: logo, final palette, typography (Arabic-capable font, e.g. IBM Plex Sans Arabic).
- [x] **Homepage redesign**: hero + product-card visual, trust ribbon in header, best-deals section (biggest savings vs new), grading explainer, certified-vendors strip. *(2026-08-05)*
- [x] **PDP redesign**: price vs. new-price ("−X% vs neuf" + "vous économisez Y TND"), grade criteria block, vendor card with store link + Instagram, sticky mobile buy bar, JSON-LD. *(2026-08-05)*
- [x] **Catalog**: facets incl. vendor filter, sort. *(2026-08-05)* — [ ] fuzzy search later.
- [ ] **Reviews**: post-delivery review prompt, review moderation in admin. (Display on PDP/store pages already exists.)
- [x] **Vendor public pages**: `/stores` index + `/stores/[id]` branded store page with rating, Instagram, products, reviews. *(2026-08-05)*
- [ ] **FR/AR + RTL** via `next-intl`; FR first-class at launch, AR fast-follow if it threatens the timeline.
- [x] **SEO**: per-product metadata, schema.org Product/Offer/AggregateRating JSON-LD, sitemap.xml, robots.txt, metadataBase. *(2026-08-05)* — [ ] OG images later.
- [x] **Info pages**: `/grading`, `/comment-ca-marche`, `/garanties`, `/contact` (footer links no longer 404). *(2026-08-05)*
- [x] **Schema**: `newPriceMillimes` added to Product for new-price comparison. *(2026-08-05 — run `npx prisma generate && npx prisma db push` locally)*
- [x] **Seed**: ~21 realistic listings, 3 approved stores, real TND market prices. *(2026-08-05 — run `npm run db:seed`)*

### 4.2 Vendor experience (the retention product)
- [ ] Streamlined listing form: pick brand→model from a device catalog (prefills specs), photos, grade, warranty, price, stock. Target < 2 min per listing.
- [ ] Dashboard: orders to fulfill, sales stats, payout statement (gross / commission / net per period).
- [ ] Order notifications (SMS or WhatsApp deep link at first — vendors live on their phones).
- [ ] Onboarding application polished enough to feel exclusive ("apply to join"), reinforcing curation.

### 4.3 Admin / ops
- [ ] Listing moderation queue (approve/reject with reason).
- [ ] Order oversight + dispute flags.
- [ ] Commission ledger per vendor per period (semi-manual payout at first is fine).
- [ ] Basic analytics (orders, GMV, conversion).

### 4.4 Technical hardening
- [ ] **Image upload** → Supabase Storage or Cloudflare R2, with resizing/optimization.
- [ ] **Real SMS OTP** → evaluate Tunisian SMS aggregators (e.g. TunSMS, Orange SMS API) vs. Twilio/Infobip for +216 deliverability and cost. WhatsApp OTP is a pragmatic fallback.
- [ ] **Deployment**: Vercel + Neon/Supabase Postgres + Cloudflare DNS/CDN; staging + production; error tracking (Sentry) + analytics (Plausible/Umami — GDPR-light).
- [ ] **Rate limiting** on OTP + checkout endpoints; basic audit log on orders/payouts.
- [ ] Upgrade deps (Prisma 5→6, etc.) and add a minimal test suite around money math, commission calc, and order state transitions.

---

## 5. Business Model Details

**Commission (primary):**
- Pilot phase: **0% for 3 months** for founding vendors (their real cost = adhering to grading/warranty standards).
- Post-pilot: start at **5–7%** on phones (thin-margin category; Back Market charges ~10% in mature markets — Tunisia needs a gentler entry), review after real unit economics.
- Commission is computed per `OrderItem` (already in schema) and settled against COD remittances.

**Cash flow (COD):** courier collects → remits to Bonétat → Bonétat deducts commission → pays out vendor net on a weekly/biweekly cycle. This makes Bonétat the money hub — strongest anti-disintermediation lever, but requires a clean ledger and a reliable courier agreement. *Alternative if that's too heavy at launch:* courier remits directly to vendor, vendor pays commission invoice monthly (weaker enforcement — acceptable only for pilot).

**Later revenue (don't build yet):** promoted listings, featured homepage slots, trade-in program, accessories attach, extended warranty.

**Unit economics to validate during pilot:** AOV (est. 700–1,500 TND for phones), delivery cost (~8–12 TND), COD failure rate (industry ~10–15% — measure ours), effective take after failures.

---

## 6. Vendor Pitch Kit (build alongside the product)

- [ ] **One-pager (FR, PDF)**: the problem (manual DM selling, page-hopping buyers), the offer (catalog + checkout + delivery + COD handling + more visibility), the ask (list your stock, honor the grading standard), the deal (0% for 3 months).
- [ ] **Live demo** with seeded inventory — on your phone, in their shop.
- [ ] **Grading standard doc (FR)**: precise definitions of the 4 grades (battery health thresholds, screen/chassis criteria, functional checklist), warranty floor (propose **6 months**), return window (propose **7 days**). This doc is the trust product — vendors sign it.
- [ ] **Target list**: 10–15 candidate Instagram pages / shops ranked by follower count, activity, reputation. Criteria: >10k engaged followers or established physical shop, refurb (not just used-as-is) sellers, responsive.

---

## 7. Roadmap (milestone-driven, no calendar dates)

**M1 — "Demo-ready"** *(product looks launched)*
Brand identity applied · homepage/PDP/catalog redesigned · seeded realistic inventory · deployed on real domain · mobile polish.
→ *Exit criterion: you'd proudly show it to a store owner.*

**M2 — "Vendor-ready"**
Pitch kit done · grading standard finalized · vendor onboarding + listing flow polished · image upload live · real OTP.
→ *Exit criterion: a store can self-serve list a phone in under 2 minutes.*

**M3 — "Pilot"**
2–3 stores signed and listed (white-glove) · courier arrangement (manual dispatch OK) · soft launch announced on vendor Instagram pages.
→ *Exit criterion: first 10 real delivered orders, no trust incident.*

**M4 — "Public launch"**
Reviews live · SEO complete · AR/RTL · COD ledger + payout cycle running · commission switched on for new vendors.
→ *Exit criterion: repeatable weekly order volume; vendors renewing.*

---

## 8. Immediate Next Actions

1. Brand identity: name it definitively (Bonétat), logo + palette + type — then apply across the app (start of M1).
2. Redesign homepage + PDP + catalog (the demo surface).
3. Build the seed dataset: ~40 realistic listings (iPhone 11→15, Samsung S/A series, Xiaomi) with real Tunisian market prices and quality imagery.
4. Deploy to a real domain with staging/production.
5. Draft the grading standard doc — needed for both product copy and vendor pitch.

---

## 9. Open Questions (carry into next sessions)

- SMS provider choice for +216 (cost/deliverability research needed).
- Courier partner: Aramex vs. First Delivery vs. Intigo — who handles COD remittance to a platform (not just the seller)?
- Legal: auto-entrepreneur vs. SARL for the platform entity; who is seller-of-record for warranty (recommendation: **vendor is seller-of-record**, Bonétat is intermediary + guarantor of the standard).
- Domain name availability (bonetat.tn / bonetat.com).
- AR at launch vs. fast-follow (current lean: FR at launch, AR in M4).
- **Phone models missing from the reference catalog** (raised 2026-10-10): Xiaomi, Infinix, Tecno, Realme, OnePlus, recent iPhones. Options: import phone model names from Wikidata (free, CC0 licence, names only, no photos), or let the catalog grow from store-created models (already works, reviewed in "Nouveaux modèles").
- **New devices ("Neuf emballé")?** (raised 2026-10-09) Stores post new units too. Refuse them, or add a "Neuf" condition next to the 4 grades? Decide after talking to the first stores. Until then the smart listing flags "neuf" in a post and asks the store to pick a grade.
