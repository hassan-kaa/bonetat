import type { DeviceKind } from "@prisma/client";

type Props = {
  kind: DeviceKind;
  color: string;
  /** Rear cameras, phones only (2 or 3 changes the module) */
  cameras?: number | null;
  /** Rendered width in px; height follows the device's proportions */
  width: number;
  className?: string;
  title?: string;
};

/**
 * Bonétat's house illustration of a device, tinted with the variant's color.
 * Used until studio photos exist, and on purpose for small sizes (cards, rings).
 */
export default function DeviceArt({ kind, color, cameras, width, className, title }: Props) {
  const label = title ?? "Illustration de l’appareil";
  switch (kind) {
    case "PHONE":
      return cameras && cameras >= 3 ? (
        <svg viewBox="0 0 300 600" width={width} height={width * 2} className={className} role="img" aria-label={label}>
          <PhoneBody color={color} />
          <rect x="28" y="28" width="132" height="132" rx="36" fill="#000" fillOpacity=".16" />
          <rect x="28" y="28" width="132" height="132" rx="36" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1.5" />
          <Lens cx={63} cy={63} />
          <Lens cx={63} cy={126} />
          <Lens cx={124} cy={95} />
          <circle cx="128" cy="47" r="7" fill="#F4EBD2" fillOpacity=".9" />
          <circle cx="128" cy="141" r="3.5" fill="#000" fillOpacity=".35" />
        </svg>
      ) : (
        <svg viewBox="0 0 300 600" width={width} height={width * 2} className={className} role="img" aria-label={label}>
          <PhoneBody color={color} />
          <rect x="28" y="28" width="118" height="132" rx="34" fill="#000" fillOpacity=".14" />
          <rect x="28" y="28" width="118" height="132" rx="34" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1.5" />
          <Lens cx={63} cy={63} r={25} />
          <Lens cx={63} cy={125} r={25} />
          <circle cx="116" cy="63" r="7" fill="#F4EBD2" fillOpacity=".9" />
          <circle cx="116" cy="96" r="3.5" fill="#000" fillOpacity=".35" />
        </svg>
      );
    case "TABLET":
      return (
        <svg viewBox="0 0 60 80" width={width} height={(width * 80) / 60} className={className} role="img" aria-label={label}>
          <rect x="2" y="2" width="56" height="76" rx="8" fill="#1B1E26" />
          <rect x="6" y="7" width="48" height="66" rx="4" fill={color} />
          <path d="M6 7h48v28L6 60z" fill="#fff" fillOpacity=".12" />
          <circle cx="30" cy="4.6" r="1.2" fill="#3A3E48" />
        </svg>
      );
    case "LAPTOP":
      return (
        <svg viewBox="0 0 90 60" width={width} height={(width * 60) / 90} className={className} role="img" aria-label={label}>
          <rect x="12" y="4" width="66" height="44" rx="4" fill="#1B1E26" />
          <rect x="16" y="8" width="58" height="36" rx="2" fill={color} />
          <path d="M16 8h58v12L16 40z" fill="#fff" fillOpacity=".12" />
          <path d="M3 49h84l-5 7H8z" fill="#C3CAD8" />
          <path d="M38 49h14l-1 2H39z" fill="#9AA3B5" />
        </svg>
      );
    case "WATCH":
      return (
        <svg viewBox="0 0 60 100" width={width} height={(width * 100) / 60} className={className} role="img" aria-label={label}>
          <rect x="16" y="0" width="28" height="100" rx="8" fill={color} />
          <rect x="8" y="25" width="44" height="50" rx="13" fill="#1B1E26" />
          <rect x="12" y="29" width="36" height="42" rx="10" fill="#0B1A35" />
          <circle cx="30" cy="50" r="11" fill="none" stroke={color} strokeWidth="3" />
          <rect x="51" y="40" width="4" height="10" rx="2" fill="#9AA3B5" />
        </svg>
      );
    case "CONSOLE":
      return (
        <svg viewBox="0 0 100 64" width={width} height={(width * 64) / 100} className={className} role="img" aria-label={label}>
          <path d="M22 6h56c12 0 18 10 20 26l2 16c1 10-8 14-14 8L76 46H24L14 56c-6 6-15 2-14-8l2-16C4 16 10 6 22 6z" fill={color} />
          <path d="M22 6h56c12 0 18 10 20 26l2 16c1 10-8 14-14 8L76 46H24L14 56c-6 6-15 2-14-8l2-16C4 16 10 6 22 6z" fill="none" stroke="#0D1B3E" strokeOpacity=".2" />
          <circle cx="26" cy="26" r="7" fill="#1B1E26" fillOpacity=".55" />
          <circle cx="68" cy="22" r="3.5" fill="#fff" fillOpacity=".85" />
          <circle cx="76" cy="29" r="3.5" fill="#fff" fillOpacity=".85" />
          <circle cx="60" cy="29" r="3.5" fill="#fff" fillOpacity=".85" />
          <circle cx="68" cy="36" r="3.5" fill="#fff" fillOpacity=".85" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 80 80" width={width} height={width} className={className} role="img" aria-label={label}>
          <rect x="6" y="6" width="68" height="68" rx="18" fill={color} />
          <circle cx="40" cy="40" r="14" fill="#fff" fillOpacity=".3" />
        </svg>
      );
  }
}

function PhoneBody({ color }: { color: string }) {
  return (
    <>
      <rect x="4" y="4" width="292" height="592" rx="50" fill="#12141A" />
      <rect x="9" y="9" width="282" height="582" rx="46" fill={color} />
      <path d="M9 55 Q9 9 55 9 H200 L9 330 Z" fill="#fff" fillOpacity=".16" />
      <rect x="9" y="9" width="282" height="582" rx="46" fill="none" stroke="#000" strokeOpacity=".12" strokeWidth="2" />
    </>
  );
}

function Lens({ cx, cy, r = 26 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#16171C" />
      <circle cx={cx} cy={cy} r={r - 10} fill="#0B1A35" stroke="#2C2F38" strokeWidth="4" />
      <circle cx={cx - 6} cy={cy - 6} r="4.5" fill="#fff" fillOpacity=".4" />
    </>
  );
}
