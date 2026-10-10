# Bonétat — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL (local, Supabase, Neon or Railway)

## Run it

```bash
npm install
cp .env.example .env          # set DATABASE_URL
npx prisma generate
npx prisma db push            # schema v4 (Product → Finish → Variant → Offer). Drops old tables in dev.
npm run db:seed               # WIPES the database, then loads the demo catalog
npm run dev
npm test                      # unit tests (Vitest), pure logic only, no database needed
```

Catalog data (needs the Icecat and Anthropic keys in `.env`, see `.env.example`):

```bash
npm run catalog:reference     # load the Icecat reference catalog (~60,000 devices), source for the catalog and for photos
npm run catalog:build         # fill the catalog in advance (curated list + Icecat + Wikidata); db:seed runs it too
npm run images:sync           # match every color to Icecat and import its photos (suggestions for the uncertain ones)
npm run listing:eval          # run the real store posts in scripts/fixtures through the smart listing (costs ~0.01 $)
```

Open http://localhost:3000

> Upgrading from schema v3 (Oct 2026): variants now need a `finishId` and a `signature`, so `db push` refuses while old rows exist. Run `npx prisma db push --force-reset` (drops every table, dev data only), then re-seed.

## Test accounts (after seeding)

| Role             | Phone        | What you can try                                           |
|------------------|--------------|------------------------------------------------------------|
| Client           | +21644444444 | Orders in progress and delivered, warranty, price alerts, 2 addresses |
| Partner          | +21611111111 | TechStore Sousse: orders to ship, offers, payouts          |
| Partner          | +21622222222 | PhoneLand Sfax                                             |
| Partner          | +21655555555 | SmartFix Tunis                                             |
| Partner, pending | +21633333333 | GadgetZone Bizerte, waiting for approval                   |
| Admin            | +21600000000 | Confirm orders, moderate offers, approve partners          |

**OTP is mocked outside production**: the code is printed in the server console *and* shown on the verify screen in dev.

## How the catalog works

| Level       | Example               | Owned by | Holds |
|-------------|-----------------------|----------|-------|
| **Product** | iPhone 11 Pro         | Bonétat  | Page, description, specs, series (11 / 11 Pro / 11 Pro Max) |
| **Finish**  | Vert nuit             | Bonétat  | A color as sold: name, hex, color family, aliases ("Midnight Green"), **catalog photos** (`CatalogImage`, one per angle) |
| **Variant** | 256 Go, Vert nuit     | Bonétat  | Storage, RAM, option (« 41 mm, GPS », « Wi-Fi »), finish, new price. Only combinations that really exist. |
| **Offer**   | one physical unit     | Partner  | Condition, measured battery, IMEI, price, unit photos (`OfferPhoto`). No quantity: 3 identical phones = 3 offers. |

The buyer picks state, storage, RAM, version and color. `src/lib/configurator.ts` resolves the cheapest sellable offer for that exact selection (ties go to the partner with the best quality score, then to the unit listed first). Each option shows the exact price the buyer will get by clicking it. When a combination is sold out, the engine keeps as many of the buyer's other choices as it can. The selection lives in the URL (`?v=<variantId>&g=<GRADE>`).

**Partners are never shown to buyers.** Not on product pages, not in the cart, not in orders or reviews. Packing slips are Bonétat-branded and carry only the internal partner code.

## Routes

| Route | Who | What |
|---|---|---|
| `/` | Public | Hero with the live condition demo, categories, arrivals, deals |
| `/catalog` | Public | One card per variant at its best price; filters: category, state, brand, budget; sort |
| `/products/[slug]` | Public | Configurator, buy box, specs, reviews |
| `/cart`, `/checkout` | Buyer | Cart re-checks prices; a unit sold meanwhile is swapped for an identical one when available; cash on delivery |
| `/account` | Client | Orders with timeline, cancel, reviews |
| `/account/orders/[id]` | Client | Order tracking, parcels, totals |
| `/account/appareils` | Client | Delivered devices with warranty countdown, report a fault |
| `/account/suivi` | Client | Followed variants, price-alert threshold |
| `/account/adresses` | Client | Address book by gouvernorat |
| `/account/profil` | Client | Name, e-mail, language, notifications |
| `/vendor/apply` | Anyone | Partner application |
| `/vendor/dashboard` | Partner | Sales, items to ship, quality score, buy-box share, next payout |
| `/vendor/orders` | Partner | Ship confirmed items, print the Bonétat slip |
| `/vendor/listings` | Partner | Inline price edits, position vs best price, pause, « Dupliquer » for identical units |
| `/vendor/listings/new` | Partner | Paste a Facebook / Instagram post (or screenshots, or a link): the form fills itself. Or search manually; a model we don't carry is created on the spot (duplicate-checked) |
| `/vendor/payouts` | Partner | Current half-month period and past transfers |
| `/vendor/profile` | Partner | Legal and bank details (admin-only visibility) |
| `/admin/*` | Admin | Orders (confirm / delivered / cancel), offer moderation, partners, catalog photos, new models (confirm / correct / merge) and spec corrections |

## Order lifecycle

`PENDING` (placed) → admin calls the client → `CONFIRMED` → each partner marks its items shipped → `SHIPPED` when all are → admin marks `DELIVERED` when the courier remits cash. Placing the order moves each unit from `ACTIVE` to `SOLD` in one atomic update, so two buyers can never get the same device. Cancelling before shipping puts the units back to `ACTIVE`.

## Key decisions

- **Money in millimes** (integers). `formatPrice` shows "1 029 DT", or three decimals when there are millimes.
- **Commission 5 %** (introductory), `src/lib/money.ts`, stored per `OrderItem`.
- **Flat delivery fee 8 DT** per order, `src/lib/catalog.ts`.
- **Font self-hosted** with `@fontsource-variable/readex-pro` (Latin + Arabic, ready for RTL later).
- **Images**: every picture comes from our own storage (`NEXT_PUBLIC_IMAGE_BASE_URL`), pre-sized to 400 / 800 / 1600 px WebP, see `src/lib/image-url.ts`. A finish without an approved FRONT photo is drawn by `DeviceArt` in its hex, with an "Illustration" badge on the product page. How to build the photo register: `docs/IMAGE-REGISTER.md`.

## Real SMS (production)

Replace the `console.log` in `sendOtp()` (`src/lib/auth.ts`) with your provider's SDK call.
