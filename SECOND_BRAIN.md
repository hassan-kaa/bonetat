# 🧠 Bonétat — Project Second Brain

> **What this file is.** The single source of truth and living identity for the Bonétat project. It captures _why_ we're building, _what_ we're building, _how_, and _in what order_. Every major decision, assumption, and direction change gets recorded here. When in doubt, this file wins. Keep it updated as the project evolves — treat it like the project's memory.
>
> **How to use it.** Read top-to-bottom for full context. When you make a decision, update the relevant section **and** add a line to the [Changelog](#15-changelog). Anything still undecided lives in [Open Decisions](#13-open-decisions--assumptions) so it never gets silently forgotten.

|                      |                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------- |
| **Project codename** | Bonétat ("bon état" = _good condition_ 🇫🇷)                                            |
| **One-liner**        | A curated marketplace for refurbished & used smartphones and tech gadgets in Tunisia. |
| **Stage**            | Planning → MVP build                                                                  |
| **Builder**          | Solo technical founder                                                                |
| **Document version** | v0.2                                                                                  |
| **Last updated**     | 2026-06-30                                                                            |

---

## Table of Contents

1. [Vision & Mission](#1-vision--mission)
2. [Business Model](#2-business-model)
3. [Target Users & Personas](#3-target-users--personas)
4. [Value Proposition](#4-value-proposition)
5. [Market & Competitive Landscape](#5-market--competitive-landscape)
6. [Operations — Tunisia Specifics](#6-operations--tunisia-specifics)
7. [Monetization](#7-monetization)
8. [Product Scope (MVP & Beyond)](#8-product-scope-mvp--beyond)
9. [Technical Architecture](#9-technical-architecture)
10. [Design & Brand](#10-design--brand)
11. [Roadmap](#11-roadmap)
12. [Success Metrics / KPIs](#12-success-metrics--kpis)
13. [Open Decisions & Assumptions](#13-open-decisions--assumptions)
14. [Risks](#14-risks)
15. [Changelog](#15-changelog)

---

## 1. Vision & Mission

**Vision.** Become the trusted default destination in Tunisia for buying and selling refurbished and second-hand phones and tech gadgets — where "used" doesn't mean "risky."

**Mission.** Bring trust, transparency, and warranty to a market currently dominated by informal, unverified peer-to-peer sales. We do this by curating a small set of vetted, reputable stores and presenting their inventory through one clean, reliable storefront with consistent grading, fair pricing, and buyer protection.

**Why now.**

- High smartphone prices + import duties make new devices expensive relative to local incomes → strong demand for affordable, reliable used/refurbished devices.
- Existing channels (Facebook groups, Tayara, in-person souks) carry real fraud and quality risk → trust is the unsolved problem.
- No dominant, trust-first refurbished-tech brand exists locally → first-mover opportunity to own "trusted refurbished tech."

---

## 2. Business Model

**Model: Curated (managed) multi-vendor marketplace.**

This is the **Back Market model**, localized for Tunisia. We do **not** let anyone sell. We onboard a **limited, hand-picked set of trusted stores/refurbishers** ("vendors"). Buyers see a single unified storefront aggregating all vendor inventory and never have to evaluate seller trustworthiness themselves — Bonétat has already done that vetting.

**What makes it "curated marketplace" and not the alternatives:**

| Aspect              | Bonétat (curated marketplace) | Pure open marketplace (eBay/Tayara) | First-party reseller  |
| ------------------- | ----------------------------- | ----------------------------------- | --------------------- |
| Who sells           | Limited vetted vendors        | Anyone                              | Only us               |
| Inventory ownership | Vendors own stock             | Sellers own stock                   | We own stock          |
| Trust mechanism     | We vet + enforce standards    | Buyer beware / ratings              | We control everything |
| Scalability         | High (vendors scale supply)   | High but noisy                      | Low (capital-heavy)   |
| Capital needed      | Low–medium                    | Low                                 | High                  |

**Core promise to buyers:** every listing comes from a vetted vendor, with a defined condition grade and a minimum warranty.

**Core promise to vendors:** more visibility and qualified buyers on top of their existing audience (esp. Instagram pages), plus a real catalog + checkout that removes manual social-selling friction — in exchange for a commission and adherence to our standards.

**Key operating decisions baked into the model:**

- **Single unified checkout** (buyer can buy from multiple vendors in one cart — phase 2) vs. per-vendor checkout (phase 1). → see [Open Decisions](#13-open-decisions--assumptions).
- **Standardized condition grading** owned by Bonétat (e.g., _Comme neuf / Très bon / Bon / Correct_), applied consistently across all vendors — this is the heart of the trust layer.
- **Minimum warranty floor** set by Bonétat (e.g., 3, 6, or 12 months) that all vendors must honor.

---

## 3. Target Users & Personas

**Buyers**

- **Budget-conscious student / young professional (primary).** Wants a recent flagship at 40–60% off retail without getting scammed. Mobile-first, price-sensitive, distrusts informal sellers. Pays via cash-on-delivery.
- **Practical upgrader.** Has a working phone, wants a better one cheaply; will trade in / sell their old device. Cares about warranty and return policy.
- **Gift buyer / parent.** Buying for a family member; trust and "does it just work" matter more than spec-chasing.

**Vendors (supply side)** — primarily **established Instagram reseller pages**

- **Instagram reseller page (primary vendor).** Already sells phones/gadgets to a large, engaged following; trust is *already established* via follower count and social proof. Pain: selling is manual (DMs, comments), buyers must hop page-to-page to compare, and there's no real catalog/checkout. Wants more visibility and easier selling **without abandoning their existing page/business**.
- **Established refurbisher / phone shop.** Sells refurbished stock locally or via social; wants more reach and an online catalog. Has volume but no real storefront.
- **Specialized electronics store.** Sells accessories, gadgets, maybe open-box items; wants an additional sales channel.

**Internal**

- **Bonétat operator/admin (you).** Vets vendors, enforces grading & warranty, manages disputes, monitors quality, curates catalog.

---

## 4. Value Proposition

**For buyers:** _"Buy used tech without the fear."_ Vetted vendors, honest condition grades, a real warranty, buyer protection on payment/delivery, and prices well below new — all in one trustworthy place.

**For vendors (esp. Instagram pages):** _"Keep your page, sell more, with way less friction."_ Bonétat doesn't replace their existing business — it adds a real catalog, search, and checkout on top of it, plus extra visibility by sitting in an aggregated storefront buyers actively browse. They bring their trust and following; we remove the manual DM/comment selling and the page-hopping friction for buyers.

**For buyers:** instead of following and scrolling dozens of separate Instagram pages, everything is gathered, searchable, comparable, and buyable in one trusted place.

**Defensibility / moat (over time):** aggregated supply (the more vendor pages on board, the more useful Bonétat is — a marketplace network effect) + the trust brand + accumulated review data + a consistent grading standard. Hard to copy because aggregation + trust compound.

---

## 5. Market & Competitive Landscape

> ⚠️ **Assumption flag:** the competitor notes below are from general knowledge and need a fresh market-research pass (pricing, traffic, weaknesses) before strategy is finalized. See [Open Decisions](#13-open-decisions--assumptions).

**Adjacent / competing channels in Tunisia:**

- **Instagram pages** — dominant general . Huge audience, trust is already established because of the huge followers number, but users need to navigate from page to page to filter and pick one, we offer these pages more visibility alongside their regular work , and we offer the buyer a gathering of all these pages and their products
- **Facebook Marketplace / Groups** — massive informal volume, high fraud risk, no protection, C2C directly
- **Mytek / Tunisianet** — established new-electronics retailers with strong logistics and credibility, but focused on **new** products. _Potential future competitor if they enter refurbished; potential vendor/partner too._
- **Independent phone shops & souks** — fragmented offline supply; these are our **vendor pipeline**, not just competitors.

**Positioning statement:** _Bonétat is to refurbished tech in Tunisia what Back Market is to Europe — the trusted, curated home for second-hand devices, sitting between untrustworthy classifieds and overpriced new-retail._

---

## 6. Operations — Tunisia Specifics

This is where a generic marketplace template fails. Tunisia has its own payment, delivery, language, and legal realities.

**Payments**

- **Cash on Delivery (COD) is king.** The majority of Tunisian e-commerce is COD due to low card penetration and trust habits. **COD must be a first-class, day-one payment method.** Plan for COD-specific risks: failed deliveries, cash handling, higher return rates.
- **Local online payment gateways to evaluate:** Flouci, Konnect, Clictopay (SMT / Société Monétique Tunisie), e-DINAR (La Poste). International cards are rare; Stripe/PayPal are **not** generally usable for local TND collection. and this is not common to use when making big transactions (like buying a phone or tablet) . so COD is king.
- **Currency:** Tunisian Dinar (TND), 3 decimal places (millimes). Price formatting and money math must respect 3-decimal precision.

**Delivery / Logistics**

- Third-party couriers commonly used: **Aramex, First Delivery, Intigo, others.** Decide between integrating a courier API vs. manual dispatch in MVP.
- COD reconciliation: courier collects cash → remits to platform/vendor → commission settled. This cash flow needs an explicit ledger design.

**Language & Localization**

- Primary languages: **French and Arabic** (Tunisian Arabic in tone; MSA/French for formal copy). English optional/secondary.
- **RTL support required** for Arabic. Plan i18n from the start — retrofitting RTL is painful.
- Cultural copy: pricing in TND, local trust signals (warranty, "paiement à la livraison"), phone-number-based identity.

**Identity & Trust**

- Phone number is the primary identity anchor (not email). SMS/OTP login likely preferred over email/password.

## 7. Monetization

**Primary: commission per sale.** A % take rate on each transaction (Back Market-style). Likely tiered by category/margin. Target a rate that vendors accept because Bonétat brings them buyers they couldn't reach alone.

**Secondary / future revenue streams:**

- **Featured listings / promoted placement** for vendors.
- **Trade-in program** — buy devices from consumers (directly or via vendors), creating a sourcing funnel and a margin opportunity.
- **Accessories & add-ons** attach at checkout.

**Unit economics to model (placeholder — fill in):**

- Average order value (AOV): _TBD_
- Take rate: _TBD %_
- Payment + delivery cost per order: _TBD_

---

## 8. Product Scope (MVP & Beyond)

**MVP principle:** ship the smallest thing that proves _buyers will trust and buy, and vendors will list._ Resist feature creep. Trust + browse + buy + deliver is the loop.

### MVP — Buyer side

- Browse / search / filter catalog (by category, brand, model, condition grade, price, storage, etc.).
- Product detail page with: photos, **condition grade (Bonétat standard)**, warranty terms, vendor name + trust badge, price in TND.
- Cart + checkout with **COD** and at least one online gateway.
- Order tracking (basic statuses).
- Account via phone/OTP.
- Reviews/ratings (post-purchase) — core to trust flywheel.

### MVP — Vendor side

- Vendor onboarding/application (gated; you approve).
- Vendor dashboard: add/edit listings, manage stock, view orders, mark fulfilled.
- Enforced fields: condition grade, warranty, accurate specs, photos.

### MVP — Admin (you)

- Vendor vetting & approval.
- Catalog/listing moderation (enforce grading & quality).
- Order overview, dispute handling.
- Commission/settlement tracking (even if semi-manual at first).

### Post-MVP / Later

- Unified multi-vendor cart & checkout.
- comparison and advising feature for buyers with AI.
- Native mobile app (after mobile-web validated).
- Vendor performance scoring & auto-ranking.
- Loyalty / referral program.

---

## 9. Technical Architecture

**Frontend & Backend**

- **Next.js (App Router) + TypeScript** — full-stack React; SSR/SEO matters for a marketplace (Google is a key acquisition channel).
- **Tailwind CSS** + a component lib (shadcn/ui) for fast, consistent UI.
- **next-intl** (or similar) for **FR/AR i18n + RTL** from day one.

**Data & Backend services**

- **PostgreSQL** as primary DB.
- **Prisma** ORM (type-safe, fast iteration).
- Option to use **Supabase** (Postgres + auth + storage + RLS) to compress infra work for a solo founder — strong default. Alternative: self-managed Postgres + custom auth.
- **Object storage** for product images (Supabase Storage / S3-compatible / Cloudflare R2).

**Auth**

- **Phone/OTP-first** (SMS). Evaluate local SMS providers for Tunisia deliverability. Email as secondary.

**Payments**

- Abstraction layer over: **COD (internal), Flouci, Konnect, Clictopay**. Design a `PaymentProvider` interface so providers are pluggable.

**Infra / Hosting**

- **Vercel** (Next.js) for app; **Supabase / Railway / Neon** for DB. Reassess latency to Tunisian users and data-residency/legal needs.
- **Cloudflare** in front (CDN, caching, image optimization) — also helps regional performance.

**Proposed core data model (first cut):**

```
User        (id, phone, name, role[buyer|vendor|admin], created_at, ...)
Vendor      (id, user_id, store_name, status[pending|approved|suspended], kyc_*, rating, ...)
Category    (id, name_fr, name_ar, parent_id, ...)
Product     (id, vendor_id, category_id, brand, model, title, description,
             condition_grade, warranty_months, price_millimes, stock_qty,
             specs_json, status, ...)
ProductImage(id, product_id, url, position)
Order       (id, buyer_id, status, payment_method, total_millimes,
             shipping_address, courier, cod_flag, created_at, ...)
OrderItem   (id, order_id, product_id, vendor_id, qty, price_millimes,
             commission_millimes, ...)
Review      (id, order_item_id, buyer_id, vendor_id, rating, comment, ...)
Payout      (id, vendor_id, period, gross, commission, net, status, ...)
```

**Cross-cutting requirements baked in early:** TND/millime money handling (integer millimes, never floats), RTL/i18n, mobile-first responsive, SEO (server-rendered PDPs + structured data), image optimization, audit log for orders/payouts.

---

## 10. Design & Brand

**Brand essence:** _Trustworthy, modern, accessible, honest._ The opposite of a sketchy Facebook listing.

**Name:** Bonétat — from _"bon état"_ (good condition). Reinforces the core promise in the name itself.

**Brand pillars:**

- **Trust over hype** — clarity, transparency, real warranties.
- **Affordable, not cheap-feeling** — premium UX even for budget products.
- **Local & familiar** — TND, FR/AR, COD, Tunisian tone.

**UX principles:**

- **Mobile-first** — most buyers are on phones.
- **Trust signals everywhere** — condition grade, warranty badge, vendor rating, "paiement à la livraison," return policy, secure-checkout cues.
- **Honest product pages** — real photos, no spec ambiguity, grade explained in plain language.
- **Low-friction checkout** — phone/OTP, COD default, minimal form fields.

**To define later:** logo, color palette, typography (must support Arabic well), condition-grade visual system, design tokens / design system. → [Open Decisions](#13-open-decisions--assumptions).

---

## 11. Roadmap

> Phased so each stage de-risks the next. Don't build phase N+1 until phase N's assumption is validated.

**Phase 0 — Foundation & Validation (now)**

- ✅ This second-brain document.
- Market research pass (competitors, pricing, demand signals).
- Vendor discovery: identify & talk to 3–5 candidate **Instagram reseller pages** (and a couple of shops). Pitch: more visibility + a real catalog/checkout on top of their page. _Supply is the hardest part — validate it early._
- Define the **Bonétat condition-grading standard** and **warranty floor** (the trust spec).
- Confirm payment + delivery + legal approach (talk to a local advisor).
- Lock the tech stack & open decisions.

**Phase 1 — MVP Build**

- Buyer storefront (browse/search/PDP/checkout w/ COD + 1 gateway).
- Vendor onboarding + dashboard.
- Admin vetting + moderation + basic order/commission tracking.
- FR/AR + RTL, mobile-first, phone/OTP auth.
- Onboard first 1–3 vendors with real inventory.

**Phase 2 — Trust & Growth**

- Reviews flywheel, vendor ratings, buyer protection.
- Courier integration + COD reconciliation ledger.
- SEO + acquisition channels, promoted listings.
- Unified multi-vendor cart.

**Phase 3 — Expansion**

- Trade-in program, extended warranties, accessories attach.
- Native mobile app.
- More vendors, more categories, vendor performance scoring.

---

## 12. Success Metrics / KPIs

**North Star (candidate):** number of _trusted, completed_ transactions per month (purchase delivered + accepted, no dispute).

**Marketplace health:**

- GMV (gross merchandise value, TND).
- Take rate & net revenue.
- AOV, conversion rate, cart abandonment.
- COD failure / return rate (critical in Tunisia).

**Supply (vendors):**

- # active vetted vendors, # live listings.
- Listing quality / grading-accuracy (dispute rate per vendor).
- Vendor retention.

**Trust (the whole point):**

- Buyer repeat rate, NPS / review scores.
- Dispute rate & resolution time.
- % orders with warranty honored without issue.

---

## 13. Open Decisions & Assumptions

> Anything unresolved lives here so it's never silently forgotten. Move items to the relevant section + Changelog once decided.

**Resolved 2026-08-05** (details in `REBIRTH.md`): launch model = full marketplace with on-platform COD checkout; revenue = commission per sale (0% pilot → 5–7%); timeline = quality/milestone-driven; codebase = keep and evolve, no rewrite.

**Decisions still open:** 2. **Checkout model** — per-vendor checkout (simpler MVP) vs. unified multi-vendor cart (better UX, later). 3. **Seller of record** for warranty/returns — Bonétat vs. vendor (leaning: vendor is seller-of-record, Bonétat guarantees the standard). 4. **Online payment gateway(s)** to launch with (Flouci / Konnect / Clictopay) + COD — COD-only acceptable for pilot. 7. **Condition-grading standard** — exact grades, definitions, who inspects/verifies (draft doc is an M2 deliverable in REBIRTH.md).

**Working assumptions (validated):**

- COD will be the dominant payment method and must be day-one.
- Supply (vendor onboarding) is the hardest constraint, not demand.
- Mobile-first; most traffic on phones.
- FR + AR with RTL required.

---

## 14. Risks

- **Supply cold-start.** No vendors → no inventory → no buyers. _Mitigation: secure 1–3 vendors before building much; treat vendor relationships as priority #1._
- **Trust failures.** A few bad orders can destroy the trust brand we're selling. _Mitigation: strict vetting, grading enforcement, fast dispute resolution, warranty floor._
- **COD economics.** High return/failed-delivery rates erode margin and tie up stock. _Mitigation: address verification, deposits for high-value items, courier SLAs, buyer reliability scoring._
- **Payment/legal complexity.** Local gateways + regulation are non-trivial. _Mitigation: launch COD + one gateway; consult a local advisor early._
- **Incumbent response.** A Mytek/Tunisianet refurbished push, or large Instagram pages building their own checkout. _Mitigation: own the aggregation + trust niche fast; make Bonétat more valuable than any single page via network effects + review/data moat._
- **Vendor disintermediation.** Since vendors already own their audience, they may take buyers off-platform to dodge commission. _Mitigation: make on-platform selling genuinely easier (catalog, checkout, COD handling), and tie buyer protection/reviews to staying on Bonétat._
- **Solo-founder bandwidth.** One person across product, ops, vendor relations, support. _Mitigation: ruthless MVP scope, automate/semi-automate ops, lean stack (Supabase)._

---

## 15. Changelog

| Date       | Version | Change                                                                                                                                                                                                                                                                                          |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-30 | v0.1    | Initial second-brain created. Business model defined as curated multi-vendor marketplace (Back Market model). Captured vision, personas, value prop, Tunisia ops (COD/FR-AR/couriers), monetization, MVP scope, proposed tech stack, design/brand, phased roadmap, KPIs, open decisions, risks. |
| 2026-08-06 | v0.4    | **Back Market pivot.** Product architecture moved from per-listing pages to **Device + Offers**: one page per canonical device with grade/storage/color pickers and a cheapest-offer buy box; vendors compete on price. Vendor visibility reduced to "name + rating" on the buy box (no store pages, no Instagram links) to prevent disintermediation. Bonétat owns the device catalog; vendors publish offers in <2 min with enforced battery-per-grade floors. Full implementation in code (schema, catalog, PDP, cart/checkout/orders, vendor + admin flows, seed). See REBIRTH.md §1/1bis. |
| 2026-08-05 | v0.3    | **Project rebirth.** Locked core decisions: full-marketplace launch (on-platform COD checkout), commission revenue (0% pilot → 5–7%), milestone-driven timeline, keep existing codebase. Created `REBIRTH.md` as the execution plan (gap analysis, cold-start strategy, enhancement plan, vendor pitch kit, M1–M4 milestones). |
| 2026-06-30 | v0.2    | Incorporated founder edits. **Key shift: Instagram reseller pages identified as the core supply pipeline + competitive frame** — they already hold trust via following, so Bonétat's wedge is aggregation, discovery, and reduced selling/buying friction, not lending trust. Realigned vendor persona, value prop, business-model promise, roadmap vendor-discovery, and risks (added a vendor-disintermediation risk). Reinforced COD as king for big-ticket items. Founder trimmed open decisions (brand/stack treated as settled) and some secondary monetization/post-MVP items; added AI comparison/advisor as a post-MVP feature. |

---

> **Maintenance ritual:** at the end of any meaningful work session, update the affected section, move any resolved item out of Open Decisions, and add a Changelog row. This file is the project's identity — keep it alive.
