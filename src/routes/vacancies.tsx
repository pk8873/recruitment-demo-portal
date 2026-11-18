import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, CalendarDays, ChevronDown, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecruitmentShell } from "@/components/recruitment-shell";
import { getRecruitmentVacancies } from "@/lib/recruitment.functions";

const vacanciesOptions = queryOptions({ queryKey: ["recruitment-vacancies"], queryFn: () => getRecruitmentVacancies() });

export const Route = createFileRoute("/vacancies")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search["q"] === "string" ? search["q"] : "", bank: typeof search["bank"] === "string" ? search["bank"] : "" }),
  loader: ({ context }) => context.queryClient.ensureQueryData(vacanciesOptions),
  head: () => ({ meta: [
    { title: "Sample openings · Recruitment Demo Portal" },
    { name: "description", content: "Search fictional bank vacancies by title and institution in the Recruitment Demo Portal." },
    { property: "og:title", content: "Sample openings · Recruitment Demo Portal" },
    { property: "og:description", content: "Filter fictional opportunities by role or institution, then try the full demo application." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: VacancyListPage,
});

function VacancyListPage() {
  const { data } = useSuspenseQuery(vacanciesOptions);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/vacancies" });
  const [query, setQuery] = useState(search["q"]);
  const visible = data.vacancies.filter((vacancy) => {
    const term = search["q"].toLowerCase().trim();
    return (!term || `${vacancy.title} ${vacancy.department} ${vacancy.description}`.toLowerCase().includes(term)) && (!search["bank"] || vacancy.bank_id === search["bank"]);
  });
  function updateFilters(next: { q: string; bank: string }) { void navigate({ search: next }); }
  return <RecruitmentShell>
    <section className="list-heading"><div className="section-kicker">CAREER OPPORTUNITIES · DEMO</div><div className="list-heading-row"><div><h1>Discover your next move.</h1><p>Thoughtfully presented sample roles at fictional institutions.</p></div><div className="result-count"><strong>{visible.length.toString().padStart(2, "0")}</strong><span>OPEN DEMO ROLES</span></div></div>
      <form className="vacancy-filters" onSubmit={(event) => { event.preventDefault(); updateFilters({ q: query, bank: search["bank"] }); }}><label className="filter-search"><Search /><input aria-label="Search roles" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by role or department" /></label><label className="filter-select"><Building2 /><select aria-label="Filter by institution" value={search["bank"]} onChange={(event) => updateFilters({ q: search["q"], bank: event.target.value })}><option value="">All demo institutions</option>{data.banks.map((bank) => <option value={bank.id} key={bank.id}>{bank.name}</option>)}</select><ChevronDown /></label><Button className="button-forest" type="submit">Search roles <ArrowRight /></Button></form>
    </section>
    <section className="vacancy-results" aria-live="polite"><div className="results-toolbar"><span>SHOWING <strong>{visible.length}</strong> {visible.length === 1 ? "SAMPLE ROLE" : "SAMPLE ROLES"}</span><span>All listings are fictional</span></div>
      {visible.length ? <div className="vacancy-list">{visible.map((vacancy, index) => <article className="vacancy-item" key={vacancy.id}><div className="vacancy-index">{String(index + 1).padStart(2, "0")}</div><div className="vacancy-card-brand"><span><Building2 /></span><small>{vacancy.bank.short_name || vacancy.bank.name}</small></div><div className="vacancy-details"><div className="role-label">FICTIONAL DEMO ROLE</div><h2><Link to="/apply/$vacancyId" params={{ vacancyId: vacancy.id }}>{vacancy.title}</Link></h2><p>{vacancy.bank.name}<span>·</span>{vacancy.department}</p><div className="vacancy-qualification"><span>QUALIFICATION</span><strong>{vacancy.qualification}</strong></div><div className="vacancy-description">{vacancy.description}</div></div><div className="vacancy-side"><span><UsersRound />{vacancy.openings} sample openings</span><span><CalendarDays />Closes {formatDate(vacancy.closing_date)}</span><Button asChild className="button-forest"><Link to="/apply/$vacancyId" params={{ vacancyId: vacancy.id }}>View & apply <ArrowRight /></Link></Button></div></article>)}</div> : <div className="no-results"><span className="no-results-icon"><Search /></span><h2>No matching vacancies</h2><p>Try another job title or choose all demo institutions.</p><Button variant="outline" onClick={() => { setQuery(""); updateFilters({ q: "", bank: "" }); }}>Clear filters</Button></div>}
    </section>
    <section className="privacy-strip"><span className="privacy-mark"><Building2 /></span><div><strong>Designed as an independent demonstration</strong><p>These fictional opportunities are not affiliated with a real bank or hiring authority.</p></div><Link to="/">Read the demo notice <ArrowRight /></Link></section>
  </RecruitmentShell>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }