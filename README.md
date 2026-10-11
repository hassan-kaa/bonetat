<p align="center">
  <img src="public/brand/mark.svg" alt="Bonétat" height="72">
</p>

<h1 align="center">Bonétat</h1>

<p align="center">The marketplace for refurbished tech in Tunisia.<br>Phones, computers, tablets, watches and consoles, sold by vetted repair shops.</p>

---

## What it is

Bonétat connects buyers with trusted repair shops across Tunisia.

- **Buyers** browse one catalog, compare the shops selling the exact same configuration, see each unit's condition, battery and real photos, and pay cash on delivery.
- **Shops** (partners) publish each physical unit they sell, paste an existing Facebook or Instagram post to fill the form automatically, and ship their orders. Each shop guarantees the units it sells.
- **Bonétat** admits only approved shops and moderates every offer before it goes live: legitimate, complete, posted by a vetted partner.

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router), React, TypeScript |
| Data | PostgreSQL, Prisma |
| UI | Tailwind CSS, Plus Jakarta Sans, Lucide icons |
| Images | sharp (resized once to 400, 800, 1600 px WebP), local disk or Cloudflare R2 |
| Catalog | Icecat (reference data and photos), Wikidata |
| Smart listing | Claude API (reads a pasted post or screenshots) |
| Tests | Vitest |

## Getting started

Requires **Node.js 18+** and a **PostgreSQL** database (local, Neon or Supabase).

```bash
npm install
cp .env.example .env      # then set DATABASE_URL
npx prisma generate
npx prisma db push        # create the tables
npm run db:seed           # demo data: catalog, shops, units, orders (wipes the database)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Sign-in is by phone number and a one-time code. In development, the code is printed in the server console.

| Account | Phone |
|---|---|
| Buyer | `+21644444444` |
| Shop (TechStore Sousse) | `+21611111111` |
| Shop awaiting approval | `+21633333333` |
| Admin | `+21600000000` |

## Environment

Only `DATABASE_URL` is needed to run the app locally. The rest unlocks specific features (see `.env.example`).

| Variables | Used for |
|---|---|
| `DATABASE_URL` | PostgreSQL connection |
| `NEXT_PUBLIC_APP_URL` | Absolute links (sitemap, social previews) |
| `ICECAT_*` | Catalog reference data and product photos |
| `ANTHROPIC_API_KEY` | Smart listing (reading a shop's post) |
| `STORAGE_DRIVER`, `R2_*`, `NEXT_PUBLIC_IMAGE_BASE_URL` | Storing images on Cloudflare R2 instead of the local disk |
| `SMS_*` | Sending sign-in codes by SMS |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (pure logic, no database needed) |
| `npm run db:seed` | Reset the database with demo data |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run catalog:reference` | Load the Icecat reference catalog |
| `npm run catalog:build` | Fill the catalog in advance (curated list, Icecat, Wikidata) |
| `npm run images:sync` | Attach official photos to every color of every model |
| `npm run listing:eval` | Run real shop posts through the smart listing |

## How the catalog works

| Level | Example | Holds |
|---|---|---|
| Product | iPhone 13 | Page, description, specs |
| Finish | Minuit | A color: name, hex, catalog photos |
| Variant | 128 Go, Minuit | Storage, RAM, version, color: only combinations that exist |
| Offer | one physical unit | Shop, condition, battery, price, the shop's own photos |

There is no stock quantity: three identical phones are three offers. On a product page, the buyer picks a configuration and condition, and sees every shop selling it; the buy box defaults to the best offer (`src/lib/configurator.ts`).

## Project layout

```
prisma/              schema and demo seed
public/brand/        logo, icons, home page photos
scripts/             catalog and photo jobs
src/app/(main)/      buyer site: home, catalog, product, cart, account
src/app/vendor/      shop space: publish, offers, orders
src/app/admin/       moderation: offers, shops, orders, catalog
src/app/api/         API routes
src/components/      shared UI
src/lib/             business logic: catalog, configurator, listing, images, orders
```

## Theming

Colors live as CSS variables in `src/app/globals.css`, one block per theme (main color and the logo's gradient). The active theme is one line in `src/lib/theme.ts`.
