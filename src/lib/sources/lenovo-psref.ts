import "server-only";
import { BRAND_LINES } from "../brands";
import { splitModel } from "../product-identity";

// Lenovo laptops from PSREF (psref.lenovo.com), Lenovo's own product reference. Shops resell models 1 to 6
// years old that no store sells new any more (IdeaPad Gaming 3 15IMH05, ThinkPad T480), so the catalog needs
// Lenovo's full history, not today's stock.
//
// PSREF's data API is behind an access token, so it isn't used. Each model does have a public spec sheet at
// /syspool/Sys/PDF/<folder>/<Name>/<Name>_Spec.pdf, and a name that doesn't exist answers 404. So: candidate
// names are generated from Lenovo's naming rules (size + platform + generation: 15 + IAH + 7), and only those
// whose official spec sheet exists are kept. A wrong guess can never enter the catalog.
//
// One catalog model per family and generation: the Intel and AMD versions of a ThinkPad ("T14 Gen 2 Intel /
// AMD") are one model, the processor being a configuration field.

const PSREF = "https://psref.lenovo.com/syspool/Sys/PDF";

/** Consumer platform codes per generation (I = Intel, A = AMD; the letters are the chip family) */
const CODES: Record<string, string[]> = {
  "05": ["IMH05", "ARH05", "IIL05", "ARE05", "IML05", "ITL05", "ALC05", "ADA05", "IGL05"],
  "6": ["ACH6", "ACH6H", "IHU6", "ITH6", "ITH6H", "ITL6", "ALC6", "ACN6", "IJL6", "ADA6"],
  "7": ["IAH7", "IAH7H", "ARH7", "ARH7H", "IAP7", "ABA7", "ALC7", "IAL7", "IAU7", "ARB7", "ABR7", "IJL7", "AMN7", "IGL7", "ARA7"],
  "8": ["IRH8", "APH8", "IRU8", "AMN8", "ABR8", "IRL8", "IAH8", "ARH8", "IRX8", "IAN8", "ALC8", "IAU8"],
  "9": ["IRX9", "AHP9", "IRH9", "IAU9", "ABR9", "IRL9", "ARP9", "IMH9", "IRX9H", "AKP9", "IAH9", "AMN9", "ARX9"],
  "10": ["IRX10", "AHP10", "IRH10", "IAH10", "AKP10", "IAN10", "IRU10", "ABR10", "AMN10", "ARP10", "AHP10H", "IAX10"],
  "11": ["AHP11", "IRX11", "IAX11", "AKP11", "IRH11", "ARP11"],
};
const ALL_CODES = Object.values(CODES).flat();

/** Consumer families: PSREF folder, name prefix, screen sizes */
const CONSUMER: [string, string, number[]][] = [
  ["IdeaPad", "IdeaPad_Gaming_3", [15, 16]],
  ["IdeaPad", "IdeaPad_1", [14, 15]],
  ["IdeaPad", "IdeaPad_3", [14, 15, 17]],
  ["IdeaPad", "IdeaPad_5", [14, 15, 16]],
  ["IdeaPad", "IdeaPad_5_Pro", [14, 16]],
  ["IdeaPad", "IdeaPad_Pro_5", [14, 16]],
  ["IdeaPad", "IdeaPad_Slim_3", [14, 15, 16]],
  ["IdeaPad", "IdeaPad_Slim_5", [14, 15, 16]],
  ["IdeaPad", "IdeaPad_Flex_5", [14, 16]],
  ["Legion", "Legion_5", [15, 16]],
  ["Legion", "Legion_5_Pro", [16]],
  ["Legion", "Legion_7", [16]],
  ["Legion", "Legion_Pro_5", [16]],
  ["Legion", "Legion_Pro_7", [16]],
  ["Legion", "Legion_Slim_5", [14, 16]],
  ["Legion", "Legion_Slim_7", [16]],
  ["LOQ", "LOQ", [15, 16, 17]],
  ["Yoga", "Yoga_Slim_7", [14, 15]],
  ["Yoga", "Yoga_Slim_7_Pro", [14, 16]],
  ["Yoga", "Yoga_7", [14, 16]],
  ["Yoga", "Yoga_9", [14]],
  ["Yoga", "Yoga_Pro_7", [14]],
  ["Yoga", "Yoga_Pro_9", [14, 16]],
];

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const gens = (name: string, from: number, to: number, cpus = ["_Intel", "_AMD", ""]) => range(from, to).flatMap((g) => cpus.map((c) => `${name}_Gen_${g}${c}`));

