/* eslint-disable no-console */
// Demo data for Bonétat. WIPES the database first — dev only.
//   npx prisma db push && npm run db:seed
import { PrismaClient, ColorFamily, ConditionGrade, DeviceKind, Prisma } from "@prisma/client";
import { variantSignature } from "../src/lib/variants";
import { slugify } from "../src/lib/utils";
import { canonicalKey, splitModel } from "../src/lib/product-identity";
import { BRAND_LINES } from "../src/lib/brands";
import { calcCommission } from "../src/lib/money";
import { buildCatalog } from "../src/lib/catalog-build";

const prisma = new PrismaClient();
const G = ConditionGrade;
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

// Deterministic pseudo-random so the demo looks the same on every machine
function hash(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

// ─────────────────────────────────────────────────────────────────────
// Categories (the home page tiles)
// ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { slug: "iphone", nameFr: "iPhone", kind: DeviceKind.PHONE, tagline: "Du 11 au 15 Pro" },
  { slug: "android", nameFr: "Téléphones Android", kind: DeviceKind.PHONE, tagline: "Samsung, Xiaomi, Google" },
  // Computers right after phones: a priority category (many PC shops at launch)
  { slug: "macbook", nameFr: "MacBook", kind: DeviceKind.LAPTOP },
  { slug: "ordinateurs", nameFr: "PC portables", kind: DeviceKind.LAPTOP, tagline: "ThinkPad, EliteBook, gaming" },
  { slug: "ipad", nameFr: "iPad", kind: DeviceKind.TABLET },
  { slug: "tablettes-android", nameFr: "Tablettes Android", kind: DeviceKind.TABLET },
  { slug: "montres", nameFr: "Montres connectées", kind: DeviceKind.WATCH },
  { slug: "consoles", nameFr: "Consoles et manettes", kind: DeviceKind.CONSOLE },
] as const;

type Color = [name: string, hex: string];
type ProductSeed = {
  slug: string;
  category: (typeof CATEGORIES)[number]["slug"];
  brand: string;
  model: string;
  kind: DeviceKind;
  series?: string;
  seriesLabel?: string;
  seriesOrder?: number;
  cameras?: number;
  year: number;
  newPrice: number; // DT, cheapest configuration new
  base: number; // DT, cheapest configuration in "Correct"
  storages?: number[];
  storageStep?: number; // DT per storage step
  rams?: number[];
  ramStep?: number;
  options?: string[];
  optionStep?: number;
  colors: Color[];
  /**
   * Real lineups have holes: a color sold only in some storages. Declare them here
   * (color name → storages it exists in) so the database only holds variants that exist.
   */
  colorStorages?: Record<string, number[]>;
  description: string;
  specs: Record<string, string>;
};

// Coarse family per color name: powers the "Couleur" filter and sibling color matching
const FAMILY: Record<string, ColorFamily> = {
  Noir: "BLACK", "Noir sidéral": "BLACK", "Noir fantôme": "BLACK", "Noir onyx": "BLACK", "Noir minuit": "BLACK", Minuit: "BLACK", Charbon: "BLACK",
  Blanc: "WHITE", "Blanc polaire": "WHITE", "Lumière stellaire": "WHITE", Crème: "WHITE", Neige: "WHITE",
  "Gris sidéral": "GREY", Graphite: "GREY", "Gris marbre": "GREY", "Awesome Graphite": "GREY", "Gris ardoise": "GREY",
  Argent: "SILVER", Or: "GOLD", "Rose doré": "PINK", Rose: "PINK",
  Bleu: "BLUE", "Bleu alpin": "BLUE", Mer: "BLUE",
  Vert: "GREEN", "Vert nuit": "GREEN", "Awesome Lime": "GREEN",
  Violet: "PURPLE", "Violet intense": "PURPLE", Lavande: "PURPLE", "Violet cobalt": "PURPLE", "Awesome Violet": "PURPLE", "Violet aurore": "PURPLE",
  Rouge: "RED", Néon: "OTHER",
};

// Manufacturer names (mostly English), used later by the image importers to match Icecat / press kit files
const ALIASES: Record<string, string[]> = {
  "Bleu alpin": ["Sierra Blue"], Minuit: ["Midnight"], "Lumière stellaire": ["Starlight"], "Vert nuit": ["Midnight Green"],
  "Gris sidéral": ["Space Gray", "Space Grey"], "Noir sidéral": ["Space Black"], "Violet intense": ["Deep Purple"],
  Argent: ["Silver"], Or: ["Gold"], "Noir fantôme": ["Phantom Black"], Lavande: ["Lavender"], Crème: ["Cream"],
  "Noir onyx": ["Onyx Black"], "Gris marbre": ["Marble Grey"], "Violet cobalt": ["Cobalt Violet"],
};

const PRO11: Color[] = [["Gris sidéral", "#3F4044"], ["Argent", "#E4E4E1"], ["Or", "#EED9BF"], ["Vert nuit", "#43544A"]];

