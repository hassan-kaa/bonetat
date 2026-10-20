// Laptops shops resell that no readable source lists: Tunisianet only sells today's models, Icecat's free
// index is thin, and Dell / HP block automated reads. One model per family and generation, named as the
// manufacturer does and as shops write it ("Latitude 5420", "G16 7630", "EliteBook 835 G9"). Processor and
// graphics card are configuration fields, never part of the model. Lenovo comes from PSREF (sources/lenovo-psref.ts).
//
// Same format as curated-models.ts: brand → line → [kind, model numbers]. Only names known to exist: a wrong
// name is worse than a missing one (a shop can still add a missing model).
import type { DeviceKind } from "@prisma/client";

type Lines = Record<string, [DeviceKind, string[]]>;
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const L = (s: string): [DeviceKind, string[]] => ["LAPTOP", list(s)];

export const CURATED_LAPTOPS: Record<string, Lines> = {
  Apple: {
    // Intel MacBooks (Apple-chip ones are in curated-models.ts): the year is what tells them apart
    "MacBook Pro": L("13 2016, 13 2017, 13 2018, 13 2019, 13 2020, 15 2016, 15 2017, 15 2018, 15 2019, 16 2019"),
    "MacBook Air": L("13 2018, 13 2019, 13 2020"),
  },
  Dell: {
    G: L("G3 3590, G5 5500, G5 5590, G7 7500, G7 7590, G15 5510, G15 5511, G15 5515, G15 5520, G15 5521, G15 5525, G15 5530, G15 5535, G16 7620, G16 7630"),
    Latitude: L(
      "3410, 3510, 3420, 3520, 3430, 3530, 3440, 3540, 3450, 3550, 5400, 5500, 5410, 5510, 5411, 5511, 5420, 5520, 5421, 5521, 5430, 5530, 5431, 5531, 5440, 5540, 5450, 5550, " +
        "5480, 5580, 5490, 5590, 7280, 7290, 7480, 7490, 7390, 7300, 7400, 7310, 7410, 7320, 7420, 7520, 7330, 7430, 7530, 7340, 7440, 7640, 7350, 7450, 7650, 9420, 9430, 9440, 9450"
    ),
    Inspiron: L("14 5410, 14 5415, 14 5420, 14 5425, 14 5430, 14 7420, 15 3511, 15 3520, 15 3530, 15 3535, 15 5510, 15 5515, 15 5518, 15 7510, 16 5620, 16 5630, 16 5640, 16 7620, 16 7630, 16 Plus 7620, 16 Plus 7630"),
    Vostro: L("3400, 3500, 3410, 3510, 3420, 3520, 3430, 3530, 5402, 5502, 5410, 5510, 5620, 5630"),
    XPS: L("13 7390, 13 9380, 13 9300, 13 9305, 13 9310, 13 9315, 13 9320, 13 9340, 13 9345, 13 9350, 15 7590, 15 9570, 15 9500, 15 9510, 15 9520, 15 9530, 17 9700, 17 9710, 17 9720, 17 9730"),
    Precision: L("3530, 3540, 3541, 3550, 3560, 3570, 3580, 3581, 3590, 3591, 5530, 5540, 5550, 5560, 5570, 5680, 5690, 7550, 7560, 7670, 7680, 7750, 7760, 7770, 7780"),
    Alienware: L("m15 R5, m15 R6, m15 R7, m17 R4, m17 R5, m16 R1, m16 R2, m18 R1, m18 R2, x14 R1, x14 R2, x15 R1, x15 R2, x16 R1, x16 R2, x17 R1, x17 R2, 16 Area-51, 18 Area-51, 16X Aurora"),
  },
  HP: {
    EliteBook: L(
      "830 G7, 830 G8, 830 G9, 830 G10, 830 G11, 840 G5, 840 G6, 840 G7, 840 G8, 840 G9, 840 G10, 840 G11, 850 G5, 850 G6, 850 G7, 850 G8, 860 G9, 860 G10, 860 G11, " +
        "835 G7, 835 G8, 835 G9, 835 G10, 835 G11, 845 G7, 845 G8, 845 G9, 845 G10, 845 G11, 855 G7, 855 G8, 865 G9, 865 G10, 865 G11, " +
        "630 G9, 630 G10, 630 G11, 640 G9, 640 G10, 640 G11, 650 G9, 650 G10, 650 G11, 660 G11, 1040 G9, 1040 G10, 1040 G11, " +
        "x360 830 G7, x360 830 G8, x360 830 G9, x360 830 G10, x360 1030 G7, x360 1030 G8, x360 1040 G6, x360 1040 G7, x360 1040 G8, x360 1040 G9, x360 1040 G10, x360 1040 G11, " +
        "Dragonfly G2, Dragonfly G3, Dragonfly G4"
    ),
    ProBook: L("430 G8, 440 G7, 440 G8, 440 G9, 440 G10, 440 G11, 445 G7, 445 G8, 445 G9, 445 G10, 445 G11, 450 G7, 450 G8, 450 G9, 450 G10, 450 G11, 455 G7, 455 G8, 455 G9, 455 G10, 455 G11, 640 G5, 640 G8, 650 G5, 650 G8"),
    ZBook: L(
      "14u G5, 14u G6, 15 G5, 15 G6, 15u G5, 15u G6, Firefly 14 G7, Firefly 14 G8, Firefly 14 G9, Firefly 14 G10, Firefly 14 G11, Firefly 15 G7, Firefly 15 G8, Firefly 16 G9, Firefly 16 G10, Firefly 16 G11, " +
        "Power G7, Power G8, Power G9, Power G10, Power G11, Studio G7, Studio G8, Studio G9, Studio G10, Fury 15 G7, Fury 15 G8, Fury 16 G9, Fury 16 G10, Fury 16 G11"
    ),
    // HP's own series names (the sales code "15-fa1006nk" belongs to "15-fa1000"), as the Tunisianet source writes them
    Victus: L("15-fa0000, 15-fa1000, 15-fa2000, 15-fb0000, 15-fb1000, 15-fb2000, 16-d0000, 16-d1000, 16-e0000, 16-e1000, 16-r0000, 16-r1000, 16-s0000, 16-s1000"),
    Pavilion: L("15-ec1000, 15-ec2000, 15-dk0000, 15-dk1000, 15-dk2000, 16-a0000, 15-eg0000, 15-eg1000, 15-eg2000, 15-eh0000, 15-eh1000, 14-dv0000, 14-dv2000, x360 14-dy0000, x360 15-er0000, Aero 13-be0000"),
  },
  MSI: {
    Thin: L("GF63 10SC, GF63 10UC, GF63 11SC, GF63 11UC, GF63 11UD, GF63 12UC, GF63 12UCX, GF63 12VE, GF63 12VF, 15 B12UC, 15 B12UCX, 15 B12VE, 15 B13UC, 15 B13UCX, 15 B13VE, 15 B13VF"),
    Katana: L("GF66 11UC, GF66 11UD, GF66 11UE, GF66 12UC, GF66 12UD, GF66 12UE, GF76 11UC, GF76 12UE, 15 B12V, 15 B13V, 17 B12V, 17 B13V, 17 HX B14W, A15 AI B8V, A17 AI B8V"),
    Sword: L("15 A11UC, 15 A11UD, 15 A11UE, 15 A12UC, 15 A12UE, 16 HX B13V, 16 HX B14V, 17 HX B14V"),
    Stealth: L("15M A11UEK, 14 Studio A13V, 16 Studio A13V, 17 Studio A13V, 14 AI Studio A1V, 16 AI Studio A1V, 18 AI Studio A1V, 16 Mercedes-AMG A13V"),
    Raider: L("GE66 10SF, GE66 11UH, GE76 11UH, GE67 HX 12U, GE77 HX 12U, GE68 HX 13V, GE78 HX 13V, 18 HX A14V, 18 HX AI A2XW, A18 HX A9W"),
    Crosshair: L("15 B12UEZ, 16 HX D14V, 17 HX D14V"),
    Pulse: L("GL66 11U, GL76 11U, 15 B13V, 17 B13V, 16 AI C1V, 17 AI C1V"),
    Vector: L("GP66 12U, GP76 12U, GP68 HX 13V, GP78 HX 13V, 16 HX A13V, 17 HX A14V, 16 HX AI A2X, 18 HX AI A2X"),
  },
  Acer: {
    Nitro: L("5 AN515-44, 5 AN515-45, 5 AN515-46, 5 AN515-47, 5 AN515-54, 5 AN515-55, 5 AN515-56, 5 AN515-57, 5 AN515-58, 5 AN517-55, V 15 ANV15-41, V 15 ANV15-51, V 15 ANV15-52, V 16 ANV16-41, V 16 ANV16-71, 16 AN16-41, 16 AN16-51, 17 AN17-41, 17 AN17-51"),
    Predator: L("Helios 300 PH315-53, Helios 300 PH315-54, Helios 300 PH315-55, Helios 16 PH16-71, Helios 16 PH16-72, Helios 18 PH18-71, Helios 18 PH18-72, Helios Neo 16 PHN16-71, Helios Neo 16 PHN16-72, Helios Neo 16 AI PHN16-73, Helios Neo 18 PHN18-71, Triton 300 PT315-53"),
    Aspire: L("3 A315-58, 3 A315-59, 5 A514-54, 5 A515-56, 5 A515-57, 5 A515-58, 7 A715-42G, 7 A715-76G, Go 15 AG15-31P"),
    Swift: L("3 SF314-511, 5 SF514-56T, Go 14 SFG14-71, Go 16 SFG16-71, X SFX14-41G"),
  },
  Asus: {
    "TUF Gaming": L(
      "A15 FA506IH, A15 FA506IC, A15 FA506QM, A15 FA507NU, A15 FA507NV, A15 FA507RC, A15 FA507RM, A17 FA706IC, A16 FA607PV, A14 FA401WV, " +
        "F15 FX506HC, F15 FX506HE, F15 FX506HM, F15 FX506LH, F15 FX506LHB, F15 FX507ZC, F15 FX507ZM, F15 FX507VU, F15 FX507VV, F17 FX706HC, F16 FX607JV"
    ),
    "ROG Strix": L("G15 G513IH, G15 G513QM, G15 G513RM, G16 G614JU, G16 G614JV, G17 G713QM, G18 G814JV, Scar 15 G533ZW, Scar 16 G634JY, Scar 18 G834JY"),
    "ROG Zephyrus": L("G14 GA401QM, G14 GA402RJ, G14 GA402XV, G14 GA403UV, G15 GA503QM, G16 GU603ZV, G16 GU605MV, M16 GU603HM"),
    VivoBook: L("14 X1402ZA, 15 X515EA, 15 X515JA, 15 X1500EA, 15 X1502ZA, 15 X1504ZA, 16 X1605ZA, 15 OLED K513EA, Pro 15 OLED K6502, S15 OLED S5507"),
    ZenBook: L("13 UX325EA, 14 UX425EA, 14 UX3402ZA, 14 OLED UX3402VA, Flip 14 UP5401EA, Duo 14 UX482EA, S 13 OLED UM5302TA"),
    ExpertBook: L("B1 B1400CEAE, B1 B1500CEAE, B5 B5402CBA, B9 B9400CEA"),
  },
};
