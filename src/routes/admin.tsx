import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, Building2, CalendarDays, Check, ChevronDown, CircleAlert, FileText, Filter, Landmark, LogOut, Search, ShieldCheck, Trash2, UsersRound, BriefcaseBusiness, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AdminLogin } from "@/components/admin-login";
import { RecruitmentShell } from "@/components/recruitment-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createAdminBank, createAdminVacancy, createApplicationDownloadLink, deleteAdminApplication, deleteAdminVacancy, getAdminDashboard, updateAdminBank, updateAdminVacancy } from "@/lib/recruitment.functions";

const dashboardKey = ["recruitment-admin-dashboard"];

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Manager area · Recruitment Demo Portal" },
    { name: "description", content: "Manage fictional institutions, sample vacancies, and demo application submissions." },
    { property: "og:title", content: "Manager area · Recruitment Demo Portal" },
    { property: "og:description", content: "Secure management for the fictional Recruitment Demo Portal." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AdminRoute,
});

function AdminRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [isAdministrator, setIsAdministrator] = useState(false);

  useEffect(() => {
    let active = true;
    const checkAccount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (user) {
        const { data: permitted } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (!active) return;
        setAccountEmail(user.email ?? "Manager");
        setIsAdministrator(permitted === true);
        if (permitted !== true) {
          await supabase.auth.signOut();
          setAccountEmail("");
        }
      }
      setSessionChecked(true);
    };
    void checkAccount();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void router.invalidate();
        if (event === "SIGNED_IN") void queryClient.invalidateQueries();
        void checkAccount();
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [router, queryClient]);

  if (!sessionChecked) return <RecruitmentShell><div className="admin-loading"><ShieldCheck /><span>Checking manager access…</span></div></RecruitmentShell>;
  if (!isAdministrator) return <RecruitmentShell><div className="admin-public-back"><a href="/"><ArrowLeft />Return to the public site</a></div><AdminLogin /></RecruitmentShell>;
  return <AdminDashboard accountEmail={accountEmail} />;
}