const PRODUCTS: ProductSeed[] = [
  // ── iPhone ──
  {
    slug: "iphone-11", category: "iphone", brand: "Apple", model: "iPhone 11", kind: "PHONE",
    series: "iphone-11", seriesLabel: "11", seriesOrder: 0, cameras: 2, year: 2019, newPrice: 1800, base: 689,
    storages: [64, 128, 256], storageStep: 90,
    colors: [["Noir", "#202125"], ["Blanc", "#F1F0EB"], ["Violet", "#CFC6E6"], ["Vert", "#C4E6D2"], ["Rouge", "#B3202D"]],
    description: "L’iPhone le plus vendu de sa génération. Puce A13 Bionic, double appareil photo 12 Mpx avec ultra grand-angle, Face ID et une autonomie qui tient la journée.",
    specs: { Écran: "6,1 pouces, LCD Liquid Retina", Puce: "A13 Bionic", "Appareil photo": "Double 12 Mpx, grand-angle et ultra grand-angle", Déverrouillage: "Face ID", Réseau: "4G", Sortie: "2019" },
  },
  {
    slug: "iphone-11-pro", category: "iphone", brand: "Apple", model: "iPhone 11 Pro", kind: "PHONE",
    series: "iphone-11", seriesLabel: "11 Pro", seriesOrder: 1, cameras: 3, year: 2019, newPrice: 2600, base: 1029,
    storages: [64, 256, 512], storageStep: 170, colors: PRO11,
    description: "Le format compact avec l’écran OLED et le triple appareil photo avec téléobjectif. Finition verre mat et acier.",
    specs: { Écran: "5,8 pouces, OLED Super Retina XDR", Puce: "A13 Bionic", "Appareil photo": "Triple 12 Mpx avec téléobjectif", Déverrouillage: "Face ID", Réseau: "4G", Sortie: "2019" },
  },
  {
    slug: "iphone-11-pro-max", category: "iphone", brand: "Apple", model: "iPhone 11 Pro Max", kind: "PHONE",
    series: "iphone-11", seriesLabel: "11 Pro Max", seriesOrder: 2, cameras: 3, year: 2019, newPrice: 2900, base: 1219,
    storages: [64, 256, 512], storageStep: 170, colors: PRO11,
    description: "Le plus grand écran de la gamme 11 et la meilleure autonomie. Triple appareil photo avec téléobjectif.",
    specs: { Écran: "6,5 pouces, OLED Super Retina XDR", Puce: "A13 Bionic", "Appareil photo": "Triple 12 Mpx avec téléobjectif", Déverrouillage: "Face ID", Réseau: "4G", Sortie: "2019" },
  },
  {
    slug: "iphone-12", category: "iphone", brand: "Apple", model: "iPhone 12", kind: "PHONE",
    series: "iphone-12", seriesLabel: "12", cameras: 2, year: 2020, newPrice: 2200, base: 949,
    storages: [64, 128], storageStep: 110,
    colors: [["Noir", "#1E2027"], ["Blanc", "#F1F0EB"], ["Bleu", "#2E4C78"], ["Vert", "#CFE3D1"], ["Rouge", "#B3202D"]],
    description: "Écran OLED, design aux bords plats et 5G. Compatible MagSafe.",
    specs: { Écran: "6,1 pouces, OLED Super Retina XDR", Puce: "A14 Bionic", "Appareil photo": "Double 12 Mpx", Réseau: "5G", Sortie: "2020" },
  },
  {
    slug: "iphone-13", category: "iphone", brand: "Apple", model: "iPhone 13", kind: "PHONE",
    series: "iphone-13", seriesLabel: "13", seriesOrder: 0, cameras: 2, year: 2021, newPrice: 2900, base: 1249,
    storages: [128, 256], storageStep: 150,
    colors: [["Minuit", "#1E2433"], ["Lumière stellaire", "#EDE6DA"], ["Rose", "#F2D4D7"], ["Bleu", "#2F5C8F"]],
    description: "Grande autonomie, encoche réduite et mode Cinématique. Le meilleur rapport prix/âge de la gamme.",
    specs: { Écran: "6,1 pouces, OLED Super Retina XDR", Puce: "A15 Bionic", "Appareil photo": "Double 12 Mpx, stabilisation capteur", Réseau: "5G", Sortie: "2021" },
  },
  {
    slug: "iphone-13-pro", category: "iphone", brand: "Apple", model: "iPhone 13 Pro", kind: "PHONE",
    series: "iphone-13", seriesLabel: "13 Pro", seriesOrder: 1, cameras: 3, year: 2021, newPrice: 3600, base: 1690,
    storages: [128, 256], storageStep: 160,
    colors: [["Graphite", "#4A4A4D"], ["Bleu alpin", "#9DB5CE"], ["Or", "#EBDCC2"]],
    description: "Écran ProMotion 120 Hz, triple appareil photo avec macro et téléobjectif 3x.",
    specs: { Écran: "6,1 pouces, OLED ProMotion 120 Hz", Puce: "A15 Bionic", "Appareil photo": "Triple 12 Mpx, téléobjectif 3x", Réseau: "5G", Sortie: "2021" },
  },
  {
    slug: "iphone-14-pro", category: "iphone", brand: "Apple", model: "iPhone 14 Pro", kind: "PHONE",
    series: "iphone-14", seriesLabel: "14 Pro", cameras: 3, year: 2022, newPrice: 4800, base: 2290,
    storages: [128, 256], storageStep: 220,
    colors: [["Noir sidéral", "#3B3A3E"], ["Violet intense", "#5A4E6E"], ["Argent", "#E4E4E1"], ["Or", "#EADCC7"]],
    description: "Dynamic Island, écran toujours allumé et capteur principal 48 Mpx.",
    specs: { Écran: "6,1 pouces, OLED ProMotion, toujours allumé", Puce: "A16 Bionic", "Appareil photo": "48 Mpx + ultra grand-angle + téléobjectif 3x", Réseau: "5G", Sortie: "2022" },
  },
  {
    slug: "iphone-15", category: "iphone", brand: "Apple", model: "iPhone 15", kind: "PHONE",
    series: "iphone-15", seriesLabel: "15", cameras: 2, year: 2023, newPrice: 4200, base: 2590,
    storages: [128, 256], storageStep: 240,
    colors: [["Noir", "#2F3033"], ["Bleu", "#D4E1E8"], ["Vert", "#D9E6CF"], ["Rose", "#F2D9DD"]],
    description: "USB-C, Dynamic Island et capteur 48 Mpx sur le modèle standard.",
    specs: { Écran: "6,1 pouces, OLED Super Retina XDR", Puce: "A16 Bionic", "Appareil photo": "48 Mpx + ultra grand-angle", Connectique: "USB-C", Réseau: "5G", Sortie: "2023" },
  },
  // ── Android ──
  {
    slug: "samsung-galaxy-s23", category: "android", brand: "Samsung", model: "Galaxy S23", kind: "PHONE",
    series: "galaxy-s23", seriesLabel: "S23", cameras: 3, year: 2023, newPrice: 3800, base: 1650,
    storages: [128, 256], storageStep: 160,
    colors: [["Noir fantôme", "#22252C"], ["Crème", "#EFE7D7"], ["Lavande", "#D7CFE8"], ["Vert", "#C5D6C3"]],
    description: "Compact, puissant et très bien optimisé. Snapdragon 8 Gen 2 for Galaxy.",
    specs: { Écran: "6,1 pouces, AMOLED 120 Hz", Processeur: "Snapdragon 8 Gen 2", "Appareil photo": "50 Mpx + ultra grand-angle + téléobjectif 3x", Réseau: "5G", Sortie: "2023" },
  },
  {
    slug: "samsung-galaxy-s24", category: "android", brand: "Samsung", model: "Galaxy S24", kind: "PHONE",
    series: "galaxy-s24", seriesLabel: "S24", cameras: 3, year: 2024, newPrice: 4300, base: 2490,
    storages: [256],
    colors: [["Noir onyx", "#26272B"], ["Gris marbre", "#C9CACC"], ["Violet cobalt", "#B8B3D8"]],
    description: "Galaxy AI, écran plus lumineux et sept ans de mises à jour Android.",
    specs: { Écran: "6,2 pouces, AMOLED 120 Hz", Processeur: "Exynos 2400", "Appareil photo": "50 Mpx + ultra grand-angle + téléobjectif 3x", Réseau: "5G", Sortie: "2024" },
  },
  {
    slug: "samsung-galaxy-a54", category: "android", brand: "Samsung", model: "Galaxy A54", kind: "PHONE",
    series: "galaxy-a", seriesLabel: "A54", cameras: 3, year: 2023, newPrice: 1600, base: 690,
    storages: [128, 256], storageStep: 90,
    colors: [["Awesome Graphite", "#2E3036"], ["Awesome Violet", "#CFC2E4"], ["Awesome Lime", "#DDEBA3"]],
    colorStorages: { "Awesome Lime": [128] },
    description: "Le milieu de gamme le plus équilibré de Samsung : bel écran, étanche IP67, bonne autonomie.",
    specs: { Écran: "6,4 pouces, Super AMOLED 120 Hz", Processeur: "Exynos 1380", "Appareil photo": "50 Mpx stabilisé", Étanchéité: "IP67", Sortie: "2023" },
  },
  {
    slug: "xiaomi-redmi-note-13-pro", category: "android", brand: "Xiaomi", model: "Redmi Note 13 Pro", kind: "PHONE",
    cameras: 3, year: 2024, newPrice: 1300, base: 590,
    storages: [128, 256], storageStep: 70, rams: [8],
    colors: [["Noir minuit", "#22252C"], ["Violet aurore", "#B8A6D6"], ["Blanc polaire", "#EEF0F2"]],
    description: "Capteur 200 Mpx, écran AMOLED 120 Hz et charge 67 W à petit prix.",
    specs: { Écran: "6,67 pouces, AMOLED 120 Hz", Processeur: "Snapdragon 7s Gen 2", "Appareil photo": "200 Mpx", Charge: "67 W", Sortie: "2024" },
  },
  {
    slug: "google-pixel-7a", category: "android", brand: "Google", model: "Pixel 7a", kind: "PHONE",
    cameras: 2, year: 2023, newPrice: 1900, base: 890,
    storages: [128],
    colors: [["Charbon", "#3A3C40"], ["Neige", "#EEEDE8"], ["Mer", "#BFD3E6"]],
    description: "Le meilleur appareil photo de sa catégorie et Android sans surcouche.",
    specs: { Écran: "6,1 pouces, OLED 90 Hz", Processeur: "Google Tensor G2", "Appareil photo": "64 Mpx + ultra grand-angle", Sortie: "2023" },
  },
  // ── Tablets ──
  {
    slug: "ipad-air-5", category: "ipad", brand: "Apple", model: "iPad Air 5", kind: "TABLET",
    year: 2022, newPrice: 3200, base: 1290, storages: [64, 256], storageStep: 260,
    options: ["Wi-Fi", "Wi-Fi + Cellular"], optionStep: 280,
    colors: [["Gris sidéral", "#5B6170"], ["Bleu", "#8DB0EC"], ["Rose", "#F2D4D7"], ["Violet", "#CFC6E6"], ["Lumière stellaire", "#EDE6DA"]],
    colorStorages: { Violet: [64] },
    description: "Puce M1 dans un iPad fin et léger. Compatible Apple Pencil 2 et Magic Keyboard.",
    specs: { Écran: "10,9 pouces, Liquid Retina", Puce: "Apple M1", Connectique: "USB-C", Sortie: "2022" },
  },
  {
    slug: "ipad-9", category: "ipad", brand: "Apple", model: "iPad 9", kind: "TABLET",
    year: 2021, newPrice: 1600, base: 690, storages: [64, 256], storageStep: 180, options: ["Wi-Fi"],
    colors: [["Gris sidéral", "#5B6170"], ["Argent", "#D9DCE2"]],
    description: "L’iPad pour tout le monde : école, séries, appels vidéo. Bouton Touch ID.",
    specs: { Écran: "10,2 pouces, Retina", Puce: "A13 Bionic", Connectique: "Lightning", Sortie: "2021" },
  },
  {
    slug: "samsung-galaxy-tab-s8", category: "tablettes-android", brand: "Samsung", model: "Galaxy Tab S8", kind: "TABLET",
    year: 2022, newPrice: 2900, base: 1290, storages: [128], options: ["Wi-Fi"],
    colors: [["Graphite", "#4A4D55"], ["Argent", "#D9DADB"], ["Rose doré", "#E9CFC3"]],
    description: "Écran 120 Hz, S Pen inclus et DeX pour travailler comme sur un ordinateur.",
    specs: { Écran: "11 pouces, LTPS 120 Hz", Processeur: "Snapdragon 8 Gen 1", Stylet: "S Pen inclus", Sortie: "2022" },
  },
  {
    slug: "lenovo-tab-p11", category: "tablettes-android", brand: "Lenovo", model: "Tab P11", kind: "TABLET",
    year: 2021, newPrice: 1100, base: 420, storages: [64, 128], storageStep: 60, options: ["Wi-Fi"],
    colors: [["Gris ardoise", "#5B6170"]],
    description: "Grande tablette familiale avec quatre haut-parleurs Dolby Atmos.",
    specs: { Écran: "11 pouces, 2K", Processeur: "Snapdragon 662", Audio: "4 haut-parleurs", Sortie: "2021" },
  },
  // ── Laptops ──
  {
    slug: "macbook-air-m1", category: "macbook", brand: "Apple", model: "MacBook Air M1", kind: "LAPTOP",
    year: 2020, newPrice: 3500, base: 1590, rams: [8, 16], ramStep: 280, storages: [256, 512], storageStep: 260,
    colors: [["Gris sidéral", "#8A93A6"], ["Argent", "#C9D1DE"], ["Or", "#EAD7BF"]],
    description: "Silencieux (sans ventilateur), autonomie de 15 h et puce M1 toujours très rapide.",
    specs: { Écran: "13,3 pouces, Retina", Puce: "Apple M1", Autonomie: "Jusqu’à 15 h", Poids: "1,29 kg", Sortie: "2020" },
  },
  {
    slug: "macbook-pro-14-m1-pro", category: "macbook", brand: "Apple", model: "MacBook Pro 14 M1 Pro", kind: "LAPTOP",
    year: 2021, newPrice: 6900, base: 3290, rams: [16], storages: [512, 1000], storageStep: 450,
    colors: [["Gris sidéral", "#7D8597"], ["Argent", "#C9D1DE"]],
    description: "Écran mini-LED 120 Hz, HDMI et lecteur SD. Pour la vidéo, la photo et le code.",
    specs: { Écran: "14,2 pouces, Liquid Retina XDR", Puce: "M1 Pro", Ports: "HDMI, SD, 3 Thunderbolt", Sortie: "2021" },
  },
  {
    slug: "lenovo-thinkpad-t14-gen2", category: "ordinateurs", brand: "Lenovo", model: "ThinkPad T14 Gen 2", kind: "LAPTOP",
    year: 2021, newPrice: 2800, base: 990, rams: [16], storages: [256, 512], storageStep: 110, options: ["Intel Core i5 11e gén."],
    colors: [["Noir", "#5A606C"]],
    description: "Le portable pro increvable : clavier excellent, nombreux ports, réparable.",
    specs: { Écran: "14 pouces, Full HD", Processeur: "Intel Core i5 11e gén.", Ports: "USB-C, USB-A, HDMI, RJ45", Sortie: "2021" },
  },
  {
    slug: "dell-xps-13", category: "ordinateurs", brand: "Dell", model: "XPS 13 9310", kind: "LAPTOP",
    year: 2021, newPrice: 4200, base: 1690, rams: [16], storages: [512], options: ["Intel Core i7 11e gén."],
    colors: [["Argent", "#C9D1DE"]],
    description: "Ultra-compact, écran bord à bord et finition aluminium.",
    specs: { Écran: "13,4 pouces, Full HD+", Processeur: "Intel Core i7 11e gén.", Poids: "1,27 kg", Sortie: "2021" },
  },
  {
    slug: "hp-elitebook-840-g8", category: "ordinateurs", brand: "HP", model: "EliteBook 840 G8", kind: "LAPTOP",
    year: 2021, newPrice: 3300, base: 1090, rams: [8, 16], ramStep: 120, storages: [256, 512], storageStep: 110, options: ["Intel Core i5 11e gén.", "Intel Core i7 11e gén."], optionStep: 250,
    colors: [["Argent", "#C9D1DE"]],
    description: "Le portable d’entreprise le plus revendu en Tunisie : robuste, léger, clavier rétroéclairé.",
    specs: { Écran: "14 pouces, Full HD", Processeur: "Intel Core 11e gén.", Ports: "USB-C, USB-A, HDMI", Sortie: "2021" },
  },
  {
    slug: "lenovo-legion-5", category: "ordinateurs", brand: "Lenovo", model: "Legion 5", kind: "LAPTOP",
    year: 2021, newPrice: 4900, base: 2390, rams: [16], storages: [512, 1000], storageStep: 150, options: ["AMD Ryzen 7 Série 5000, RTX 3060 6 Go"],
    colors: [["Gris ardoise", "#4A4F59"]],
    description: "PC gamer 15,6 pouces 165 Hz : joue aux jeux récents en qualité élevée.",
    specs: { Écran: "15,6 pouces, 165 Hz", Processeur: "AMD Ryzen 7 5800H", "Carte graphique": "NVIDIA GeForce RTX 3060", Sortie: "2021" },
  },
  {
    slug: "asus-tuf-gaming-f15", category: "ordinateurs", brand: "Asus", model: "TUF Gaming F15", kind: "LAPTOP",
    year: 2022, newPrice: 3600, base: 1790, rams: [16], storages: [512], options: ["Intel Core i5 11e gén., RTX 3050 4 Go"],
    colors: [["Noir", "#2B2E35"]],
    description: "Le PC gamer abordable : solide, bien refroidi, écran 144 Hz.",
    specs: { Écran: "15,6 pouces, 144 Hz", Processeur: "Intel Core i5-11400H", "Carte graphique": "NVIDIA GeForce RTX 3050", Sortie: "2022" },
  },
  // ── Watches ──
  {
    slug: "apple-watch-series-8", category: "montres", brand: "Apple", model: "Apple Watch Series 8", kind: "WATCH",
    year: 2022, newPrice: 1400, base: 520, options: ["41 mm, GPS", "45 mm, GPS"], optionStep: 70,
    colors: [["Minuit", "#1E2433"], ["Lumière stellaire", "#E8DCC8"], ["Argent", "#DDE0E4"], ["Rouge", "#B3202D"]],
    description: "Capteur de température, ECG, détection des accidents. Bracelet sport neuf fourni.",
    specs: { Boîtier: "Aluminium", Santé: "ECG, oxygène sanguin, température", Étanchéité: "50 m", Sortie: "2022" },
  },
  {
    slug: "samsung-galaxy-watch-6", category: "montres", brand: "Samsung", model: "Galaxy Watch 6", kind: "WATCH",
    year: 2023, newPrice: 900, base: 340, options: ["40 mm", "44 mm"], optionStep: 50,
    colors: [["Graphite", "#3F4044"], ["Or", "#E3C9A6"]],
    description: "Écran plus grand, suivi du sommeil complet et Wear OS.",
    specs: { Boîtier: "Aluminium", Système: "Wear OS 4", Santé: "ECG, composition corporelle", Sortie: "2023" },
  },
  // ── Consoles ──
  {
    slug: "sony-playstation-5", category: "consoles", brand: "Sony", model: "PlayStation 5", kind: "CONSOLE",
    year: 2020, newPrice: 2300, base: 1190, options: ["Standard", "Édition digitale"], optionStep: -150,
    colors: [["Blanc", "#F3F4F6"]],
    description: "Livrée avec une manette DualSense nettoyée et testée, câbles d’origine.",
    specs: { Stockage: "825 Go SSD", Résolution: "Jusqu’à 4K 120 Hz", Manette: "DualSense incluse", Sortie: "2020" },
  },
  {
    slug: "nintendo-switch-oled", category: "consoles", brand: "Nintendo", model: "Switch OLED", kind: "CONSOLE",
    year: 2021, newPrice: 1350, base: 690,
    colors: [["Blanc", "#F3F4F6"], ["Néon", "#E5484D"]],
    description: "Écran OLED 7 pouces, dock avec port Ethernet. Joy-Con contrôlés sans dérive.",
    specs: { Écran: "7 pouces, OLED", Stockage: "64 Go", Modes: "Salon, portable, sur table", Sortie: "2021" },
  },
];

