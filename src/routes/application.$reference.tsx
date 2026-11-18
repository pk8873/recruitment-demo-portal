import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BadgeCheck, BriefcaseBusiness, CalendarDays, CheckCircle2, Download, FileCheck2, Fingerprint, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecruitmentShell } from "@/components/recruitment-shell";
import { getDemoApplicationReceipt } from "@/lib/recruitment.functions";

export const Route = createFileRoute("/application/$reference")({
  validateSearch: (search: Record<string, unknown>) => ({ token: typeof search["token"] === "string" ? search["token"] : "" }),
  loader: ({ context, params, location }) => {
    const token = new URLSearchParams(location.search).get("token") ?? "";
    return context.queryClient.ensureQueryData(receiptOptions(params.reference, token));
  },
  head: ({ loaderData }) => ({ meta: [
    { title: `Demo receipt · ${loaderData?.full_name ?? "Applicant"} · Recruitment Demo Portal` },
    { name: "description", content: "Confirmation and printable PDF receipt for a fictional demo recruitment application." },
    { property: "og:title", content: "Demo submission recorded · Recruitment Demo Portal" },
    { property: "og:description", content: "View the confirmation and download your fictional demo application receipt." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ConfirmationPage,
});

function receiptOptions(reference: string, token: string) {
  return queryOptions({ queryKey: ["recruitment-receipt", reference, token], queryFn: () => getDemoApplicationReceipt({ data: { reference, token } }) });
}

function ConfirmationPage() {
  const { reference } = Route.useParams();
  const { token } = Route.useSearch();
  const { data: application } = useSuspenseQuery(receiptOptions(reference, token));
  const getReceipt = useServerFn(getDemoApplicationReceipt);
  const [creatingPdf, setCreatingPdf] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  async function downloadPdf() {
    setCreatingPdf(true);
    setReceiptError("");
    try {
      const receipt = await getReceipt({ data: { reference, token } });
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ format: "a4", unit: "mm" });
      const left = 19;
      const contentWidth = 172;
      let y = 19;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("RECRUITMENT DEMO PORTAL", left, y);
      doc.setTextColor(159, 83, 55);
      doc.text("NOT AN OFFICIAL BANK WEBSITE · TEST RECEIPT ONLY", left, y + 7);
      doc.setTextColor(36, 54, 47);
      y += 22;
      doc.setFontSize(18);
      doc.text("Application receipt", left, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(receipt.bank_name, left, y + 8);
      doc.text(receipt.vacancy_title, left, y + 14);
      doc.text(`Reference: ${receipt.reference}`, left, y + 22);
      doc.text(`Submitted: ${formatDate(receipt.submitted_at)}`, left, y + 28);
      y += 39;
      const rows: Array<[string, string]> = [
        ["Applicant", receipt.full_name], ["Date of birth", formatDate(receipt.date_of_birth)], ["Gender", receipt.gender],
        ["Location", `${receipt.city}, ${receipt.state}, ${receipt.postal_code}, ${receipt.country}`],
        ["Email / phone", `${receipt.email || "Not provided"} / ${receipt.phone || "Not provided"}`],
        ["Qualification", `${receipt.qualification} — ${receipt.institution} (${receipt.passing_year})`],
        ["Grade", receipt.grade || "Not provided"], ["Employment", `${receipt.employment_status} — ${receipt.experience || "Not specified"}`],
        ["Organization", receipt.organization || "Not provided"], ["Skills", receipt.skills || "Not provided"],
        ["Department", receipt.department], ["Profile photo", receipt.photo_name], ["Supporting document", receipt.supporting_document_name],
        ["Status", "DEMO SUBMISSION RECORDED"],
      ];
      for (const [label, value] of rows) {
        const wrapped = doc.splitTextToSize(value, 119);
        const rowHeight = Math.max(9, wrapped.length * 4.4 + 4);
        if (y + rowHeight > 244) { doc.addPage(); y = 19; }
        doc.setFillColor(246, 247, 243);
        doc.rect(left, y, 42, rowHeight, "F");
        doc.setDrawColor(222, 227, 222);
        doc.rect(left, y, contentWidth, rowHeight);
        doc.line(left + 42, y, left + 42, y + rowHeight);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text(doc.splitTextToSize(label, 37), left + 3, y + 6);
        doc.setFont("helvetica", "normal");
        doc.text(wrapped, left + 45, y + 6);
        y += rowHeight;
      }
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(151, 66, 51);
      doc.text("DEMO NOTICE", left, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(74, 77, 72);
      doc.text(doc.splitTextToSize("This is a fictional demonstration application only. It has not been sent to any actual bank, employer, or recruitment authority. No selection, approval, verification, or employment is implied.", contentWidth), left, y + 6);
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFontSize(8);
        doc.setTextColor(100, 107, 101);
        doc.text("DEMO", 105, 152, { align: "center", angle: 35 });
        doc.text(`Page ${page} of ${pageCount}`, 192, 286, { align: "right" });
      }
      doc.save(`demo-application-${receipt.reference.slice(0, 8)}.pdf`);
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : "The demo receipt could not be downloaded. Please try again.");
    } finally {
      setCreatingPdf(false);
    }
  }

  return <RecruitmentShell>
    <section className="confirmation-page">
      <div className="confirmation-art"><span className="confirmation-check"><CheckCircle2 /></span><span className="confirmation-confetti" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /></span><div className="section-kicker">DEMO SUBMISSION RECORDED</div><h1>Application received.</h1><p>Your details have been saved in this fictional demonstration system. They have not been sent to any real bank or employer.</p></div>
      <div className="receipt-card"><div className="receipt-header"><div><span>APPLICATION REFERENCE</span><strong>{application.reference}</strong></div><span className="receipt-status"><BadgeCheck /> DEMO ONLY</span></div><div className="receipt-rows"><ReceiptRow label="Applicant" value={application.full_name} /><ReceiptRow label="Institution" value={application.bank_name} icon={<BriefcaseBusiness />} /><ReceiptRow label="Position" value={`${application.vacancy_title} · ${application.department}`} icon={<BriefcaseBusiness />} /><ReceiptRow label="Submitted" value={formatDate(application.submitted_at)} icon={<CalendarDays />} /><ReceiptRow label="Status" value="Demo submission recorded" icon={<CheckCircle2 />} /></div><div className="receipt-foot"><span><Fingerprint />Your private demo reference</span><span><LockKeyhole />For testing only</span></div></div>
      {receiptError && <div className="form-error" role="alert"><BadgeCheck />{receiptError}</div>}
      <div className="receipt-actions"><Button className="button-forest" size="lg" onClick={downloadPdf} disabled={creatingPdf}>{creatingPdf ? "Preparing your receipt…" : "Download PDF receipt"}<Download /></Button><span>Save a copy of this fictional demo receipt.</span></div>
      <div className="confirmation-bottom"><FileCheck2 /><span>Every page of the PDF receipt is marked DEMO.</span></div><a className="back-home" href="/"><ArrowLeft /> Return to the demo portal</a>
    </section>
  </RecruitmentShell>;
}

function ReceiptRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) { return <div className="receipt-row"><span>{icon}{label}</span><strong>{value}</strong></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(value)); }