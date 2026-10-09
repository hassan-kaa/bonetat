# Image register: curation blueprint (free tier)

How to fill Bonétat's catalog photos without paying, and the exact steps to build the register.
Spec and decisions: `REBIRTH.md` section 1quater. Code: `prisma/schema.prisma` (`Finish`, `CatalogImage`, `OfferPhoto`), `src/lib/image-url.ts`.

---

## 1. The register in one picture

```
Product   iPhone 13 Pro
  └─ Finish   Bleu alpin  (hex #9DB5CE, family BLUE, aliases ["Sierra Blue"])
        ├─ CatalogImage  FRONT   ← required, shown on cards and as the main photo
        ├─ CatalogImage  BACK    ← strongly recommended
        ├─ CatalogImage  SIDE    ← optional
        └─ Variants  128 Go / 256 Go / ...  (no photos of their own: same look)
```

- **One photo set per color, not per storage.** A 128 Go and a 256 Go look identical.
- **Only `APPROVED` images are shown.** Everything enters as `DRAFT` and you approve it.
- **Missing FRONT photo = drawing.** The site shows the `DeviceArt` illustration in the color's hex, with an "Illustration" badge. Nothing ever breaks, so you can curate gradually.

---

## 2. Where the photos come from (free)

Decided 2026-10-09: Icecat didn't work out, and no free licensed alternative exists (brand newsrooms like Samsung Mobile Press are non-commercial only). So **we shoot our own photos for every brand**, and use official images only where we hold **written permission**.

| Source | Brands | Cost | Role |
| --- | --- | --- | --- |
| **Own shoot on partner units** | All | About 0 to 60 DT once (paper, lamps or a folding light box) | **Primary.** Fully ours, consistent, and unique to Bonétat (better for Google than the same press image every shop uses). |
| **Written permission from Tunisian distributors** (official Samsung, Xiaomi, Lenovo... importers) | Whatever they agree to | 0 DT | **Accelerator.** Distributors already hand image packs to their resellers. An email reply saying "yes, for your listings" is your license. Keep it. |

**Do not use:** brand newsroom / press images (Apple, Samsung: editorial or non-commercial only), GSMArena, Back Market, Amazon, Google Images, Wikimedia Commons (legal but inconsistent).

**What would flip this:** if shooting stays under about 15 colors a week for a month, budget for a paid image feed (Icecat Full or similar) after launch.

---

## 3. Step by step

Who does what: **[Kaa]** = manual curation. **[Code]** = something we build together in a session. Do them in this order.

### Step 0. Ask distributors for permission [Kaa, 1 h, in parallel with everything else]

1. List the official importers / distributors in Tunisia for each brand you carry (your partners know them; they buy from them).
2. Send one short email each (template below). Ask for their reseller image pack and written permission to show it on Bonétat listings, resized and on our background.
3. File every "yes" in `DECISIONS.md` with the date and the scope (which brands, which uses). No written yes = we shoot.

> Bonjour, Bonétat est une place de marché tunisienne d'appareils reconditionnés, vendus par des ateliers partenaires agréés. Nous souhaitons afficher les visuels officiels [marque] sur nos fiches produit, redimensionnés sur notre fond neutre, sans modification de l'appareil. Pourriez-vous nous transmettre votre pack visuels revendeurs et nous confirmer par écrit cette autorisation ? Merci.

### Step 1. Freeze the catalog list [Kaa, 2 to 3 h]

Before photos, decide **which products and colors exist**. Photos follow the list, not the other way round.

1. Start from what Tunisian partners actually sell. Ask your first 3 partners for their top 20 models. Their answers matter more than any ranking.
2. For each model, take the **official color names and storages** from the manufacturer's French site (apple.com/fr, samsung.com/fr). Facts like names and capacities aren't copyrighted. Write your own descriptions, never copy theirs.
3. Note real gaps: a color sold only in some storages goes in `colorStorages` in `prisma/seed.ts` (example already there: Galaxy A54 "Awesome Lime", 128 Go only).
4. For each color: French name, hex (pick it from an official photo with any color picker), family, English name as alias.

Target for launch: about 60 models, 4 colors on average, so **about 240 finishes**.

### Step 2. Storage on Cloudflare R2 [Code, 1 session]