// ─────────────────────────────────────────────────────────────────────
// Demo stock: a few hand-picked units per product, one physical device each.
// Small on purpose, so every configurator behavior can be checked by hand:
// the product page shows ONLY storages / colors / versions that have a unit for sale.
//
// [storage, ram, option, color, grade, price DT, battery %, shop]
//   shop: 0 TechStore Sousse (quality 96) · 1 PhoneLand Sfax (91) · 2 SmartFix Tunis (98) · 3 MobiCenter Nabeul (89)
// ─────────────────────────────────────────────────────────────────────
type Unit = [storage: number | null, ram: number | null, option: string | null, color: string, grade: ConditionGrade, price: number, battery: number | null, shop: 0 | 1 | 2 | 3];
const { CORRECT, BON, TRES_BON, COMME_NEUF } = G;

const STOCK: Record<string, Unit[]> = {
  // iPhone 13: THE test page.
  //  · Opens on the cheapest unit of the whole page: 128 Go Minuit, Correct, 1190 DT.
  //  · 128 Minuit Bon exists twice (1290 and 1340): only 1290 is ever shown, "2 exemplaires".
  //  · Bleu exists only in Très bon: picking Bleu from Correct switches the grade to Très bon.
  //  · Comme neuf exists only in 256 Go Minuit: picking it switches the storage to 256.
  //  · Lumière stellaire has no unit: it never appears.
  "iphone-13": [
    [128, null, null, "Minuit", CORRECT, 1190, 81, 1],
    [128, null, null, "Minuit", BON, 1290, 86, 1],
    [128, null, null, "Minuit", BON, 1340, 92, 0],
    [128, null, null, "Minuit", TRES_BON, 1450, 88, 2],
    [128, null, null, "Bleu", TRES_BON, 1480, 90, 0],
    [256, null, null, "Minuit", COMME_NEUF, 1790, 97, 2],
    [256, null, null, "Rose", BON, 1450, 84, 1],
  ],
  // iPhone 11 family: the model switcher. 11 Pro Max has no unit, so it isn't offered.
  "iphone-11": [
    [64, null, null, "Rouge", CORRECT, 640, 78, 2],
    [64, null, null, "Noir", BON, 690, 83, 0],
    [128, null, null, "Vert", TRES_BON, 820, 89, 1],
  ],
  "iphone-11-pro": [
    [64, null, null, "Gris sidéral", BON, 1090, 85, 2],
    [256, null, null, "Vert nuit", TRES_BON, 1290, 91, 0],
  ],
  "iphone-12": [
    [64, null, null, "Bleu", BON, 990, 84, 1],
    [128, null, null, "Noir", TRES_BON, 1190, 90, 0],
  ],
  "iphone-13-pro": [
    [128, null, null, "Graphite", BON, 1790, 86, 2],
    [256, null, null, "Bleu alpin", COMME_NEUF, 2190, 98, 0],
  ],
  "iphone-14-pro": [[128, null, null, "Violet intense", TRES_BON, 2490, 92, 1]],
  "iphone-15": [
    [128, null, null, "Noir", BON, 2690, 95, 0],
    [128, null, null, "Rose", TRES_BON, 2790, 99, 2],
  ],
  // Samsung: these colors have catalog photos (Icecat).
  // Galaxy S23: THE "several shops, same unit" page. It opens on 128 Go Noir fantôme, Bon, sold by 4 shops:
  //  · PhoneLand 1690 is the cheapest, but SmartFix 1720 has real photos and is within 2 %: SmartFix holds the buy box.
  //  · TechStore has 2 identical units at 1750: one row, "2 disponibles".
  //  · 4 shops: the list shows 3, then "Voir les 4 ateliers".
  "samsung-galaxy-s23": [
    [128, null, null, "Noir fantôme", BON, 1690, 87, 1],
    [128, null, null, "Noir fantôme", BON, 1720, 93, 2],
    [128, null, null, "Noir fantôme", BON, 1750, 90, 0],
    [128, null, null, "Noir fantôme", BON, 1750, 89, 0],
    [128, null, null, "Noir fantôme", BON, 1790, 91, 3],
    [128, null, null, "Crème", TRES_BON, 1790, 91, 0],
    [256, null, null, "Vert", COMME_NEUF, 2090, 96, 2],
  ],
  "samsung-galaxy-s24": [
    [256, null, null, "Violet cobalt", CORRECT, 2490, 88, 2],
    [256, null, null, "Gris marbre", BON, 2590, 93, 1],
    [256, null, null, "Noir onyx", TRES_BON, 2690, 95, 0],
  ],
  "samsung-galaxy-a54": [
    [128, null, null, "Awesome Graphite", BON, 790, 86, 1],
    [128, null, null, "Awesome Violet", TRES_BON, 850, 90, 0],
  ],
  "xiaomi-redmi-note-13-pro": [[256, 8, null, "Noir minuit", BON, 690, 89, 2]],
  "google-pixel-7a": [[128, null, null, "Charbon", TRES_BON, 990, 91, 1]],
  // iPad Air 5: storage AND version (Wi-Fi / Cellular) axes.
  "ipad-air-5": [
    [64, null, "Wi-Fi", "Gris sidéral", BON, 1390, 88, 0],
    [256, null, "Wi-Fi + Cellular", "Bleu", TRES_BON, 1890, 93, 2],
  ],
  "ipad-9": [[64, null, "Wi-Fi", "Argent", BON, 790, 85, 1]],
  "samsung-galaxy-tab-s8": [[128, null, "Wi-Fi", "Rose doré", TRES_BON, 1490, 94, 2]],
  "lenovo-tab-p11": [[128, null, "Wi-Fi", "Gris ardoise", BON, 490, 82, 0]],
  // MacBook Air M1: RAM axis. 16 Go exists only with 512 Go: picking 16 switches the SSD to 512.
  "macbook-air-m1": [
    [256, 8, null, "Gris sidéral", BON, 1690, 87, 0],
    [256, 8, null, "Argent", TRES_BON, 1790, 92, 2],
    [512, 16, null, "Gris sidéral", COMME_NEUF, 2390, 98, 1],
  ],
  "macbook-pro-14-m1-pro": [[512, 16, null, "Argent", TRES_BON, 3590, 93, 2]],
  "lenovo-thinkpad-t14-gen2": [[256, 16, "Intel Core i5 11e gén.", "Noir", BON, 1190, 84, 1]],
  "dell-xps-13": [[512, 16, "Intel Core i7 11e gén.", "Argent", TRES_BON, 1890, 90, 0]],
  // PCs: enough spread to test the computer filters (processor, RAM, SSD, graphics card).
  "hp-elitebook-840-g8": [
    [256, 8, "Intel Core i5 11e gén.", "Argent", CORRECT, 1090, 79, 0],
    [256, 16, "Intel Core i5 11e gén.", "Argent", BON, 1240, 85, 1],
    [512, 16, "Intel Core i7 11e gén.", "Argent", TRES_BON, 1590, 91, 2],
  ],
  "lenovo-legion-5": [[512, 16, "AMD Ryzen 7 Série 5000, RTX 3060 6 Go", "Gris ardoise", TRES_BON, 2590, 88, 0]],
  "asus-tuf-gaming-f15": [[512, 16, "Intel Core i5 11e gén., RTX 3050 4 Go", "Noir", BON, 1890, 86, 1]],
  // Watch: version axis (case size).
  "apple-watch-series-8": [
    [null, null, "41 mm, GPS", "Minuit", BON, 590, 86, 2],
    [null, null, "45 mm, GPS", "Minuit", TRES_BON, 690, 91, 0],
    [null, null, "41 mm, GPS", "Argent", COMME_NEUF, 720, 97, 1],
  ],
  "samsung-galaxy-watch-6": [[null, null, "44 mm", "Graphite", BON, 390, 88, 1]],
  // Consoles: no battery.
  "sony-playstation-5": [
    [null, null, "Édition digitale", "Blanc", TRES_BON, 1150, null, 2],
    [null, null, "Standard", "Blanc", BON, 1290, null, 0],
  ],
  "nintendo-switch-oled": [[null, null, null, "Blanc", BON, 790, null, 1]],
};

