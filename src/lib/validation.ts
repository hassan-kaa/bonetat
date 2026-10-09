import { z } from "zod";
import { GOVERNORATES } from "./catalog";

export const phoneSchema = z.string().regex(/^\+216\d{8}$/, "Téléphone : +216 suivi de 8 chiffres");

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Donnez un nom à l’adresse").max(40),
  fullName: z.string().trim().min(2, "Indiquez le nom du destinataire").max(80),
  phone: phoneSchema,
  governorate: z.enum(GOVERNORATES as [string, ...string[]], { errorMap: () => ({ message: "Choisissez un gouvernorat" }) }),
  delegation: z.string().trim().max(80).optional().nullable(),
  line: z.string().trim().min(4, "Adresse trop courte").max(200),
  notes: z.string().trim().max(300).optional().nullable(),
  isDefault: z.boolean().optional(),
});
