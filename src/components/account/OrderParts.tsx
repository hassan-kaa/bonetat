import type { ConditionGrade, DeviceKind, OrderStatus } from "@prisma/client";
import DeviceVisual from "@/components/products/DeviceVisual";
import { GRADES } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STEPS, ORDER_STEP_LABELS, cn, formatShortDate } from "@/lib/utils";
import type { ShippingAddress } from "@/types";

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "DISPUTED") return null;
  const at = ORDER_STEPS.indexOf(status as (typeof ORDER_STEPS)[number]);
  return (
    <ol className="flex gap-2" aria-label="Avancement de la commande">
      {ORDER_STEP_LABELS.map((label, i) => {
        const done = i < at || status === "DELIVERED";
        const now = i === at && status !== "DELIVERED";
        return (
          <li key={label} className={cn("flex flex-1 flex-col gap-2 text-[13px]", done || now ? "text-ink" : "text-ink-muted")} aria-current={now ? "step" : undefined}>
            <span className={cn("h-1.5 rounded-full", done ? "bg-brand" : now ? "bg-[linear-gradient(90deg,theme(colors.brand.DEFAULT)_50%,theme(colors.line.strong)_50%)]" : "bg-line-strong")} />
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export type ItemView = {
  id: string;
  title: string;
  configLabel: string;
  grade: ConditionGrade;
  batteryHealth: number | null;
  priceMillimes: number;
  kind: DeviceKind;
  colorHex: string;
  imageKey: string | null;
  cameras: number | null;
};

export function OrderItemRow({ item }: { item: ItemView }) {
  return (
    <div className="flex flex-wrap items-center gap-[18px]">
      <span className="grid h-[76px] w-[76px] flex-none place-items-center overflow-hidden rounded-[20px] bg-brand-tint">
        <DeviceVisual
          imageKey={item.imageKey}
          kind={item.kind}
          colorHex={item.colorHex}
          cameras={item.cameras}
          artWidth={item.kind === "PHONE" ? 40 : item.kind === "LAPTOP" ? 62 : 42}
          artClassName={item.kind === "PHONE" ? "translate-y-3.5 -rotate-[8deg]" : undefined}
          alt={`${item.title}, ${item.configLabel}`}
          sizes="76px"
        />
      </span>
      <div className="min-w-0 flex-[1_1_200px]">
        <b className="text-base font-medium">{item.title}, {item.configLabel}</b>
        <p className="mt-1 text-sm text-ink-muted">
          {GRADES[item.grade].line}
          {item.batteryHealth ? `, batterie ${item.batteryHealth} %` : ""}, garantie 12 mois
        </p>
      </div>
      <b className="text-lg font-semibold">{formatPrice(item.priceMillimes)}</b>
    </div>
  );
}

export const orderItemInclude = {
  review: true,
  offer: {
    select: {
      variant: {
        select: {
          finish: { select: { hex: true, images: { where: { status: "APPROVED", angle: "FRONT" }, orderBy: { position: "asc" }, take: 1, select: { key: true } } } },
          product: { select: { kind: true, cameraCount: true, slug: true } },
        },
      },
    },
  },
} as const;

export function toItemView(i: {
  id: string; title: string; configLabel: string; grade: ConditionGrade; batteryHealth: number | null; priceMillimes: number;
  offer: { variant: { finish: { hex: string; images: { key: string }[] }; product: { kind: DeviceKind; cameraCount: number | null } } };
}): ItemView {
  return {
    id: i.id, title: i.title, configLabel: i.configLabel, grade: i.grade, batteryHealth: i.batteryHealth,
    priceMillimes: i.priceMillimes, kind: i.offer.variant.product.kind, colorHex: i.offer.variant.finish.hex,
    imageKey: i.offer.variant.finish.images[0]?.key ?? null, cameras: i.offer.variant.product.cameraCount,
  };
}

export function orderHeadline(status: string, address: ShippingAddress, deliveredAt: Date | null) {
  switch (status) {
    case "PENDING": return "Commande reçue, Bonétat va vous appeler";
    case "CONFIRMED": return "Confirmée, l’atelier prépare votre colis";
    case "SHIPPED": return `En route vers ${address.governorate}`;
    case "DELIVERED": return deliveredAt ? `Livrée le ${formatShortDate(deliveredAt)}` : "Livrée";
    case "CANCELLED": return "Commande annulée";
    default: return ORDER_STATUS_LABELS[status] ?? status;
  }
}
