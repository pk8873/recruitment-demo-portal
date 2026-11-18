import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  demoReceiptRequestSchema,
  recruitmentApplicationSchema,
  validateUploadSize,
} from "@/lib/recruitment-validation";

const vacancyIdInput = z.object({ id: z.string().uuid() });
const applicationReferenceInput = z.object({ reference: z.string().uuid() });
const vacancyAdminInput = z.object({
  bank_id: z.string().uuid(), title: z.string().trim().min(2).max(150),
  department: z.string().trim().min(1).max(100), openings: z.number().int().min(1).max(10000),
  qualification: z.string().trim().min(1).max(240), age_criteria: z.string().trim().min(1).max(120),
  description: z.string().trim().min(10).max(5000), selection_process: z.string().trim().min(1).max(240),
  opening_date: z.string().date(), closing_date: z.string().date(), active: z.boolean(),
});
const bankAdminInput = z.object({ name: z.string().trim().min(2).max(120), short_name: z.string().trim().max(24), description: z.string().trim().max(240), active: z.boolean() });
const bankUpdateInput = z.object({ id: z.string().uuid(), name: z.string().trim().min(2).max(120), short_name: z.string().trim().max(24), description: z.string().trim().max(240), active: z.boolean() });
const vacancyUpdateInput = vacancyAdminInput.extend({ id: z.string().uuid() });

async function requireAdmin(context: { supabase: { rpc: (name: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null; error: unknown }> }; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !isAdmin) throw new Error("Administrator access is required.");
}

type DemoVacancy = {
  id: string;
  bank_id: string;
  title: string;
  department: string;
  openings: number;
  qualification: string;
  age_criteria: string;
  description: string;
  selection_process: string;
  opening_date: string;
  closing_date: string;
  bank: { id: string; name: string; short_name: string; description: string };
};

function combineVacancies(
  vacancies: Array<{
    id: string;
    bank_id: string;
    title: string;
    department: string;
    openings: number;
    qualification: string;
    age_criteria: string;
    description: string;
    selection_process: string;
    opening_date: string;
    closing_date: string;
  }>,
  banks: Array<{ id: string; name: string; short_name: string; description: string }>,
): DemoVacancy[] {
  const byId = new Map(banks.map((bank) => [bank.id, bank]));
  return vacancies.flatMap((vacancy) => {
    const bank = byId.get(vacancy.bank_id);
    return bank ? [{ ...vacancy, bank }] : [];
  });
}

export const getRecruitmentHome = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabasePublic = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const [{ data: banks, error: bankError }, { data: vacancies, error: vacancyError }] =
    await Promise.all([
      supabasePublic
        .from("bank_profiles")
        .select("id, name, short_name, description")
        .eq("active", true)
        .order("name"),
      supabasePublic
        .from("vacancies")
        .select(
          "id, bank_id, title, department, openings, qualification, age_criteria, description, selection_process, opening_date, closing_date",
        )
        .eq("active", true)
        .gte("closing_date", new Date().toISOString().slice(0, 10))
        .order("closing_date"),
    ]);

  if (bankError || vacancyError) throw new Error("Demo listings could not be loaded.");

  return {
    banks: banks ?? [],
    vacancies: combineVacancies(vacancies ?? [], banks ?? []).slice(0, 3),
  };
});

export const getRecruitmentVacancies = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabasePublic = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const [{ data: banks, error: bankError }, { data: vacancies, error: vacancyError }] =
    await Promise.all([
      supabasePublic
        .from("bank_profiles")
        .select("id, name, short_name, description")
        .eq("active", true)
        .order("name"),
      supabasePublic
        .from("vacancies")
        .select(
          "id, bank_id, title, department, openings, qualification, age_criteria, description, selection_process, opening_date, closing_date",
        )
        .eq("active", true)
        .gte("closing_date", new Date().toISOString().slice(0, 10))
        .order("closing_date"),
    ]);

  if (bankError || vacancyError) throw new Error("Demo listings could not be loaded.");
  return { banks: banks ?? [], vacancies: combineVacancies(vacancies ?? [], banks ?? []) };
});

export const getRecruitmentVacancy = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => vacancyIdInput.parse(data))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabasePublic = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const [{ data: banks, error: bankError }, { data: vacancies, error: vacancyError }] =
      await Promise.all([
        supabasePublic
          .from("bank_profiles")
          .select("id, name, short_name, description")
          .eq("active", true),
        supabasePublic
          .from("vacancies")
          .select(
            "id, bank_id, title, department, openings, qualification, age_criteria, description, selection_process, opening_date, closing_date",
          )
          .eq("id", data.id)
          .eq("active", true)
          .gte("closing_date", new Date().toISOString().slice(0, 10)),
      ]);

    if (bankError || vacancyError) throw new Error("This demo vacancy could not be loaded.");
    const vacancy = combineVacancies(vacancies ?? [], banks ?? [])[0];
    if (!vacancy) throw new Error("This demo vacancy is no longer available.");
    return vacancy;
  });

