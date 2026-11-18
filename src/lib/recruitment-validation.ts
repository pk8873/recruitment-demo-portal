import { z } from "zod";

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const recruitmentApplicationSchema = z.object({
  submission_token: z.string().uuid(),
  vacancy_id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(140),
  date_of_birth: z.string().date(),
  gender: z.string().trim().min(1).max(30),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  postal_code: z.string().trim().min(1).max(12),
  country: z.string().trim().min(1).max(60),
  email: z.union([z.literal(""), z.string().email().max(254)]),
  phone: z.string().trim().max(20),
  qualification: z.string().trim().min(1).max(120),
  institution: z.string().trim().min(1).max(160),
  passing_year: z.number().int().min(1900).max(2100),
  grade: z.string().trim().max(30),
  employment_status: z.string().trim().min(1).max(40),
  experience: z.string().trim().max(80),
  organization: z.string().trim().max(140),
  skills: z.string().trim().max(2000),
  demo_acknowledged: z.literal(true),
  photo: z.string().max(4_200_000).optional(),
  supporting_document: z.string().max(7_100_000).optional(),
  company_website: z.string().max(300),
});

export const demoReceiptRequestSchema = z.object({
  reference: z.string().uuid(),
  token: z.string().uuid(),
});

export type RecruitmentApplicationInput = z.infer<typeof recruitmentApplicationSchema>;

export function validateUploadSize(kind: "photo" | "document", byteLength: number): boolean {
  const maximumBytes = kind === "photo" ? MAX_PHOTO_BYTES : MAX_DOCUMENT_BYTES;
  return Number.isInteger(byteLength) && byteLength >= 0 && byteLength <= maximumBytes;
}