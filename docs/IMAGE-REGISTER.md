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

Decided 2026-10-09 (final): **Open Icecat for every brand it covers.** Shooting the whole catalog ourselves doesn't scale.

| Source | Brands | Cost | Role |
| --- | --- | --- | --- |
| **Open Icecat** (free registration) | Samsung, Xiaomi, Lenovo, Dell, HP, Sony... | 0 DT | **Primary.** Fetched by the import script from an Icecat product ID. |
| **Illustration** (`DeviceArt`, already built) | Apple, and any color Icecat lacks | 0 DT | **Default fallback.** Drawn in the color's hex with an "Illustration" badge. Never broken. |
| **Own shoot, top Apple models only** | Apple | About 0 to 60 DT once | **Optional.** Only the 5 to 10 best-selling iPhones, if the illustration hurts conversion. |
| **Icecat paid tier** | Apple + everything | Paid | **Later.** When Apple sells enough that real photos are worth the subscription. |

**Do not use:** brand newsroom / press images (Apple, Samsung: editorial or non-commercial only), GSMArena, Back Market, Amazon, Google Images. Copyrighted, and scraping breaks their terms.

---

## 3. Step by step

Who does what: **[Kaa]** = manual curation. **[Code]** = something we build together in a session. Do them in this order.

### Step 0. Icecat account and license check [Kaa, 30 min]

1. Register free at icecat.biz (Open Icecat) and note your username: the import script needs it.
2. Read the Open Content License and write the answers in `DECISIONS.md`:
   - Can we **store copies** on our own storage (not hotlink)?
   - Can we **modify** them (resize, pad onto our background)?
   - Is **attribution** required ("Content by Icecat")? If yes, we add it to the footer.
   - Are any of our brands restricted?
3. Anything unclear: email Icecat with our use case and keep the reply.

### Step 1. Freeze the catalog list [Kaa, 2 to 3 h]

Before photos, decide **which products and colors exist**. Photos follow the list, not the other way round.

1. Start from what Tunisian partners actually sell. Ask your first 3 partners for their top 20 models. Their answers matter more than any ranking.
2. For each model, take the **official color names and storages** from the manufacturer's French site (apple.com/fr, samsung.com/fr). Facts like names and capacities aren't copyrighted. Write your own descriptions, never copy theirs.
3. Note real gaps: a color sold only in some storages goes in `colorStorages` in `prisma/seed.ts` (example already there: Galaxy A54 "Awesome Lime", 128 Go only).
4. For each color: French name, hex (pick it from an official photo with any color picker), family, English name as alias.

Target for launch: about 60 models, 4 colors on average, so **about 240 finishes**.

### Step 2. Storage [Built 2026-10-09; R2 account needed before launch]

`src/lib/storage.ts`. In dev, files go to `public/media/` on your machine: nothing to set up. Before launch:

1. **[Kaa]** Create a Cloudflare account, a bucket `bonetat-images`, and an API token with read/write on it.
2. **[Kaa]** Connect `img.bonetat.tn` to the bucket (or its `r2.dev` URL until the domain is on Cloudflare).
3. **[Kaa]** Set `STORAGE_DRIVER=r2`, `NEXT_PUBLIC_IMAGE_BASE_URL` and the `R2_*` variables (see `.env.example`). Re-run the imports once: same images, same names, now on R2.

### Step 3. The normalizer [Built 2026-10-09]

`src/lib/images.ts`: strips metadata, trims the white border, centers the device at 80 % on a **white** 1600 × 1600 square (Icecat images are cut out on white; any other background leaves halos), exports 400 / 800 / 1600 WebP and a blur placeholder, and names files by a hash of their pixels.

### Step 4. Optional: shoot the top Apple models [Kaa, only if needed]

Skip this until the illustration measurably hurts Apple sales. If you do it: a fixed rig (phone on a stand, taped spots, two identical lamps, plain paper background), all colors of one model in one session, FRONT / BACK / SIDE in that order, and borrow "Comme neuf" units from a partner. Files go in the drop folder (step 5) and follow the same import.