function decodeUpload(dataUrl: string, kind: "photo" | "document") {
  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl);
  if (!match) throw new Error("Choose a valid photo or document file.");
  const contentType = match[1]?.toLowerCase();
  const encoded = match[2];
  if (!contentType || !encoded) throw new Error("Choose a valid photo or document file.");
  const allowed = kind === "photo" ? ["image/jpeg", "image/png", "image/webp"] : ["application/pdf"];
  if (!allowed.includes(contentType)) {
    throw new Error(kind === "photo" ? "Use a JPG, PNG, or WebP photo." : "Use a PDF document.");
  }

  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  if (!validateUploadSize(kind, bytes.byteLength)) {
    throw new Error(kind === "photo" ? "Photo must be 3 MB or smaller." : "Document must be 5 MB or smaller.");
  }

  const matchesSignature =
    contentType === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : contentType === "image/png"
        ? bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
        : contentType === "image/webp"
          ? String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
          : String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";

  if (!matchesSignature) throw new Error("The selected file does not match its file type.");

  return { bytes, contentType };
}

export const submitDemoApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => recruitmentApplicationSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.company_website.length > 0) throw new Error("The application could not be submitted.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: vacancy, error: vacancyError } = await supabaseAdmin.from("vacancies").select("id, bank_id").eq("id", data.vacancy_id).eq("active", true).gte("closing_date", new Date().toISOString().slice(0, 10)).maybeSingle();
    if (vacancyError || !vacancy) throw new Error("This demo vacancy is no longer available.");
    const { data: bank, error: bankError } = await supabaseAdmin.from("bank_profiles").select("id").eq("id", vacancy.bank_id).eq("active", true).maybeSingle();
    if (bankError || !bank) throw new Error("This demo vacancy is no longer available.");

    const reference = crypto.randomUUID();
    const uploadedPaths: string[] = [];
    let photoPath: string | null = null;
    let documentPath: string | null = null;

    try {
      if (data.photo) {
        const photo = decodeUpload(data.photo, "photo");
        const extension = photo.contentType.split("/")[1] === "jpeg" ? "jpg" : photo.contentType.split("/")[1];
        photoPath = `${reference}/photo.${extension}`;
        const { error } = await supabaseAdmin.storage.from("recruitment-applications").upload(photoPath, photo.bytes, { contentType: photo.contentType, upsert: false });
        if (error) throw new Error("The photo upload failed. Try another file.");
        uploadedPaths.push(photoPath);
      }

      if (data.supporting_document) {
        const document = decodeUpload(data.supporting_document, "document");
        documentPath = `${reference}/supporting-document.pdf`;
        const { error } = await supabaseAdmin.storage.from("recruitment-applications").upload(documentPath, document.bytes, { contentType: document.contentType, upsert: false });
        if (error) throw new Error("The document upload failed. Try another file.");
        uploadedPaths.push(documentPath);
      }

      const { error } = await supabaseAdmin.from("applications").insert({
        reference, submission_token: data.submission_token, vacancy_id: data.vacancy_id,
        full_name: data.full_name, date_of_birth: data.date_of_birth, gender: data.gender,
        city: data.city, state: data.state, postal_code: data.postal_code, country: data.country,
        email: data.email, phone: data.phone, qualification: data.qualification,
        institution: data.institution, passing_year: data.passing_year, grade: data.grade,
        employment_status: data.employment_status, experience: data.experience,
        organization: data.organization, skills: data.skills,
        photo_storage_path: photoPath, supporting_document_storage_path: documentPath,
        demo_acknowledged: data.demo_acknowledged,
      });
      if (error) {
        if (error.code === "23505") throw new Error("This form was already submitted. Please start a fresh demo application.");
        throw new Error("Your demo application could not be saved. Please try again.");
      }
      return { reference };
    } catch (error) {
      if (uploadedPaths.length > 0) await supabaseAdmin.storage.from("recruitment-applications").remove(uploadedPaths);
      throw error instanceof Error ? error : new Error("Your demo application could not be saved.");
    }
  });

