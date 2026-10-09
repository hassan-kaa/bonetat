"use client";

import Image from "next/image";
import type { DeviceKind } from "@prisma/client";
import DeviceArt from "./DeviceArt";
import { storedImageLoader } from "@/lib/image-url";

type Props = {
  /** Approved catalog FRONT photo key; null → illustration in the finish color */
  imageKey: string | null;
  kind: DeviceKind;
  colorHex: string;
  cameras: number | null;
  /** Illustration width in px (photos fill the parent instead) */
  artWidth: number;
  /** Tilt/offset applied to the illustration only, e.g. "translate-y-4 -rotate-6" */
  artClassName?: string;
  alt: string;
  /** next/image sizes hint for the photo */
  sizes: string;
};

/**
 * The small device picture used in cards, cart, checkout and orders: the Bonétat
 * catalog photo when one is approved, otherwise the house illustration.
 * Client component because next/image loaders are functions.
 */
export default function DeviceVisual({ imageKey, kind, colorHex, cameras, artWidth, artClassName, alt, sizes }: Props) {
  if (imageKey) {
    return (
      <span className="relative block h-full w-full">
        <Image loader={storedImageLoader} src={imageKey} alt={alt} fill sizes={sizes} className="object-contain p-[8%]" />
      </span>
    );
  }
  return (
    <span className={artClassName}>
      <DeviceArt kind={kind} color={colorHex} cameras={cameras} width={artWidth} title={alt} />
    </span>
  );
}