/** Each shop sets its own warranty (4 months minimum): TechStore 12, PhoneLand 6, SmartFix 12, MobiCenter 4 */
const SHOP_WARRANTY = [12, 6, 12, 4] as const;

const NOTES = ["Boîte d’origine incluse", "Coque et verre trempé offerts", "Chargeur d’origine", null, null];

/** Every variant the product really exists in: the axes, minus the declared holes */
function lineup(p: ProductSeed) {
  const rows: { storage: number | null; ram: number | null; option: string | null; colorIdx: number; si: number; ri: number; oi: number }[] = [];
  const storages: (number | null)[] = p.storages ?? [null];
  const rams: (number | null)[] = p.rams ?? [null];
  const options: (string | null)[] = p.options ?? [null];
  storages.forEach((storage, si) =>
    rams.forEach((ram, ri) =>
      options.forEach((option, oi) =>
        p.colors.forEach(([name], colorIdx) => {
          const only = p.colorStorages?.[name];
          if (only && storage !== null && !only.includes(storage)) return;
          rows.push({ storage, ram, option, colorIdx, si, ri, oi });
        })
      )
    )
  );
  return rows;
}

/** Curated catalog photos and Icecat links survive a reseed: they are set aside and reattached by product + color */
async function keepCatalogPhotos() {
  return prisma.finish.findMany({
    where: { OR: [{ images: { some: {} } }, { icecatId: { not: null } }] },
    select: {
      slug: true, icecatId: true, icecatMatch: true, aliases: true,
      product: { select: { slug: true } },
      images: { select: { angle: true, position: true, key: true, width: true, height: true, sourceWidth: true, sourceHeight: true, blurDataUrl: true, source: true, sourceRef: true, status: true } },
    },
  });
}