export const getDemoApplicationReceipt = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => demoReceiptRequestSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: application, error } = await supabaseAdmin
      .from("applications")
      .select(
        "reference, full_name, date_of_birth, gender, city, state, postal_code, country, email, phone, qualification, institution, passing_year, grade, employment_status, experience, organization, skills, photo_storage_path, supporting_document_storage_path, submitted_at, vacancy_id",
      )
      .eq("reference", data.reference)
      .eq("submission_token", data.token)
      .maybeSingle();

    if (error || !application) throw new Error("Demo application not found.");
    const [{ data: vacancies }, { data: banks }] = await Promise.all([
      supabaseAdmin
        .from("vacancies")
        .select("id, bank_id, title, department")
        .eq("id", application.vacancy_id),
      supabaseAdmin.from("bank_profiles").select("id, name"),
    ]);
    const vacancy = vacancies?.[0];
    const bank = banks?.find((item) => item.id === vacancy?.bank_id);
    if (!vacancy || !bank) throw new Error("Demo application not found.");

    return {
      reference: application.reference,
      full_name: application.full_name,
      date_of_birth: application.date_of_birth,
      gender: application.gender,
      city: application.city,
      state: application.state,
      postal_code: application.postal_code,
      country: application.country,
      email: application.email,
      phone: application.phone,
      qualification: application.qualification,
      institution: application.institution,
      passing_year: application.passing_year,
      grade: application.grade,
      employment_status: application.employment_status,
      experience: application.experience,
      organization: application.organization,
      skills: application.skills,
      photo_name: application.photo_storage_path?.split("/").at(-1) ?? "Not uploaded",
      supporting_document_name: application.supporting_document_storage_path?.split("/").at(-1) ?? "Not uploaded",
      submitted_at: application.submitted_at,
      vacancy_title: vacancy.title,
      department: vacancy.department,
      bank_name: bank.name,
    };
  });

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabase } = context;
    const [{ data: banks, error: banksError }, { data: vacancies, error: vacanciesError }, { data: applications, error: applicationsError }] = await Promise.all([
      supabase.from("bank_profiles").select("id, name, short_name, description, active, created_at").order("created_at", { ascending: false }),
      supabase.from("vacancies").select("id, bank_id, title, department, openings, qualification, age_criteria, description, selection_process, opening_date, closing_date, active, created_at").order("created_at", { ascending: false }),
      supabase.from("applications").select("reference, vacancy_id, full_name, date_of_birth, gender, city, state, postal_code, country, email, phone, qualification, institution, passing_year, grade, employment_status, experience, organization, skills, photo_storage_path, supporting_document_storage_path, demo_acknowledged, submitted_at").order("submitted_at", { ascending: false }).limit(250),
    ]);
    if (banksError || vacanciesError || applicationsError) throw new Error("The demo manager could not load its records.");
    const bankById = new Map((banks ?? []).map((bank) => [bank.id, bank]));
    const vacancyById = new Map((vacancies ?? []).map((vacancy) => [vacancy.id, vacancy]));
    return {
      banks: banks ?? [], vacancies: (vacancies ?? []).map((vacancy) => ({ ...vacancy, bank_name: bankById.get(vacancy.bank_id)?.name ?? "Unknown demo institution" })),
      applications: (applications ?? []).map((application) => ({ ...application, vacancy_title: vacancyById.get(application.vacancy_id)?.title ?? "Removed vacancy", bank_name: bankById.get(vacancyById.get(application.vacancy_id)?.bank_id ?? "")?.name ?? "Unknown institution", files: [application.photo_storage_path, application.supporting_document_storage_path].filter((path): path is string => !!path).map((path) => ({ path })) })),
    };
  });

export const createAdminBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bankAdminInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: bank, error } = await context.supabase.from("bank_profiles").insert(data).select("id").single();
    if (error || !bank) throw new Error("The demo institution could not be saved.");
    return { id: bank.id };
  });

export const updateAdminBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bankUpdateInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { id, ...changes } = data;
    const { error } = await context.supabase.from("bank_profiles").update(changes).eq("id", id);
    if (error) throw new Error("The demo institution could not be updated.");
    return { ok: true };
  });

export const createAdminVacancy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => vacancyAdminInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: vacancy, error } = await context.supabase.from("vacancies").insert(data).select("id").single();
    if (error || !vacancy) throw new Error("The demo vacancy could not be saved.");
    return { id: vacancy.id };
  });

export const updateAdminVacancy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => vacancyUpdateInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { id, ...changes } = data;
    const { error } = await context.supabase.from("vacancies").update(changes).eq("id", id);
    if (error) throw new Error("The demo vacancy could not be updated.");
    return { ok: true };
  });

export const deleteAdminApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => applicationReferenceInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: application, error: readError } = await context.supabase.from("applications").select("photo_storage_path, supporting_document_storage_path").eq("reference", data.reference).maybeSingle();
    if (readError || !application) throw new Error("The demo application could not be found.");
    const paths = [application.photo_storage_path, application.supporting_document_storage_path].filter((path): path is string => !!path);
    if (paths.length) {
      const { error: fileError } = await context.supabase.storage.from("recruitment-applications").remove(paths);
      if (fileError) throw new Error("The uploaded files could not be securely removed.");
    }
    const { error } = await context.supabase.from("applications").delete().eq("reference", data.reference);
    if (error) throw new Error("The demo application could not be removed.");
    return { ok: true };
  });

export const deleteAdminVacancy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => vacancyIdInput.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("vacancies").delete().eq("id", data.id);
    if (error) throw new Error("Applications linked to a vacancy must be removed first.");
    return { ok: true };
  });

export const createApplicationDownloadLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ path: z.string().min(1).max(260) }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (!/^[-\da-f]{36}\/(?:photo\.(?:jpg|png|webp)|supporting-document\.pdf)$/i.test(data.path)) throw new Error("This uploaded file could not be found.");
    const { data: url, error } = await context.supabase.storage.from("recruitment-applications").createSignedUrl(data.path, 300);
    if (error || !url?.signedUrl) throw new Error("This uploaded file could not be opened.");
    return { url: url.signedUrl };
  });