Free tier (check the current numbers on Cloudflare's pricing page): about 10 GB of storage and no fees for bandwidth. 240 finishes × 3 angles × 3 sizes at about 80 KB is about 170 MB, far below the limit.

1. **[Kaa]** Create a Cloudflare account, create a bucket `bonetat-images`, create an API token with read/write on that bucket.
2. **[Kaa]** Until `bonetat.tn` is on Cloudflare, enable the bucket's `r2.dev` public URL (fine for dev, rate-limited). At launch, connect `img.bonetat.tn` instead.
3. **[Code]** Add to `.env`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `NEXT_PUBLIC_IMAGE_BASE_URL`.
4. **[Code]** `src/lib/storage.ts`: upload a file, create a presigned upload URL (for partner photos later). Uses the S3-compatible SDK (`@aws-sdk/client-s3`), because R2 speaks the S3 protocol.

### Step 3. The normalizer [Code, same session]

`src/lib/images.ts`, built on `sharp` (the standard Node image library). Every image, from any source, goes through it once:

1. Auto-rotate from camera metadata, then **strip all metadata** (EXIF: GPS location, phone owner).
2. Trim the empty border around the device.
3. Fit the device into the center of a 1600 × 1600 canvas, device height about 80 % of the frame, background `#F2F4F7`.
4. Export WebP at 400, 800 and 1600 px, plus a tiny blurred placeholder.
5. Name the files by a hash of their content: `catalog/<product>/<finish>/<hash>-800.webp`. Same image = same name; a new image = a new name. That's why the CDN can cache forever.

### Step 4. Shoot setup [Kaa, 1 h to build once]

The goal is that photo #200 looks like photo #1. Consistency comes from a fixed rig, not from talent.

**Make it portable.** The devices are at the partners', so bring the rig to them: a folding light box (or two lamps + a roll of paper) fits in a bag. One visit to a partner's shop covers every model and color they have in "Comme neuf". Ask for it during onboarding: "15 minutes to photograph your best units, and your listings look better from day one."

- **Place:** a table next to a window with indirect daylight (no direct sun), or 2 desk lamps with the same bulbs at 45° on each side.
- **Background:** a large sheet of matte white or light grey paper curved from the wall to the table (no corner line). The normalizer replaces the background anyway, so a clean edge matters more than the exact color.
- **Camera:** your phone on a fixed stand (a tripod or a stack of books), **never handheld**. Mark the stand's spot and the device's spot on the table with tape.
- **Settings:** lock focus and exposure (long-press on the screen), no zoom, 1x lens, no portrait mode, no filter.
- **Device:** clean, screen off for FRONT (or a plain black wallpaper), no case, no screen protector glare.
- **Angles:** FRONT (screen facing camera), BACK, SIDE (left edge, 3/4 view). Same order every time.
- **Background removal:** `rembg` (free, open-source, runs on your laptop) cuts the device out; the import script runs it for you.

### Step 5. The drop folder [Kaa, ongoing]

Everything to import lands in one folder, named so the script knows exactly where it goes:

```
catalog-src/
  iphone-13-pro/
    bleu-alpin/
      front.jpg
      back.jpg
      side.jpg
    graphite/
      front.jpg
  samsung-galaxy-s23/
    noir-fantome/
      front.png         ← a distributor pack image works the same way
```

- Folder names = product slug and finish slug from the database (the admin screen will show them).
- File names = the angle. Anything else is ignored.
- Shoot straight into the right folder name (or rename right after the session), never later from memory.
- `catalog-src/` stays out of git (raw files are big). Keep a backup copy on a drive.

### Step 6. The import script [Code, 1 session]

`npm run images:import [product-slug]`:

1. Reads `catalog-src/`, folder by folder.
2. Checks that the product and finish exist; otherwise it stops with a clear message (a typo never creates a phantom color).
3. Runs `rembg` (background removal) when the image isn't already a transparent cut-out, then the normalizer.
4. Uploads to R2, creates `CatalogImage` rows as `DRAFT` with `source` (OWN_SHOOT, or PRESS_KIT for a distributor pack) and `sourceRef` (file name, or the permission reference).
5. Skips images already imported (same content hash), so you can rerun it safely.
6. Prints a summary: imported, skipped, errors.

### Step 7. Review screen [Code, 1 session]

`/admin/catalog/[product]`, one row per color, one column per angle:

- Approve, reject (archive) or swap an image. Only approved images go live.
- Edit the color's name, hex, family, aliases.
- Review side by side with the other colors of the same product, so mismatched framing jumps out.

### Step 8. Coverage view [Code, small]

`/admin/catalog`: every product with its colors, marked **complete** (FRONT + BACK approved), **partial**, or **illustration**. Sorted by demand: colors with live offers and no photo first. This is your to-do list for each curation session.

### Step 9. Partner unit photos [Code, 1 session, after step 2]

Separate from the register, but it uses the same storage and normalizer (without the background replacement: unit photos stay as taken).

- Publish flow gets a step "Photos de l'appareil": 1 required, 3 max, uploaded straight from the partner's phone to R2 (presigned URL), then processed server-side (rotate, strip location metadata, resize).
- Product page shows them under the gallery for the unit in the buy box: "Photos de l'appareil que vous recevrez".
- Admin moderation shows them. Check one thing: **nothing reveals the shop** (logo, branded mat, receipt, sticker). Partners are hidden from buyers.
- Reused photos across a partner's offers get flagged in moderation (image fingerprint), not blocked.

---

## 4. Working rhythm

| Session | Length | Output |
| --- | --- | --- |
| Shoot at a partner | 2 h | About 15 to 20 colors × 3 angles (one model at a time, all its colors in a row) |
| Import + review | 45 min | Run the import, approve everything from the week, fix rejects |
| Distributor follow-up | 15 min | Chase pending permission emails, file the yeses |

**Numbers to hold:** 2 shoots a week gives about 240 finishes in 6 to 8 weeks, less with every distributor pack you get. Prioritise by the coverage view, not by what's easy to shoot. Check the coverage view every Sunday; the number to watch is **"colors with live offers but no photo"**. Keep it at 0 for the top 20 models before launch.

---

## 5. Failure modes to watch

1. **Shooting is slower than planned.** Partners can't host you, or devices rotate fast. Count it every Sunday; under 15 colors a week for a month means budgeting a paid feed after launch.
2. **Inconsistent shots** (different light, angle drift). Prevent it with the taped rig and by shooting all colors of one model in one session; catch it on the review screen, where colors sit side by side.
3. **A color is never in a partner's hands.** It stays on the illustration, visible to buyers as "Illustration". Ask the next partner who lists it, or the distributor.
4. **Wrong color label** (a "Graphite" photo filed under "Noir"). The import refuses unknown folders, and the review screen shows the hex swatch next to the photo.