function AdminDashboard({ accountEmail }: { accountEmail: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: dashboardKey, queryFn: () => getAdminDashboard(), staleTime: 0 });
  const [tab, setTab] = useState<"applications" | "vacancies" | "institutions">("applications");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("all");
  const [vacancyDialog, setVacancyDialog] = useState(false);
  const [bankDialog, setBankDialog] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<string | null>(null);
  const [editingBank, setEditingBank] = useState<string | null>(null);
  const doCreateVacancy = useServerFn(createAdminVacancy);
  const doUpdateVacancy = useServerFn(updateAdminVacancy);
  const doDeleteVacancy = useServerFn(deleteAdminVacancy);
  const doCreateBank = useServerFn(createAdminBank);
  const doUpdateBank = useServerFn(updateAdminBank);
  const doDeleteApplication = useServerFn(deleteAdminApplication);
  const doDownload = useServerFn(createApplicationDownloadLink);

  const items = dashboard.data;
  const filteredApplications = useMemo(() => (items?.applications ?? []).filter((application) => {
    const text = `${application.full_name} ${application.email} ${application.phone} ${application.vacancy_title} ${application.bank_name} ${application.reference}`.toLowerCase();
    return (!filter || text.includes(filter.toLowerCase())) && (status === "all" || (status === "files" ? application.files.length > 0 : status === "no-files" ? application.files.length === 0 : true));
  }), [items, filter, status]);
  const filteredVacancies = useMemo(() => (items?.vacancies ?? []).filter((vacancy) => !filter || `${vacancy.title} ${vacancy.department} ${vacancy.bank_name}`.toLowerCase().includes(filter.toLowerCase())), [items, filter]);
  const filteredBanks = useMemo(() => (items?.banks ?? []).filter((bank) => !filter || `${bank.name} ${bank.short_name}`.toLowerCase().includes(filter.toLowerCase())), [items, filter]);

  async function refresh(message: string) { await queryClient.invalidateQueries({ queryKey: dashboardKey }); toast.success(message); setEditingVacancy(null); setEditingBank(null); setVacancyDialog(false); setBankDialog(false); }

  async function handleSignOut() {
    await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); await router.navigate({ to: "/" }); await router.invalidate();
  }

  async function openFile(path: string) {
    try { const result = await doDownload({ data: { path } }); window.open(result.url, "_blank", "noopener,noreferrer"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "This file could not be opened."); }
  }

  async function removeApplication(reference: string) {
    if (!window.confirm("Permanently remove this demo submission and its private uploaded files?")) return;
    try { await doDeleteApplication({ data: { reference } }); await refresh("Demo submission and its files removed."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The demo submission could not be removed."); }
  }

  async function removeVacancy(id: string) {
    if (!window.confirm("Remove this vacancy? Vacancies with submitted applications cannot be removed.")) return;
    try { await doDeleteVacancy({ data: { id } }); await refresh("Demo vacancy removed."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The demo vacancy could not be removed."); }
  }

  if (dashboard.isPending) return <RecruitmentShell><div className="admin-loading"><ShieldCheck /><span>Loading your demo manager…</span></div></RecruitmentShell>;
  if (dashboard.isError || !items) return <RecruitmentShell><div className="admin-error"><CircleAlert /><h2>Your demo records could not be loaded.</h2><Button variant="outline" onClick={() => void dashboard.refetch()}>Try again</Button></div></RecruitmentShell>;

  return <RecruitmentShell><section className="admin-dashboard"><header className="admin-heading"><div><div className="section-kicker">CONTROL ROOM · FICTIONAL PORTAL</div><h1>Demo manager</h1><p>Manage sample openings and review fictional submissions.</p></div><div className="admin-account"><span className="admin-avatar"><ShieldCheck /></span><div><strong>{accountEmail}</strong><small>APPROVED MANAGER</small></div><Button aria-label="Sign out" title="Sign out" variant="outline" size="icon" onClick={handleSignOut}><LogOut /></Button></div></header>
    <div className="admin-safety"><ShieldCheck /><span>Independent demo only. Never use this portal to request, store, or review real identity or financial information.</span></div>
    <div className="admin-stat-grid"><StatCard icon={<FileText />} label="DEMO APPLICATIONS" value={items.applications.length} caption="Latest 250 submissions" /><StatCard icon={<BriefcaseBusiness />} label="OPEN VACANCIES" value={items.vacancies.filter((vacancy) => vacancy.active).length} caption="Visible to applicants" /><StatCard icon={<Landmark />} label="DEMO INSTITUTIONS" value={items.banks.length} caption="Fictional bank profiles" /><StatCard icon={<ArrowDownToLine />} label="PRIVATE FILES" value={items.applications.reduce((sum, application) => sum + application.files.length, 0)} caption="Access limited to managers" /></div>
    <div className="admin-tabs" role="tablist"><AdminTab active={tab === "applications"} onClick={() => setTab("applications")} icon={<FileText />}>Applications <span>{items.applications.length}</span></AdminTab><AdminTab active={tab === "vacancies"} onClick={() => setTab("vacancies")} icon={<BriefcaseBusiness />}>Vacancies <span>{items.vacancies.length}</span></AdminTab><AdminTab active={tab === "institutions"} onClick={() => setTab("institutions")} icon={<Building2 />}>Institutions <span>{items.banks.length}</span></AdminTab></div>
    <div className="admin-toolbar"><label className="admin-search"><Search /><Input aria-label={`Search ${tab}`} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={tab === "applications" ? "Search name, email, role, reference" : "Search by name, role, or institution"} /></label>{tab === "applications" && <Select value={status} onValueChange={setStatus}><SelectTrigger className="admin-filter"><Filter /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All applications</SelectItem><SelectItem value="files">With uploaded files</SelectItem><SelectItem value="no-files">Without files</SelectItem></SelectContent></Select>}{tab === "vacancies" && <Button className="button-forest" onClick={() => setVacancyDialog(true)}>New vacancy <ArrowRight /></Button>}{tab === "institutions" && <Button className="button-forest" onClick={() => setBankDialog(true)}>New institution <ArrowRight /></Button>}</div>
    {tab === "applications" && <div className="admin-table-wrap"><div className="admin-table-head"><span>SUBMITTED DEMO APPLICATIONS</span><span>{filteredApplications.length} RECORDS</span></div>{filteredApplications.length ? <div className="admin-application-list">{filteredApplications.map((application) => <article className="admin-application" key={application.reference}><div className="admin-applicant-mark">{application.full_name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase()}</div><div className="admin-applicant-main"><div><h2>{application.full_name}</h2><span className="admin-status"><Check /> DEMO</span></div><p>{application.email || "No email"}{application.phone ? ` · ${application.phone}` : ""}</p><small>{application.vacancy_title} · {application.bank_name}</small><div className="admin-app-extra"><span>{application.qualification} · {application.institution} ({application.passing_year})</span><span>{application.city}, {application.state}</span><span>{application.employment_status}</span></div><div className="admin-file-list">{application.files.map((file) => <button key={file.path} type="button" onClick={() => void openFile(file.path)}><FileText />{file.path.split("/").at(-1) ?? "Uploaded file"}<ExternalLink /></button>)}{application.files.length === 0 && <span>No uploads</span>}</div></div><div className="admin-application-actions"><span><CalendarDays />{formatDate(application.submitted_at)}</span><code>{application.reference.slice(0, 8).toUpperCase()}</code><Button className="admin-remove" variant="ghost" size="icon" title="Remove this demo application" aria-label={`Remove application from ${application.full_name}`} onClick={() => void removeApplication(application.reference)}><Trash2 /></Button></div></article>)}</div> : <EmptyState icon={<FileText />} title="No demo applications yet" copy="Fictional application submissions will appear here when people try a sample vacancy." />}</div>}
    {tab === "vacancies" && <div className="admin-table-wrap"><div className="admin-table-head"><span>FICTIONAL VACANCIES</span><span>{filteredVacancies.length} LISTINGS</span></div>{filteredVacancies.length ? <div className="admin-simple-list">{filteredVacancies.map((vacancy) => <article key={vacancy.id}><span className="admin-list-icon"><BriefcaseBusiness /></span><div><div className="admin-row-title"><h2>{vacancy.title}</h2><span className={vacancy.active ? "admin-active" : "admin-inactive"}>{vacancy.active ? "LIVE IN DEMO" : "PAUSED"}</span></div><p>{vacancy.bank_name} · {vacancy.department}</p><small>{vacancy.openings} sample openings · Closes {formatDate(vacancy.closing_date)} · {vacancy.qualification}</small></div><div className="admin-list-actions"><Button variant="outline" size="sm" onClick={() => setEditingVacancy(vacancy.id)}>Edit</Button><Button variant="ghost" size="icon" aria-label={`Remove ${vacancy.title}`} title="Remove vacancy" onClick={() => void removeVacancy(vacancy.id)}><Trash2 /></Button></div></article>)}</div> : <EmptyState icon={<BriefcaseBusiness />} title="No matching vacancies" copy="Adjust your search or create a new fictional opening." />}</div>}
    {tab === "institutions" && <div className="admin-table-wrap"><div className="admin-table-head"><span>FICTIONAL BANK PROFILES</span><span>{filteredBanks.length} INSTITUTIONS</span></div>{filteredBanks.length ? <div className="admin-simple-list">{filteredBanks.map((bank) => <article key={bank.id}><span className="admin-list-icon"><Building2 /></span><div><div className="admin-row-title"><h2>{bank.name}</h2><span className={bank.active ? "admin-active" : "admin-inactive"}>{bank.active ? "ACTIVE" : "PAUSED"}</span></div><p>{bank.short_name || "No short name"}</p><small>{bank.description || "A fictional institution for software demonstration."}</small></div><div className="admin-list-actions"><Button variant="outline" size="sm" onClick={() => setEditingBank(bank.id)}>Edit</Button></div></article>)}</div> : <EmptyState icon={<Building2 />} title="No matching institutions" copy="Adjust your search or create a new fictional institution." />}</div>}
    <div className="admin-dashboard-foot"><ShieldCheck />Applicant details are only available to verified manager accounts. Private file links expire after five minutes.</div>
    </section>
    {vacancyDialog && <VacancyForm banks={items.banks} save={async (payload) => { try { await doCreateVacancy({ data: payload }); await refresh("Fictional vacancy created."); } catch (error) { toast.error(error instanceof Error ? error.message : "The vacancy could not be created."); } }} onClose={() => setVacancyDialog(false)} />}
    {editingVacancy && <VacancyForm banks={items.banks} vacancy={items.vacancies.find((vacancy) => vacancy.id === editingVacancy)} save={async (payload) => { try { await doUpdateVacancy({ data: { ...payload, id: editingVacancy } }); await refresh("Fictional vacancy updated."); } catch (error) { toast.error(error instanceof Error ? error.message : "The vacancy could not be updated."); } }} onClose={() => setEditingVacancy(null)} />}
    {bankDialog && <BankForm save={async (payload) => { try { await doCreateBank({ data: payload }); await refresh("Fictional institution created."); } catch (error) { toast.error(error instanceof Error ? error.message : "The institution could not be created."); } }} onClose={() => setBankDialog(false)} />}
    {editingBank && <BankForm bank={items.banks.find((bank) => bank.id === editingBank)} save={async (payload) => { try { await doUpdateBank({ data: { ...payload, id: editingBank } }); await refresh("Fictional institution updated."); } catch (error) { toast.error(error instanceof Error ? error.message : "The institution could not be updated."); } }} onClose={() => setEditingBank(null)} />}
  </RecruitmentShell>;
}

function StatCard({ icon, label, value, caption }: { icon: React.ReactNode; label: string; value: number; caption: string }) { return <article className="admin-stat"><span>{icon}</span><div><small>{label}</small><strong>{value.toLocaleString("en-IN")}</strong><p>{caption}</p></div></article>; }
function AdminTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) { return <button className={active ? "active" : ""} type="button" role="tab" aria-selected={active} onClick={onClick}>{icon}{children}</button>; }
function EmptyState({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) { return <div className="admin-empty"><span>{icon}</span><h2>{title}</h2><p>{copy}</p></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }

function VacancyForm({ banks, vacancy, save, onClose }: { banks: Array<{ id: string; name: string; active: boolean }>; vacancy?: { id: string; bank_id: string; title: string; department: string; openings: number; qualification: string; age_criteria: string; description: string; selection_process: string; opening_date: string; closing_date: string; active: boolean } | undefined; save: (data: { bank_id: string; title: string; department: string; openings: number; qualification: string; age_criteria: string; description: string; selection_process: string; opening_date: string; closing_date: string; active: boolean }) => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); const values = new FormData(event.currentTarget); await save({ bank_id: String(values.get("bank_id")), title: String(values.get("title")).trim(), department: String(values.get("department")).trim(), openings: Number(values.get("openings")), qualification: String(values.get("qualification")).trim(), age_criteria: String(values.get("age_criteria")).trim(), description: String(values.get("description")).trim(), selection_process: String(values.get("selection_process")).trim(), opening_date: String(values.get("opening_date")), closing_date: String(values.get("closing_date")), active: values.get("active") === "on" }); setBusy(false); }
  return <Modal title={vacancy ? "Edit demo vacancy" : "Create demo vacancy"} onClose={onClose}><form className="admin-form" onSubmit={(event) => void onSubmit(event)}><div className="form-field"><Label htmlFor="vacancy-title">Job title</Label><Input id="vacancy-title" name="title" defaultValue={vacancy?.title} placeholder="Junior Banking Associate (Demo)" required maxLength={150} /></div><div className="form-grid"><div className="form-field"><Label htmlFor="vacancy-bank">Demo institution</Label><select className="form-select" id="vacancy-bank" name="bank_id" defaultValue={vacancy?.bank_id ?? banks.find((bank) => bank.active)?.id ?? ""} required>{banks.filter((bank) => bank.active).map((bank) => <option value={bank.id} key={bank.id}>{bank.name}</option>)}</select></div><div className="form-field"><Label htmlFor="vacancy-department">Department</Label><Input id="vacancy-department" name="department" defaultValue={vacancy?.department ?? "General Banking"} required maxLength={100} /></div><div className="form-field"><Label htmlFor="vacancy-openings">Sample openings</Label><Input id="vacancy-openings" name="openings" type="number" min={1} max={10000} defaultValue={vacancy?.openings ?? 1} required /></div><div className="form-field"><Label htmlFor="vacancy-qualification">Qualification</Label><Input id="vacancy-qualification" name="qualification" defaultValue={vacancy?.qualification} required maxLength={240} /></div><div className="form-field"><Label htmlFor="vacancy-age">Age criteria</Label><Input id="vacancy-age" name="age_criteria" defaultValue={vacancy?.age_criteria ?? "18–30 years (demo criteria)"} required maxLength={120} /></div><div className="form-field"><Label htmlFor="vacancy-process">Selection process</Label><Input id="vacancy-process" name="selection_process" defaultValue={vacancy?.selection_process ?? "Written test · Interview (demo)"} required maxLength={240} /></div><div className="form-field"><Label htmlFor="vacancy-opening-date">Opening date</Label><Input id="vacancy-opening-date" name="opening_date" type="date" defaultValue={vacancy?.opening_date ?? new Date().toISOString().slice(0, 10)} required /></div><div className="form-field"><Label htmlFor="vacancy-closing-date">Closing date</Label><Input id="vacancy-closing-date" name="closing_date" type="date" defaultValue={vacancy?.closing_date} required /></div></div><div className="form-field"><Label htmlFor="vacancy-description">Description</Label><Textarea id="vacancy-description" name="description" defaultValue={vacancy?.description} rows={4} minLength={10} maxLength={5000} required /></div><label className="admin-check-row"><input type="checkbox" name="active" defaultChecked={vacancy?.active ?? true} />Visible to demo applicants</label><div className="admin-modal-actions"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" className="button-forest" disabled={busy}>{busy ? "Saving…" : "Save vacancy"}<Check /></Button></div></form></Modal>;
}

function BankForm({ bank, save, onClose }: { bank?: { id: string; name: string; short_name: string; description: string; active: boolean } | undefined; save: (data: { name: string; short_name: string; description: string; active: boolean }) => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); const values = new FormData(event.currentTarget); await save({ name: String(values.get("name")).trim(), short_name: String(values.get("short_name")).trim(), description: String(values.get("description")).trim(), active: values.get("active") === "on" }); setBusy(false); }
  return <Modal title={bank ? "Edit demo institution" : "Create demo institution"} onClose={onClose}><form className="admin-form" onSubmit={(event) => void onSubmit(event)}><div className="form-field"><Label htmlFor="bank-name">Institution name</Label><Input id="bank-name" name="name" defaultValue={bank?.name} required maxLength={120} /></div><div className="form-field"><Label htmlFor="bank-short">Short name</Label><Input id="bank-short" name="short_name" defaultValue={bank?.short_name} maxLength={24} /></div><div className="form-field"><Label htmlFor="bank-description">Short description</Label><Textarea id="bank-description" name="description" defaultValue={bank?.description} rows={3} maxLength={240} /></div><label className="admin-check-row"><input type="checkbox" name="active" defaultChecked={bank?.active ?? true} />Available to demo applicants</label><div className="admin-modal-actions"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" className="button-forest" disabled={busy}>{busy ? "Saving…" : "Save institution"}<Check /></Button></div></form></Modal>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="admin-modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title"><header><div><div className="section-kicker">FICTIONAL PORTAL SETTINGS</div><h2 id="admin-modal-title">{title}</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog"><ChevronDown /></Button></header>{children}</section></div>; }