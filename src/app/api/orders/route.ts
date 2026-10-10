import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcCommission, formatPrice } from "@/lib/money";
import { SHIPPING_FEE_MILLIMES, displayName, variantLabel } from "@/lib/catalog";
import { addressSchema } from "@/lib/validation";
import { newOrderNumber } from "@/lib/orders";
import { adminIds, notify, vendorUserIds } from "@/lib/notify";

const shippingSchema = addressSchema.omit({ isDefault: true }).extend({ label: z.string().trim().min(1).max(40).default("Maison") });

const schema = z
  .object({
    items: z.array(z.object({ offerId: z.string(), priceMillimes: z.number().int().positive() })).min(1).max(20)
      .refine((items) => new Set(items.map((i) => i.offerId)).size === items.length, { message: "Article en double dans le panier" }),
    addressId: z.string().optional(),
    address: shippingSchema.optional(),
    saveAddress: z.boolean().optional(),
    notes: z.string().max(500).optional(),
    paymentMethod: z.literal("COD"),
  })
  .refine((d) => d.addressId || d.address, { message: "Choisissez une adresse de livraison" });

class OrderError extends Error {}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Connectez-vous pour commander" }, { status: 401 });

    const data = schema.parse(await req.json());

    // Address: a saved one (must belong to the buyer) or a new one
    let shipping: z.infer<typeof shippingSchema>;
    if (data.addressId) {
      const a = await prisma.address.findFirst({ where: { id: data.addressId, userId: user.id } });
      if (!a) return NextResponse.json({ error: "Adresse introuvable" }, { status: 400 });
      shipping = { label: a.label, fullName: a.fullName, phone: a.phone, governorate: a.governorate, delegation: a.delegation, line: a.line, notes: a.notes };
    } else {
      shipping = data.address!;
    }

    const offers = await prisma.offer.findMany({
      where: { id: { in: data.items.map((i) => i.offerId) }, status: "ACTIVE", vendor: { status: "APPROVED" } },
      include: { variant: { include: { product: true, finish: true } } },
    });
    const byId = new Map(offers.map((o) => [o.id, o]));

    // Server prices are authoritative; tell the buyer if anything moved since they added it
    for (const item of data.items) {
      const o = byId.get(item.offerId);
      if (!o) {
        return NextResponse.json({ error: "Un article de votre panier vient d’être vendu. Retournez au panier pour le mettre à jour." }, { status: 409 });
      }
      if (o.priceMillimes !== item.priceMillimes) {
        return NextResponse.json(
          { error: `Le prix de ${displayName(o.variant.product)} est maintenant de ${formatPrice(o.priceMillimes)}. Retournez au panier pour confirmer.` },
          { status: 409 }
        );
      }
    }

    const subtotal = data.items.reduce((s, i) => s + byId.get(i.offerId)!.priceMillimes, 0);

    const order = await prisma.$transaction(async (tx) => {
      // Reserve each unit atomically: only one buyer can move it from ACTIVE to SOLD
      for (const item of data.items) {
        const res = await tx.offer.updateMany({
          where: { id: item.offerId, status: "ACTIVE" },
          data: { status: "SOLD" },
        });
        if (res.count !== 1) throw new OrderError("Un article de votre panier vient d’être vendu. Retournez au panier pour le mettre à jour.");
      }

      if (data.address && data.saveAddress) {
        const count = await tx.address.count({ where: { userId: user.id } });
        await tx.address.create({ data: { ...shipping, userId: user.id, isDefault: count === 0 } });
      }

      return tx.order.create({
        data: {
          number: await newOrderNumber(tx),
          buyerId: user.id,
          paymentMethod: "COD",
          totalMillimes: subtotal + SHIPPING_FEE_MILLIMES,
          shippingFeeMillimes: SHIPPING_FEE_MILLIMES,
          shippingAddress: shipping,
          notes: data.notes,
          items: {
            create: data.items.map((item) => {
              const o = byId.get(item.offerId)!;
              const p = o.variant.product;
              return {
                offerId: o.id,
                vendorId: o.vendorId,
                priceMillimes: o.priceMillimes,
                commissionMillimes: calcCommission(o.priceMillimes),
                title: displayName(p),
                configLabel: variantLabel(o.variant, p.kind),
                grade: o.conditionGrade,
                batteryHealth: o.batteryHealth,
                warrantyMonths: o.warrantyMonths,
              };
            }),
          },
        },
      });
    });

    const shops = [...new Set(offers.map((o) => o.vendorId))];
    await notify([user.id], { title: `Commande ${order.number} reçue : Bonétat vous appelle pour confirmer`, href: `/account/orders/${order.id}` });
    await notify(await vendorUserIds(shops), { title: `Nouvelle commande ${order.number} : en attente de confirmation`, href: "/vendor/orders" });
    await notify(await adminIds(), { title: `Nouvelle commande ${order.number} à confirmer`, href: "/admin/orders" });
    return NextResponse.json({ success: true, orderId: order.id, number: order.number });
  } catch (err) {
    if (err instanceof OrderError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur, réessayez dans un instant" }, { status: 500 });
  }
}
