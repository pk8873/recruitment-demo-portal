import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BriefcaseBusiness, Check, CheckCircle2, ChevronRight, FileText, ImagePlus, LockKeyhole, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecruitmentShell } from "@/components/recruitment-shell";
import { getRecruitmentVacancy, submitDemoApplication } from "@/lib/recruitment.functions";
import { validateUploadSize } from "@/lib/recruitment-validation";

export const Route = createFileRoute("/apply/$vacancyId")({
  loader: ({ params }) => getRecruitmentVacancy({ data: { id: params.vacancyId } }),
  head: ({ loaderData }) => ({ meta: [
    { title: `Demo application · ${loaderData?.title ?? "Vacancy"} · Recruitment Demo Portal` },
    { name: "description", content: "Submit a fictional demo recruitment application using a safe, step-by-step form." },
    { property: "og:title", content: `Demo application · ${loaderData?.title ?? "Vacancy"}` },
    { property: "og:description", content: "Try the sample application journey at the fictional Recruitment Demo Portal." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ApplicationPage,
});

const steps = ["Personal", "Education", "Experience", "Documents", "Review"];
const occupations = ["Fresher", "Currently employed", "Self-employed", "Not currently employed"];
const genders = ["Female", "Male", "Non-binary", "Prefer not to say"];

function ApplicationPage() {
  const vacancy = Route.useLoaderData();
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useServerFn(submitDemoApplication);
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [token, setToken] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => setToken(crypto.randomUUID()), []);

  function changeStep(index: number) {
    setActiveStep(Math.min(steps.length - 1, Math.max(0, index)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateActiveStep() {
    const form = formRef.current;
    const step = form?.querySelector<HTMLElement>(`[data-form-step="${activeStep}"]`);
    if (!form || !step) return false;
    for (const control of Array.from(step.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"))) {
      if (control.type === "file" || control.type === "checkbox" || control.name === "company_website") continue;
      if (!control.checkValidity()) { control.reportValidity(); return false; }
    }
    return true;
  }

  function chooseFile(kind: "photo" | "document", file: File | null) {
    if (file && !validateUploadSize(kind, file.size)) {
      toast.error(kind === "photo" ? "Photo must be 3 MB or smaller." : "Document must be 5 MB or smaller.");
      const input = formRef.current?.elements.namedItem(kind === "photo" ? "photo" : "supporting_document");
      if (input instanceof HTMLInputElement) input.value = "";
      if (kind === "photo") setSelectedPhoto(null); else setSelectedDocument(null);
      return;
    }
    if (file && kind === "photo" && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use a JPG, PNG, or WebP photo.");
      const input = formRef.current?.elements.namedItem("photo");
      if (input instanceof HTMLInputElement) input.value = "";
      setSelectedPhoto(null); return;
    }
    if (file && kind === "document" && file.type !== "application/pdf") {
      toast.error("Use a PDF document.");
      const input = formRef.current?.elements.namedItem("supporting_document");
      if (input instanceof HTMLInputElement) input.value = "";
      setSelectedDocument(null); return;
    }
    if (kind === "photo") setSelectedPhoto(file); else setSelectedDocument(file);
    setErrorMessage("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acknowledged) { setErrorMessage("Confirm that this is a demo application before continuing."); return; }
    if (!token) { setErrorMessage("Your form is still getting ready. Please try again in a moment."); return; }
    const form = formRef.current;
    if (!form) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const values = new FormData(form);
      const rawValue = (field: string) => String(values.get(field) ?? "").trim();
      const photoValue = values.get("photo");
      const documentValue = values.get("supporting_document");
      const photo = photoValue instanceof File && photoValue.size > 0 ? photoValue : null;
      const document = documentValue instanceof File && documentValue.size > 0 ? documentValue : null;
      const [photoData, documentData] = await Promise.all([fileToDataUrl(photo), fileToDataUrl(document)]);
      const result = await submit({ data: {
        submission_token: token,
        vacancy_id: vacancy.id,
        full_name: rawValue("full_name"),
        date_of_birth: rawValue("date_of_birth"),
        gender: rawValue("gender"),
        city: rawValue("city"),
        state: rawValue("state"),
        postal_code: rawValue("postal_code"),
        country: rawValue("country"),
        email: rawValue("email"),
        phone: rawValue("phone"),
        qualification: rawValue("qualification"),
        institution: rawValue("institution"),
        passing_year: Number(rawValue("passing_year")),
        grade: rawValue("grade"),
        employment_status: rawValue("employment_status"),
        experience: rawValue("experience"),
        organization: rawValue("organization"),
        skills: rawValue("skills"),
        demo_acknowledged: true,
        photo: photoData ?? undefined,
        supporting_document: documentData ?? undefined,
        company_website: rawValue("company_website"),
      } });
      await navigate({ to: "/application/$reference", params: { reference: result.reference }, search: { token } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Your demo application could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return <RecruitmentShell>
    <section className="apply-heading"><Link className="back-link" to="/vacancies" search={{ q: "", bank: "" }}><ArrowLeft /> All vacancies</Link><div className="section-kicker">DEMO APPLICATION · {vacancy.bank.short_name || "FICTIONAL INSTITUTION"}</div><div className="apply-title-row"><div><h1>Tell us a little<br />about yourself.</h1><p>{vacancy.title} <span>·</span> {vacancy.department}</p></div><span className="apply-bank-mark"><BriefcaseBusiness /></span></div></section>
    <section className="application-layout">
      <aside className="application-aside"><span className="aside-kicker">YOUR APPLICATION</span><h2>{vacancy.title}</h2><p>{vacancy.bank.name} · {vacancy.department}</p><div className="aside-separator" /><span className="aside-kicker">FIVE SIMPLE STEPS</span><ol className="step-sidebar">{steps.map((step, index) => <li className={activeStep === index ? "current" : activeStep > index ? "complete" : ""} key={step}><span className="step-dot">{activeStep > index ? <Check /> : `0${index + 1}`}</span><span>{step}<small>{stepCaption(index)}</small></span>{activeStep === index && <ChevronRight className="step-current" />}</li>)}</ol><div className="aside-private"><LockKeyhole /><div><strong>Private by design</strong><p>Your details are stored for this fictional demo only.</p></div></div><div className="aside-warning"><ShieldCheck /><p><strong>Use synthetic details.</strong> Never enter real identity or financial information.</p></div></aside>
      <form ref={formRef} className="application-form" onSubmit={onSubmit} noValidate>
        <input type="hidden" name="submission_token" value={token} readOnly /><input type="hidden" name="vacancy_id" value={vacancy.id} readOnly />
        <label className="visually-hidden" htmlFor="company_website">Leave this field empty</label><input className="visually-hidden" id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
        <div className="form-progress"><div><span>APPLICATION PROGRESS</span><strong>STEP 0{activeStep + 1} <i>OF 05</i></strong></div><div className="progress-track"><span style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }} /></div></div>
        {errorMessage && <div className="form-error" role="alert"><ShieldCheck />{errorMessage}</div>}
        <fieldset data-form-step="0" hidden={activeStep !== 0}><legend><span>01</span> Personal details</legend><p className="step-intro">A few details to get your demo application started. Required fields are marked with an asterisk.</p><div className="form-grid">
          <Field label="Full name" name="full_name" placeholder="Your demo name" required maxLength={140} autoComplete="name" /><Field label="Date of birth" name="date_of_birth" type="date" required /><SelectField label="Gender" name="gender" options={genders} required /><Field label="City" name="city" placeholder="City" required maxLength={80} /><Field label="State" name="state" placeholder="State" required maxLength={80} /><Field label="Postal code" name="postal_code" placeholder="PIN code" required maxLength={12} /><Field label="Country" name="country" placeholder="India" required maxLength={60} defaultValue="India" /><Field label="Email address" name="email" type="email" placeholder="Optional demo email" maxLength={254} /><Field label="Phone number" name="phone" type="tel" placeholder="Optional demo number" maxLength={20} />
        </div></fieldset>
        <fieldset data-form-step="1" hidden={activeStep !== 1}><legend><span>02</span> Education details</legend><p className="step-intro">Share the educational background you’d like to use in this sample application.</p><div className="form-grid"><Field label="Highest qualification" name="qualification" placeholder="For example, graduation" required maxLength={120} /><Field label="Institution" name="institution" placeholder="School or college" required maxLength={160} /><Field label="Year of passing" name="passing_year" type="number" placeholder="2024" required min={1900} max={2100} /><Field label="Grade or score" name="grade" placeholder="Optional" maxLength={30} /></div><div className="form-note"><BadgeCheck />This listing’s sample qualification: {vacancy.qualification}</div></fieldset>
        <fieldset data-form-step="2" hidden={activeStep !== 2}><legend><span>03</span> Experience & skills</legend><p className="step-intro">Tell us about the experience and skills you’d use in this fictional scenario.</p><div className="form-grid"><SelectField label="Employment status" name="employment_status" options={occupations} required /><Field label="Experience" name="experience" placeholder="Optional" maxLength={80} /><Field label="Most recent organization" name="organization" placeholder="Optional" maxLength={140} /><TextField label="Skills" name="skills" placeholder="List the skills you’d include in this demo" className="field-wide" maxLength={2000} /></div></fieldset>
        <fieldset data-form-step="3" hidden={activeStep !== 3}><legend><span>04</span> Supporting documents</legend><p className="step-intro">Uploads are optional. Only use sample files without real personal or sensitive information.</p><div className="upload-grid"><UploadField id="photo" icon={<ImagePlus />} title="Profile photo" description="JPG, PNG, or WebP · Up to 3 MB" file={selectedPhoto} accept="image/jpeg,image/png,image/webp" onChange={(file) => chooseFile("photo", file)} /><UploadField id="supporting_document" icon={<FileText />} title="Supporting document" description="PDF · Up to 5 MB" file={selectedDocument} accept="application/pdf" onChange={(file) => chooseFile("document", file)} /></div><div className="form-note"><LockKeyhole />Files are kept private and only included in your demo receipt.</div></fieldset>
        <fieldset data-form-step="4" hidden={activeStep !== 4}><legend><span>05</span> Review & declaration</legend><p className="step-intro">You’re nearly there. Please confirm this is only a fictional demonstration submission.</p><div className="review-summary"><ReviewValue label="Applicant" name="full_name" formRef={formRef} /><ReviewValue label="Role" staticValue={`${vacancy.title} · ${vacancy.bank.name}`} /><ReviewValue label="City & state" name="city" formRef={formRef} suffixName="state" /><ReviewValue label="Qualification" name="qualification" formRef={formRef} /><ReviewValue label="Institution" name="institution" formRef={formRef} /><ReviewValue label="Employment" name="employment_status" formRef={formRef} /><ReviewValue label="Profile photo" staticValue={selectedPhoto?.name ?? "Not uploaded"} /><ReviewValue label="Supporting document" staticValue={selectedDocument?.name ?? "Not uploaded"} /></div><div className="declaration-row"><Checkbox id="demo_acknowledged" checked={acknowledged} onCheckedChange={(value) => { setAcknowledged(value === true); if (value === true) setErrorMessage(""); }} /><Label htmlFor="demo_acknowledged">I understand this is a demo application. My sample information will not be sent to any real bank, employer, or recruitment authority.</Label></div><div className="privacy-confirm"><ShieldCheck /><span>Never include Aadhaar, PAN, bank details, payment-card details, passwords, or OTPs.</span></div></fieldset>
        <div className="form-actions"><Button type="button" variant="outline" disabled={activeStep === 0 || isSaving} onClick={() => changeStep(activeStep - 1)}><ArrowLeft /> Previous</Button><span>All required fields must be completed.</span>{activeStep < steps.length - 1 ? <Button type="button" className="button-forest" onClick={() => { setErrorMessage(""); if (validateActiveStep()) changeStep(activeStep + 1); }}>Continue <ArrowRight /></Button> : <Button type="submit" className="button-forest" disabled={isSaving || !token}>{isSaving ? "Saving demo application…" : "Submit demo application"}<ArrowUpRight /></Button>}</div>
      </form>
    </section><div className="application-disclaimer"><span>NOT AN OFFICIAL BANK WEBSITE</span><span>Fictional demo environment · Use invented information only</span></div>
  </RecruitmentShell>;
}

type FieldProps = React.ComponentProps<typeof Input> & { label: string; name: string };
function Field({ label, name, className, ...props }: FieldProps) { const id = `application-${name}`; return <div className={`form-field ${className ?? ""}`}><Label htmlFor={id}>{label}{props.required && <em> *</em>}</Label><Input id={id} name={name} {...props} /></div>; }
function SelectField({ label, name, options, required }: { label: string; name: string; options: string[]; required?: boolean }) { const id = `application-${name}`; return <div className="form-field"><Label htmlFor={id}>{label}{required && <em> *</em>}</Label><select className="form-select" id={id} name={name} required={required} defaultValue=""><option value="" disabled>Select {label.toLowerCase()}</option>{options.map((option) => <option key={option}>{option}</option>)}</select></div>; }
function TextField({ label, name, className, placeholder, maxLength }: { label: string; name: string; className?: string; placeholder?: string; maxLength?: number }) { const id = `application-${name}`; return <div className={`form-field ${className ?? ""}`}><Label htmlFor={id}>{label}</Label><Textarea id={id} name={name} placeholder={placeholder} rows={4} maxLength={maxLength} /></div>; }
function UploadField({ id, icon, title, description, file, accept, onChange }: { id: string; icon: ReactNode; title: string; description: string; file: File | null; accept: string; onChange: (file: File | null) => void }) { return <div className="upload-card"><input className="upload-input" id={id} name={id} type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0] ?? null)} /><label className="upload-label" htmlFor={id}><span className="upload-icon">{icon}</span><strong>{title}</strong><span>{description}</span>{file ? <span className="upload-file"><CheckCircle2 />{file.name}</span> : <span className="upload-choose"><UploadCloud />Choose a file</span>}</label></div>; }
function ReviewValue({ label, name, formRef, staticValue, suffixName }: { label: string; name?: string; formRef?: RefObject<HTMLFormElement | null>; staticValue?: string; suffixName?: string }) { const primary = name && formRef?.current ? getFieldValue(formRef.current, name) : ""; const suffix = suffixName && formRef?.current ? getFieldValue(formRef.current, suffixName) : ""; const value = name ? [primary, suffix].filter(Boolean).join(", ") || "Not provided" : staticValue ?? "Not provided"; return <div className="review-row"><span>{label}</span><strong>{value}</strong></div>; }
function getFieldValue(form: HTMLFormElement, name: string) { const control = form.elements.namedItem(name); return control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement ? control.value.trim() : ""; }
function stepCaption(step: number) { return ["Your personal details", "Your education", "Experience & skills", "Optional sample files", "Check before submitting"][step] ?? ""; }
function fileToDataUrl(file: File | null): Promise<string | null> { if (!file) return Promise.resolve(null); return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("This file could not be read.")); reader.onerror = () => reject(new Error("This file could not be read.")); reader.readAsDataURL(file); }); }