import * as z from "zod";
import { isValidCameroonMobileInput } from "@/lib/cameroonPhone";

export const addMemberSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["organizer", "manager", "driver", "mechanic"]),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || isValidCameroonMobileInput(val.trim()),
      { message: "Numéro mobile Cameroun invalide (ex. 6XX XXX XXX ou +237…)" },
    ),
});

export type AddMemberFormValues = z.infer<typeof addMemberSchema>;