/** ThinkPad: older models by number, newer ones by generation, in Intel and AMD versions */
const THINKPAD = [
  ...["T470", "T470s", "T480", "T480s", "T490", "T490s", "T495", "T495s", "T580", "T590", "X270", "X280", "X390", "X395", "L380", "L390", "L480", "L490", "L580", "L590", "E480", "E490", "E485", "E495", "E580", "E590", "E585", "E595", "P52", "P53", "P52s", "P53s", "P43s", "P1"].map((m) => `ThinkPad_${m}`),
  ...["T14", "T14s", "T16", "X13", "X13_Yoga", "L13", "L13_Yoga", "L14", "L15", "L16", "E14", "E15", "E16", "P14s", "P16s", "P15s", "P15v", "P16v", "P16"].flatMap((m) => gens(`ThinkPad_${m}`, 1, 6)),
  ...gens("ThinkPad_T15", 1, 2, [""]),
  ...gens("ThinkPad_X1_Carbon", 5, 13, [""]),
  ...gens("ThinkPad_X1_Yoga", 3, 8, [""]),
  ...gens("ThinkPad_P1", 2, 7, [""]),
  ...["ThinkPad_E14", "ThinkPad_E15"],
];

/** ThinkBook and V series: size + generation + platform ("ThinkBook 15 G2 ITL", "V15 G4 IRU") */
const BOOK_CODES = ["IIL", "IML", "ITL", "ARE", "ACL", "ALC", "IAP", "ABA", "IRL", "ABP", "IRH", "ABR", "IAL", "ARP", "IAH", "AHP", "IRU", "AMN", "AKP", "IGL", "ADA", "IJL", "IAN"];
const THINKBOOK = ["13s", "14", "14s", "15", "16", "14p", "16p"].flatMap((s) => range(1, 9).flatMap((g) => BOOK_CODES.map((c) => `ThinkBook_${s}_G${g}_${c}`)));
const V_SERIES = ["V14", "V15", "V17"].flatMap((s) => range(1, 6).flatMap((g) => BOOK_CODES.map((c) => `Lenovo_${s}_G${g}_${c}`)));

/** Every PSREF name worth checking, with its folder */
export function psrefCandidates(): { folder: string; name: string }[] {
  const out: { folder: string; name: string }[] = [];
  for (const [folder, prefix, sizes] of CONSUMER) for (const size of sizes) for (const code of ALL_CODES) out.push({ folder, name: `${prefix}_${size}${code}` });
  for (const name of THINKPAD) out.push({ folder: "ThinkPad", name });
  for (const name of THINKBOOK) out.push({ folder: "ThinkBook", name });
  for (const name of V_SERIES) out.push({ folder: "Lenovo", name });
  return [...new Map(out.map((c) => [c.name, c])).values()];
}

export const specUrl = (c: { folder: string; name: string }) => `${PSREF}/${c.folder}/${c.name}/${c.name}_Spec.pdf`;

/** "ThinkPad_T14_Gen_2_Intel" → line ThinkPad, "T14 Gen 2"; "Lenovo_V15_G2_ITL" → line V15, "G2 ITL" */
export function psrefModel(name: string): { brand: "Lenovo"; line: string; modelNumber: string } | null {
  const human = name.replace(/^Lenovo_/, "").replace(/_(Intel|AMD)$/, "").replace(/_/g, " ");
  const split = splitModel(human, BRAND_LINES.Lenovo);
  return split ? { brand: "Lenovo", ...split } : null;
}