### Automatic sync [Built 2026-10-09]: the default way to fill photos

```
npm run images:sync                                  # every color without an Icecat link
npm run images:sync -- --product=samsung-galaxy-s23  # one product
npm run images:sync -- --dry-run                     # show the matches, change nothing
npm run images:sync -- --refresh-index               # re-download the Icecat index now
```

Needs `ICECAT_USERNAME`, `ICECAT_PASSWORD` (index download) and the tokens in `.env`. What it does:

1. **Index:** downloads the Open Icecat index once (281 MB, about 4 minutes), keeps our brands' usable rows (about 64,000) in `.cache/icecat/`, and refreshes it weekly or when a new brand enters the catalog.
2. **Model:** finds the index entries of each product. Rejects other models of the family (Ultra, Plus, FE, Pro, Digital, another generation, 2-in-1).
3. **Color:** reads each entry's color fields ("Couleur du produit = Noir", "Nom de la couleur = Phantom Black") and matches them to our color name, aliases, or a color family only one of our colors has.
4. **Certain match, official listing:** imports the gallery and puts the main image online as the front photo.
5. **Anything else becomes a suggestion** on the review screen, with a preview: unsure colors, and every **refurbished reseller listing** (often the only Apple source on the free tier). Those carry the reseller's branding on the screen ("TEQ CYCLE", "GRADE A"), so check the preview before clicking "Utiliser".
6. Every confirmed match teaches the color's manufacturer name as an alias, so the next model matches by itself.

First run on the demo catalog: 10 colors online automatically (Samsung, Dell, Lenovo, Nintendo), 21 suggestions (17 of them iPhones from refurbished listings), 20 not on the free Icecat (Google, Xiaomi, most Apple, some Samsung colors).

### Step 5 and 6. Import from the admin [Built 2026-10-09]

**Admin → Photos du catalogue → a product → each color has an Icecat field.**

1. Paste one of: the **manufacturer code** (`SM-S911BZKDEUB`, easiest: printed on the box, on the brand's site, and on Icecat), the **EAN barcode**, or the **Icecat ID**. If Icecat spells the brand differently, write `Brand:CODE`.
2. Click **Importer**. The toast shows Icecat's own title for the product: **read the color in it** (it ends with "Noir", "Vert"...). That's your check against a wrong mapping.
3. Up to 8 gallery images arrive as drafts. Icecat doesn't label angles, so the main image is guessed as Face, then Dos, Profil, Détail.

One code per color is enough: pick any storage, every storage looks the same.

### Step 7. Review [Built 2026-10-09]

Same screen. For each image: fix the angle in the dropdown, **Valider** (one image per angle goes live; validating another one swaps them), **Retirer** (back to draft) or **✕** (archive). "Basse résolution" means the source is under 800 px: prefer another image if the gallery has one.

### Step 8. Coverage view [Built 2026-10-09]

`/admin/catalog`: every product with its colors as swatches, green border = face + back validated, orange = face only, dotted = illustration. Sorted so products with **colors on sale but without a photo** come first. This is your to-do list for each session.

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
| Sync + review | 30 min | Run `npm run images:sync`, confirm the suggestions, add BACK / SIDE where useful |
| Manual codes | as needed | Paste a code only for colors the sync can't find |

**Numbers to hold:** 2 sessions a week covers every non-Apple color of a 60-model launch catalog in about 3 weeks. Check the coverage view every Sunday; the number to watch is **"colors with live offers but no photo"** (excluding Apple).

## 5. Failure modes to watch

1. **Icecat images vary in angle, crop and background** even after normalization. The review screen puts colors side by side; archive the odd one out and pick another image from the same Icecat gallery.
2. **License says no copies or no modification.** Then we'd have to hotlink Icecat's URLs unmodified, which breaks the uniform background. Check step 0 before building the import.
3. **Apple stays on illustrations.** Visible to buyers as "Illustration". Watch Apple conversion against Samsung; if it lags clearly, do step 4 for the top models.
4. **Wrong color mapping** (a "Graphite" Icecat ID under "Noir"). The review screen shows our hex swatch next to the photo.
