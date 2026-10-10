// Curated catalog: the models Tunisian shops sell that no free data source covers well
// (Icecat's free tier and Wikidata both miss most recent phones, and nearly all of Apple).
// Only models known to exist; add a line or a model number here, then run `npm run catalog:build`.
//
// brand → line → [kind, model numbers]. The product name is built from line + number:
// "Galaxy S" + "S23" → "Galaxy S23", "iPhone" + "13 Pro" → "iPhone 13 Pro", "P" + "P30" → "P30".
import type { DeviceKind } from "@prisma/client";

type Lines = Record<string, [DeviceKind, string[]]>;
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export const CURATED_MODELS: Record<string, Lines> = {
  Apple: {
    iPhone: ["PHONE", list("8, 8 Plus, X, XR, XS, XS Max, 11, 11 Pro, 11 Pro Max, SE 2020, 12 mini, 12, 12 Pro, 12 Pro Max, 13 mini, 13, 13 Pro, 13 Pro Max, SE 2022, 14, 14 Plus, 14 Pro, 14 Pro Max, 15, 15 Plus, 15 Pro, 15 Pro Max, 16, 16 Plus, 16 Pro, 16 Pro Max, 16e, 17, 17 Pro, 17 Pro Max, Air")],
    iPad: ["TABLET", list("7, 8, 9, 10, 11")],
    "iPad Air": ["TABLET", list("3, 4, 5, 11 M2, 13 M2, 11 M3, 13 M3")],
    "iPad mini": ["TABLET", list("5, 6, 7")],
    "iPad Pro": ["TABLET", list("11 2020, 12.9 2020, 11 2021, 12.9 2021, 11 2022, 12.9 2022, 11 M4, 13 M4")],
    "MacBook Air": ["LAPTOP", list("M1, 13 M2, 15 M2, 13 M3, 15 M3, 13 M4, 15 M4")],
    "MacBook Pro": ["LAPTOP", list("13 M1, 13 M2, 14 M1 Pro, 14 M1 Max, 16 M1 Pro, 16 M1 Max, 14 M2 Pro, 14 M2 Max, 16 M2 Pro, 16 M2 Max, 14 M3, 14 M3 Pro, 14 M3 Max, 16 M3 Pro, 16 M3 Max, 14 M4, 14 M4 Pro, 14 M4 Max, 16 M4 Pro, 16 M4 Max")],
    "Apple Watch Series": ["WATCH", list("3, 4, 5, 6, 7, 8, 9, 10, 11")],
    "Apple Watch SE": ["WATCH", list("1, 2, 3")],
    "Apple Watch Ultra": ["WATCH", list("1, 2, 3")],
  },
  Samsung: {
    "Galaxy S": ["PHONE", list("S10e, S10, S10+, S20, S20+, S20 Ultra, S20 FE, S21, S21+, S21 Ultra, S21 FE, S22, S22+, S22 Ultra, S23, S23+, S23 Ultra, S23 FE, S24, S24+, S24 Ultra, S24 FE, S25, S25+, S25 Ultra, S25 Edge, S25 FE")],
    "Galaxy A": ["PHONE", list("A10, A20, A30, A50, A51, A71, A12, A22, A32, A52, A52s, A72, A13, A23, A33, A53, A73, A14, A24, A34, A54, A05, A05s, A15, A25, A35, A55, A06, A16, A26, A36, A56")],
    "Galaxy Z": ["PHONE", list("Flip 3, Fold 3, Flip 4, Fold 4, Flip 5, Fold 5, Flip 6, Fold 6, Flip 7, Fold 7")],
    "Galaxy Tab S": ["TABLET", list("S6 Lite, S7, S7+, S7 FE, S8, S8+, S8 Ultra, S9, S9+, S9 Ultra, S9 FE, S9 FE+, S10+, S10 Ultra")],
    "Galaxy Tab A": ["TABLET", list("A7, A7 Lite, A8, A9, A9+")],
    "Galaxy Watch": ["WATCH", list("4, 4 Classic, 5, 5 Pro, 6, 6 Classic, 7, Ultra")],
  },
  Xiaomi: {
    "Redmi Note": ["PHONE", list("8, 8 Pro, 9, 9S, 9 Pro, 10, 10S, 10 Pro, 11, 11S, 11 Pro, 12, 12 Pro, 12 Pro+, 13, 13 Pro, 13 Pro+, 14, 14 Pro, 14 Pro+")],
    Redmi: ["PHONE", list("9, 9A, 9C, 10, 10A, 10C, 12, 12C, 13, 13C, 14C, A1, A2, A3")],
    Xiaomi: ["PHONE", list("11T, 11T Pro, 12, 12 Pro, 12T, 12T Pro, 13, 13 Pro, 13T, 13T Pro, 14, 14 Ultra, 14T, 14T Pro, 15")],
    Poco: ["PHONE", list("X3 Pro, X4 Pro, X5, X5 Pro, X6, X6 Pro, X7, X7 Pro, F3, F4, F5, F5 Pro, F6, F6 Pro, M5, M6 Pro, C65")],
    "Redmi Pad": ["TABLET", list("SE, Pro")],
    "Xiaomi Pad": ["TABLET", list("5, 6, 6 Pro")],
  },
  Google: {
    Pixel: ["PHONE", list("6, 6 Pro, 6a, 7, 7 Pro, 7a, 8, 8 Pro, 8a, 9, 9 Pro, 9 Pro XL, 9a, 10, 10 Pro")],
  },
  Huawei: {
    P: ["PHONE", list("P30, P30 Pro, P30 Lite, P40, P40 Pro, P40 Lite, P50, P50 Pro, P60 Pro")],
    Mate: ["PHONE", list("20 Pro, 30 Pro, 40 Pro, 50 Pro, 60 Pro")],
    Nova: ["PHONE", list("9, 10, 11, 12")],
  },
  Honor: {
    X: ["PHONE", list("X6, X6a, X7, X7a, X7b, X8, X8a, X8b, X9, X9a, X9b")],
    Magic: ["PHONE", list("4 Pro, 5 Pro, 6 Pro, 5 Lite, 6 Lite, 7 Lite")],
  },
  Oppo: {
    Reno: ["PHONE", list("5, 6, 7, 8, 8T, 10, 11, 11F, 12, 12F, 13")],
    A: ["PHONE", list("A15, A16, A17, A31, A38, A53, A54, A57, A58, A74, A78, A79, A98")],
  },
  Realme: {
    C: ["PHONE", list("C11, C21, C25, C30, C31, C33, C35, C53, C55, C67")],
    Note: ["PHONE", list("50, 60")],
    GT: ["PHONE", list("2, 2 Pro, 6")],
  },
  Infinix: {
    Hot: ["PHONE", list("10, 11, 12, 20, 30, 30i, 40, 40i, 40 Pro, 50, 50 Pro")],
    Note: ["PHONE", list("10, 11, 12, 30, 30 Pro, 40, 40 Pro")],
    Smart: ["PHONE", list("6, 7, 8, 9")],
  },
  Tecno: {
    Spark: ["PHONE", list("7, 8, 9, 10, 10 Pro, 20, 20 Pro, 30")],
    Camon: ["PHONE", list("18, 19, 20, 20 Pro, 30, 30 Pro")],
    Pova: ["PHONE", list("4, 5, 6")],
  },
  OnePlus: {
    OnePlus: ["PHONE", list("9, 9 Pro, 10 Pro, 11, 12, 13")],
    Nord: ["PHONE", list("2, CE 2, CE 3, CE 3 Lite, 3, CE 4, CE 4 Lite, 4")],
  },
  Motorola: {
    "Moto G": ["PHONE", list("G13, G14, G22, G23, G24, G32, G34, G52, G54, G62, G72, G73, G84")],
    Edge: ["PHONE", list("30, 40, 40 Neo, 50, 50 Pro, 50 Fusion")],
  },
  Nokia: {
    G: ["PHONE", list("G10, G20, G21, G22, G42")],
    C: ["PHONE", list("C21, C31, C32")],
  },
  Sony: {
    PlayStation: ["CONSOLE", list("4, 4 Slim, 4 Pro, 5, 5 Slim, 5 Pro, Portal")],
  },
  Nintendo: {
    Switch: ["CONSOLE", list("V2, Lite, OLED, 2")],
  },
  Microsoft: {
    Xbox: ["CONSOLE", list("One, One S, One X, Series S, Series X")],
  },
  Valve: {
    "Steam Deck": ["CONSOLE", list("LCD, OLED")],
  },
};