async function wipe() {
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.offerPhoto.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.catalogImage.deleteMany();
  await prisma.finish.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.session.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.specSuggestion.deleteMany();
  await prisma.listingDraft.deleteMany();
  await prisma.productLine.deleteMany();
  await prisma.brand.deleteMany();
}

async function main() {
  const kept = await keepCatalogPhotos();
  console.log(`Wiping dev database (keeping ${kept.reduce((n, f) => n + f.images.length, 0)} catalog photos)…`);
  await wipe();

  // ── People ──
  await prisma.user.create({ data: { phone: "+21600000000", name: "Admin Bonétat", role: "ADMIN" } });

  const vendorDefs = [
    {
      phone: "+21611111111", name: "Karim Trabelsi", storeName: "TechStore Sousse", partnerCode: "TN-0142", quality: 96,
      legalName: "TechStore SARL", taxId: "1234567/A/M/000", rne: "B0123452019", pickupAddress: "Avenue Habib Bourguiba, 4000 Sousse",
      pickupHours: "Lun. à sam., 9 h à 18 h", rib: "08 006 0123456789012 34", shopPhone: "+21673220114",
    },
    {
      phone: "+21622222222", name: "Mehdi Jlassi", storeName: "PhoneLand Sfax", partnerCode: "TN-0157", quality: 91,
      legalName: "PhoneLand SUARL", taxId: "7654321/B/M/000", rne: "B0987652020", pickupAddress: "Route de Tunis km 2, 3000 Sfax",
      pickupHours: "Lun. à ven., 9 h à 17 h", rib: "10 202 0987654321098 76", shopPhone: "+21674400220",
    },
    {
      phone: "+21655555555", name: "Ines Ben Salem", storeName: "SmartFix Tunis", partnerCode: "TN-0163", quality: 98,
      legalName: "SmartFix SARL", taxId: "1122334/C/M/000", rne: "B0456782021", pickupAddress: "Rue du Lac Biwa, Les Berges du Lac, 1053 Tunis",
      pickupHours: "Lun. à sam., 10 h à 19 h", rib: "04 018 0112233445566 77", shopPhone: "+21671960330",
    },
    {
      phone: "+21666666666", name: "Walid Hammami", storeName: "MobiCenter Nabeul", partnerCode: "TN-0171", quality: 89,
      legalName: "MobiCenter SUARL", taxId: "5566778/D/M/000", rne: "B0778892022", pickupAddress: "Avenue Farhat Hached, 8000 Nabeul",
      pickupHours: "Lun. à sam., 9 h à 18 h", rib: "25 010 0556677889900 11", shopPhone: "+21672285440",
    },
  ];
  const vendors: Prisma.VendorGetPayload<object>[] = [];
  for (const v of vendorDefs) {
    const user = await prisma.user.create({ data: { phone: v.phone, name: v.name, role: "VENDOR" } });
    vendors.push(
      await prisma.vendor.create({
        data: {
          userId: user.id, storeName: v.storeName, status: "APPROVED", partnerCode: v.partnerCode, qualityScore: v.quality,
          description: "Atelier partenaire Bonétat.", legalName: v.legalName, taxId: v.taxId, rne: v.rne,
          contactName: v.name, phone: v.shopPhone, pickupAddress: v.pickupAddress, pickupHours: v.pickupHours, rib: v.rib,
          rating: 4.6 + v.quality / 1000, reviewCount: 40 + (v.quality % 7) * 9,
        },
      })
    );
  }
  const pendingUser = await prisma.user.create({ data: { phone: "+21633333333", name: "Sami Gharbi", role: "VENDOR" } });
  await prisma.vendor.create({
    data: { userId: pendingUser.id, storeName: "GadgetZone Bizerte", status: "PENDING", description: "Réparation et revente de consoles et montres connectées depuis 2020.", contactName: "Sami Gharbi", phone: "+21672430550" },
  });

  const buyer = await prisma.user.create({
    data: { phone: "+21644444444", name: "Yasmine Ben Salah", email: "yasmine@exemple.tn", role: "BUYER" },
  });
  const buyers = [buyer];
  for (const [phone, name] of [["+21650111222", "Amine Dridi"], ["+21698765432", "Rania Mansour"], ["+21620333444", "Youssef Hamdi"]]) {
    buyers.push(await prisma.user.create({ data: { phone, name } }));
  }
  const home = await prisma.address.create({
    data: {
      userId: buyer.id, label: "Maison", fullName: "Yasmine Ben Salah", phone: "+21644444444", governorate: "Sousse",
      delegation: "Sahloul", line: "12 rue Ibn Khaldoun", notes: "Sonner deux fois, 2e étage", isDefault: true,
    },
  });
  await prisma.address.create({
    data: {
      userId: buyer.id, label: "Bureau", fullName: "Yasmine Ben Salah", phone: "+21644444444", governorate: "Tunis",
      delegation: "Les Berges du Lac 2", line: "Immeuble Carthage, 3e étage", notes: "Livraison de 9 h à 17 h",
    },
  });
  console.log("✓ People");

  // ── Brands and lines ──
  for (const [i, [name, lines]] of Object.entries(BRAND_LINES).entries()) {
    await prisma.brand.create({
      data: { name, slug: slugify(name), position: i, lines: { create: lines.map((l) => ({ name: l, slug: slugify(l) })) } },
    });
  }

  // ── Catalog ──
  const catId: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await prisma.category.create({ data: { ...c, position: i } });
    catId[c.slug] = row.id;
  }

  let variantCount = 0;
  let offerCount = 0;
  let finishCount = 0;
  let photoCount = 0;
  const variantIds: Record<string, string> = {}; // "slug|storage|ram|option|color"

  for (const p of PRODUCTS) {
    const split = splitModel(p.model, BRAND_LINES[p.brand] ?? []);
    if (!split) throw new Error(`Seed error: can't split "${p.model}" into line + model number`);
    const product = await prisma.product.create({
      data: {
        slug: p.slug, categoryId: catId[p.category], brand: p.brand, model: p.model, kind: p.kind,
        line: split.line, modelNumber: split.modelNumber, canonicalKey: canonicalKey({ brand: p.brand, ...split }),
        series: p.series, seriesLabel: p.seriesLabel, seriesOrder: p.seriesOrder ?? 0, cameraCount: p.cameras,
        description: p.description, newPriceMillimes: p.newPrice * 1000, specsJson: Object.entries(p.specs) as Prisma.InputJsonValue, releaseYear: p.year,
      },
    });

    const finishes = [];
    finishCount += p.colors.length;
    for (const [i, [name, hex]] of p.colors.entries()) {
      const family = FAMILY[name];
      if (!family) throw new Error(`Seed error: no color family for "${name}"`);
      const slug = slugify(name);
      const old = kept.find((f) => f.product.slug === p.slug && f.slug === slug);
      const finish = await prisma.finish.create({
        data: {
          productId: product.id, slug, nameFr: name, hex, family, position: i,
          aliases: [...new Set([...(ALIASES[name] ?? []), ...(old?.aliases ?? [])])],
          icecatId: old?.icecatId ?? null, icecatMatch: old?.icecatMatch ?? null,
        },
      });
      if (old?.images.length) {
        await prisma.catalogImage.createMany({ data: old.images.map((img) => ({ ...img, finishId: finish.id })) });
        photoCount += old.images.length;
      }
      finishes.push(finish);
    }

    let position = 0;
    for (const { storage, ram, option, colorIdx, si, ri, oi } of lineup(p)) {
      const color = p.colors[colorIdx][0];
      const finish = finishes[colorIdx];
      const step = si * (p.storageStep ?? 0) + ri * (p.ramStep ?? 0) + oi * (p.optionStep ?? 0);
      const newPrice = p.newPrice + Math.round(step * 2.2);
      const variant = await prisma.variant.create({
        data: {
          productId: product.id, storageGb: storage, ramGb: ram, option, finishId: finish.id, position: position++, newPriceMillimes: newPrice * 1000,
          signature: variantSignature({ storageGb: storage, ramGb: ram, option, finishSlug: finish.slug }),
        },
      });
      variantCount++;
      variantIds[[p.slug, storage, ram, option, color].map(String).join("|")] = variant.id;
    }

    // The demo stock: only these units are for sale
    for (const [i, [storage, ram, option, color, grade, price, battery, shop]] of (STOCK[p.slug] ?? []).entries()) {
      const variantId = variantIds[[p.slug, storage, ram, option, color].map(String).join("|")];
      if (!variantId) throw new Error(`Seed error: ${p.slug} has no variant ${storage}|${ram}|${option}|${color}`);
      const k = hash(`${p.slug}|${i}`);
      offerCount++;
      await prisma.offer.create({
        data: {
          variantId, vendorId: vendors[shop].id, conditionGrade: grade, batteryHealth: battery, warrantyMonths: SHOP_WARRANTY[shop],
          priceMillimes: price * 1000, sellerNote: NOTES[k % NOTES.length], status: "ACTIVE",
          imei: p.kind === "PHONE" ? `35${String(k).padStart(13, "0").slice(0, 13)}` : null,
          createdAt: daysAgo(3 + (k % 30)),
        },
      });
    }
  }
  console.log(`✓ ${PRODUCTS.length} products, ${finishCount} finishes, ${variantCount} variants, ${offerCount} units for sale, ${photoCount} catalog photos kept`);

  // Demo "real photos": SmartFix's Galaxy S23 unit gets 3 photos. Stand-ins borrowed from the
  // catalog shots of that color (no real unit photos in a seed); a store would upload its own.
  const shown = await prisma.offer.findFirst({
    where: { vendorId: vendors[2].id, conditionGrade: BON, variant: { product: { slug: "samsung-galaxy-s23" }, finish: { slug: slugify("Noir fantôme") } } },
    include: { variant: { include: { finish: { include: { images: { orderBy: { position: "asc" } } } } } } },
  });
  const stand = (shown?.variant.finish.images ?? []).filter((img) => img.angle !== "FRONT").slice(0, 3);
  if (shown && stand.length) {
    await prisma.offerPhoto.createMany({ data: stand.map((img, i) => ({ offerId: shown.id, key: img.key, width: img.width, height: img.height, position: i })) });
  } else console.warn("⚠ No catalog photos for Galaxy S23 Noir fantôme: run npm run images:sync, then reseed for the photo demo");

  // Reason tags on the home page: one fresh arrival, one price drop
  const fresh = await prisma.offer.findFirst({ where: { variant: { product: { slug: "iphone-15" } }, conditionGrade: TRES_BON } });
  if (fresh) await prisma.offer.update({ where: { id: fresh.id }, data: { createdAt: daysAgo(0.3) } });
  const drop = await prisma.offer.findFirst({ where: { variant: { product: { slug: "samsung-galaxy-s24" } }, conditionGrade: BON } });
  if (drop) await prisma.offer.update({ where: { id: drop.id }, data: { previousPriceMillimes: drop.priceMillimes + 100_000, priceChangedAt: daysAgo(1) } });

  // One offer waiting for moderation (not visible to buyers)
  await prisma.offer.create({
    data: { variantId: variantIds["iphone-12|64|null|null|Bleu"], vendorId: vendors[0].id, conditionGrade: BON, batteryHealth: 84, priceMillimes: 999_000, status: "PENDING_REVIEW", imei: "356789012345678" },
  });

  // ── Orders (give the client & partner spaces something real to show) ──
  let orderSeq = 20400;
  async function order(buyerId: string, items: { key: string; grade: ConditionGrade; price: number }[], status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED", days: number, address = {
    fullName: "Client Bonétat", phone: "+21650111222", governorate: "Sfax", delegation: "Sfax Ville" as string | null, line: "Rue de Marseille 14", notes: null as string | null,
  }) {
    // Each ordered device is its own unit, already sold: the demo stock above stays untouched
    const lines = [];
    for (const [i, it] of items.entries()) {
      if (!variantIds[it.key]) throw new Error(`Seed error: unknown variant key ${it.key}`);
      lines.push(
        await prisma.offer.create({
          data: {
            variantId: variantIds[it.key], vendorId: vendors[(orderSeq + i) % 3].id, conditionGrade: it.grade, batteryHealth: 88,
            warrantyMonths: 12, priceMillimes: it.price * 1000, status: "SOLD", createdAt: daysAgo(days + 5),
          },
          include: { variant: { include: { product: true, finish: true } } },
        })
      );
    }
    if (lines.length === 0) return null;
    const total = lines.reduce((s, o) => s + o.priceMillimes, 0);
    const created = daysAgo(days);
    const delivered = status === "DELIVERED";
    const shipped = status === "SHIPPED" || delivered;
    return prisma.order.create({
      data: {
        number: `BN-${orderSeq++}`, buyerId, status, totalMillimes: total + 8000, shippingFeeMillimes: 8000,
        shippingAddress: address, createdAt: created, deliveredAt: delivered ? daysAgo(days - 2) : null,
        items: {
          create: lines.map((o) => {
            const v = o.variant;
            const parts = [v.ramGb ? `${v.ramGb} Go` : null, v.storageGb ? (v.product.kind === "LAPTOP" ? `SSD ${v.storageGb} Go` : `${v.storageGb} Go`) : null, v.option, v.finish.nameFr].filter(Boolean);
            return {
              offerId: o.id, vendorId: o.vendorId, priceMillimes: o.priceMillimes, commissionMillimes: calcCommission(o.priceMillimes),
              title: v.product.brand === "Apple" ? v.product.model : `${v.product.brand} ${v.product.model}`,
              configLabel: parts.join(", "), grade: o.conditionGrade, batteryHealth: o.batteryHealth, warrantyMonths: 12,
              fulfillmentStatus: delivered ? "DELIVERED" : shipped ? "SHIPPED" : "PENDING", shippedAt: shipped ? daysAgo(days - 1) : null,
            };
          }),
        },
      },
      include: { items: true },
    });
  }

  const yasmineAddr = { fullName: home.fullName, phone: home.phone, governorate: home.governorate, delegation: home.delegation, line: home.line, notes: home.notes };
  const delivered = await order(buyer.id, [{ key: "iphone-13|128|null|null|Rose", grade: TRES_BON, price: 1490 }], "DELIVERED", 26, yasmineAddr);
  await order(buyer.id, [{ key: "iphone-11-pro|256|null|null|Vert nuit", grade: TRES_BON, price: 1290 }], "SHIPPED", 2, yasmineAddr);
  await order(buyer.id, [{ key: "apple-watch-series-8|null|null|41 mm, GPS|Minuit", grade: COMME_NEUF, price: 690 }], "DELIVERED", 70, yasmineAddr);

  // Other buyers: orders partners must ship today, and sales history for the dashboards
  await order(buyers[1].id, [{ key: "iphone-11-pro|256|null|null|Vert nuit", grade: TRES_BON, price: 1310 }], "CONFIRMED", 0.2);
  await order(buyers[2].id, [{ key: "iphone-13|128|null|null|Minuit", grade: BON, price: 1290 }], "PENDING", 0.1, { fullName: "Rania Mansour", phone: "+21698765432", governorate: "Ariana", delegation: "La Soukra", line: "Résidence Les Jasmins, B12", notes: null });
  await order(buyers[3].id, [{ key: "iphone-12|64|null|null|Bleu", grade: TRES_BON, price: 1050 }, { key: "samsung-galaxy-a54|128|null|null|Awesome Graphite", grade: BON, price: 790 }], "CONFIRMED", 0.6, { fullName: "Youssef Hamdi", phone: "+21620333444", governorate: "Monastir", delegation: "Monastir", line: "Avenue de l’Environnement 33", notes: null });
  const history: [string, ConditionGrade, number][] = [
    ["iphone-11|64|null|null|Noir", BON, 690], ["iphone-13|128|null|null|Minuit", CORRECT, 1190], ["iphone-11|128|null|null|Violet", TRES_BON, 840],
    ["samsung-galaxy-a54|128|null|null|Awesome Graphite", BON, 790], ["macbook-air-m1|256|8|null|Gris sidéral", COMME_NEUF, 1990],
  ];
  for (let i = 0; i < 14; i++) {
    const [key, grade, price] = history[i % history.length];
    await order(buyers[1 + (i % 3)].id, [{ key, grade, price }], "DELIVERED", 3 + i * 2);
  }

  if (delivered) {
    // Yasmine still has to review this one; the older watch order is reviewed
    const watchOrder = await prisma.order.findFirst({ where: { buyerId: buyer.id, items: { some: { title: { contains: "Watch" } } } }, include: { items: true } });
    if (watchOrder) {
      await prisma.review.create({ data: { orderItemId: watchOrder.items[0].id, buyerId: buyer.id, vendorId: watchOrder.items[0].vendorId, rating: 5, comment: "Montre impeccable, bracelet neuf comme promis. Livrée en 2 jours." } });
    }
  }
  const otherDelivered = await prisma.orderItem.findMany({ where: { order: { status: "DELIVERED", buyerId: { not: buyer.id } } }, take: 6, include: { order: true } });
  const comments = [
    "Reçu en deux jours, batterie comme annoncé. J’ai payé au livreur après avoir allumé le téléphone devant lui.",
    "Petite trace sur le contour, rien sur l’écran. Exactement ce qui était décrit.",
    "Très bon contact avec le service client quand j’ai voulu changer d’adresse.",
    "Je recommande, c’est la première fois que j’achète d’occasion sans stresser.",
    null, "Rapport qualité-prix imbattable.",
  ];
  for (const [i, it] of otherDelivered.entries()) {
    await prisma.review.create({ data: { orderItemId: it.id, buyerId: it.order.buyerId, vendorId: it.vendorId, rating: i === 1 ? 4 : 5, comment: comments[i] } });
  }

  // ── Follows & price alerts ──
  for (const [key, alert] of [["iphone-14-pro|256|null|null|Violet intense", 2300], ["iphone-15|128|null|null|Vert", 2500], ["macbook-air-m1|256|8|null|Or", 1500]] as const) {
    const variantId = variantIds[key];
    if (!variantId) throw new Error(`Seed error: unknown variant key ${key}`);
    const best = await prisma.offer.findFirst({ where: { variantId, status: "ACTIVE" }, orderBy: { priceMillimes: "asc" } });
    await prisma.favorite.create({
      data: { userId: buyer.id, variantId, alertEnabled: true, alertPriceMillimes: alert * 1000, startPriceMillimes: best ? best.priceMillimes + 40_000 : null },
    });
  }

  // ── Payout history for TechStore ──
  await prisma.payout.createMany({
    data: [
      { vendorId: vendors[0].id, period: "16 au 30 septembre 2026", grossMillimes: 9_140_000, commissionMillimes: 457_000, netMillimes: 8_683_000, status: "PAID", paidAt: daysAgo(7) },
      { vendorId: vendors[0].id, period: "1 au 15 septembre 2026", grossMillimes: 6_380_000, commissionMillimes: 0, netMillimes: 6_380_000, status: "PAID", paidAt: daysAgo(22) },
    ],
  });

  // ── The full catalog (curated + Icecat reference + Wikidata), so stores just pick their model ──
  const built = await buildCatalog();
  console.log(`✓ Catalogue complet : ${built.total} modèles (${Object.entries(built.added).map(([k, n]) => `${n} ${k}`).join(", ")})`);

  console.log("\nSeed complete.\n");
  console.log("Test accounts (the OTP code prints in the server console):");
  console.log("  Admin            +21600000000");
  console.log("  Partner          +21611111111  (TechStore Sousse)");
  console.log("  Partner          +21622222222  (PhoneLand Sfax)");
  console.log("  Partner          +21655555555  (SmartFix Tunis)");
  console.log("  Partner          +21666666666  (MobiCenter Nabeul)");
  console.log("  Partner pending  +21633333333");
  console.log("  Client           +21644444444  (Yasmine, has orders, devices, alerts)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
