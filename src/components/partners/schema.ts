import { z } from "zod";
import { PARTNERS } from "@/content/copy/partners";
import { ENTERPRISE } from "@/content/site";

/** Accepts the v2 enterprise enquiry types (and the legacy partner types). */
export const PARTNER_TYPES = [...ENTERPRISE.form.types, ...PARTNERS.form.types] as readonly string[];

export const partnerSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name.").max(120),
  company: z.string().trim().min(2, "Which company?").max(160),
  email: z.string().trim().toLowerCase().email("That doesn't look like an email address.").max(254).optional(),
  type: z.string().refine((t) => PARTNER_TYPES.includes(t), "Pick an enquiry type."),
  message: z.string().trim().min(10, "A sentence or two, at least.").max(4000),
  /** honeypot: must stay empty */
  website: z.string().max(0).optional(),
});
export type PartnerInput = z.infer<typeof partnerSchema>;

export const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email("That doesn't look like an email address.").max(254),
  website: z.string().max(0).optional(),
});
