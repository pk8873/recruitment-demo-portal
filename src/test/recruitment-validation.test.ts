import { describe, expect, it } from "vitest";
import { demoReceiptRequestSchema, MAX_DOCUMENT_BYTES, MAX_PHOTO_BYTES, recruitmentApplicationSchema, validateUploadSize } from "@/lib/recruitment-validation";

const application = {
  submission_token: "10f84855-d0c9-4e13-a6ee-0748daa23c98",
  vacancy_id: "20000000-0000-4000-8000-000000000001",
  full_name: "Demo Applicant",
  date_of_birth: "1998-04-12",
  gender: "Prefer not to say",
  city: "Demo City",
  state: "Demo State",
  postal_code: "000000",
  country: "India",
  email: "",
  phone: "",
  qualification: "Graduation",
  institution: "Demo Institute",
  passing_year: 2020,
  grade: "",
  employment_status: "Fresher",
  experience: "",
  organization: "",
  skills: "",
  demo_acknowledged: true,
  company_website: "",
};

describe("recruitment application safety rules", () => {
  it("allows applicant photos up to 3 MB and rejects larger files", () => {
    expect(MAX_PHOTO_BYTES).toBe(3 * 1024 * 1024);
    expect(validateUploadSize("photo", 3 * 1024 * 1024)).toBe(true);
    expect(validateUploadSize("photo", 3 * 1024 * 1024 + 1)).toBe(false);
  });

  it("allows supporting documents up to 5 MB and rejects larger files", () => {
    expect(MAX_DOCUMENT_BYTES).toBe(5 * 1024 * 1024);
    expect(validateUploadSize("document", 5 * 1024 * 1024)).toBe(true);
    expect(validateUploadSize("document", 5 * 1024 * 1024 + 1)).toBe(false);
  });

  it("requires an affirmative demo-only acknowledgement", () => {
    expect(recruitmentApplicationSchema.safeParse(application).success).toBe(true);
    expect(recruitmentApplicationSchema.safeParse({ ...application, demo_acknowledged: false }).success).toBe(false);
  });

  it("requires the separate private receipt token as well as its reference", () => {
    expect(demoReceiptRequestSchema.safeParse({ reference: application.vacancy_id }).success).toBe(false);
    expect(demoReceiptRequestSchema.safeParse({ reference: application.vacancy_id, token: application.submission_token }).success).toBe(true);
  });
});