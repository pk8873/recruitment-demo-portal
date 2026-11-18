import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, Building2, CalendarDays, Check, FileCheck2, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecruitmentShell } from "@/components/recruitment-shell";
import { getRecruitmentHome } from "@/lib/recruitment.functions";
import recruitmentOffice from "@/assets/recruitment-office.jpg";

const homeOptions = queryOptions({ queryKey: ["recruitment-home"], queryFn: () => getRecruitmentHome() });

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeOptions),
  head: () => ({ meta: [
    { title: "Career opportunities · Recruitment Demo Portal" },
    { name: "description", content: "Explore fictional bank careers and try a complete, safe recruitment application and receipt." },
    { property: "og:title", content: "Career opportunities · Recruitment Demo Portal" },
    { property: "og:description", content: "Browse sample openings and try a professional, demo-only recruitment journey." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: HomePage,
});

function HomePage() {
  const { data } = useSuspenseQuery(homeOptions);
  const featured = data.vacancies[0];
  return <RecruitmentShell>
    <section className="home-hero">
      <img className="hero-photo" src={recruitmentOffice} alt="Modern, sunlit office meeting room" />
      <div className="hero-content">
        <div className="hero-eyebrow"><span />A CAREER PORTAL, BUILT FOR THE REAL WORLD</div>
        <h1>Find work that<br />moves you <span>forward.</span></h1>
        <p className="hero-lede">Discover thoughtfully designed sample opportunities and experience a complete, modern application journey.</p>
        <div className="hero-actions"><Button asChild className="button-forest" size="lg"><a href="/vacancies">Explore vacancies <ArrowRight /></a></Button><a className="hero-secondary" href="#featured-role">See featured role <ArrowDown /></a></div>
        <div className="hero-assurances"><span><ShieldCheck />Secure demo flow</span><i /><span><FileCheck2 />Instant PDF receipt</span></div>
      </div>
      <div className="hero-caption"><span /> A thoughtful way to explore your next step</div>
      <div className="hero-stamp"><BadgeCheck /><span>Fictional positions<br />for demo use only</span></div>
    </section>
    <section className="trust-band"><div className="trust-item"><span className="trust-number">01</span><div><strong>A polished experience</strong><span>Five clear application stages</span></div></div><div className="trust-item"><span className="trust-number">02</span><div><strong>Privacy considered</strong><span>Test with invented details only</span></div></div><div className="trust-item"><span className="trust-number">03</span><div><strong>A receipt to keep</strong><span>Download a demo PDF in a click</span></div></div></section>
    <section className="content-section institution-section">
      <div className="section-intro"><div className="section-kicker">INSTITUTION PROFILES</div><h2>A familiar world.<br />Made for testing.</h2><p>Explore fictional institutions created to demonstrate the full recruitment journey, from first look to final receipt.</p><div className="fictional-note"><span><ShieldCheck /></span><div><strong>Clearly fictional. Always.</strong><p>No real bank or recruitment authority is involved.</p></div></div></div>
      <div className="institution-list">{data.banks.map((bank, index) => <a className="institution-row" href={`/vacancies?bank=${encodeURIComponent(bank.id)}`} key={bank.id}><span className="institution-monogram">{bank.short_name.slice(0, 2) || "DB"}</span><span className="institution-copy"><span>DEMO INSTITUTION · {String(index + 1).padStart(2, "0")}</span><strong>{bank.name}</strong><small>{bank.description || "A fictional institution for application testing."}</small></span><span className="institution-arrow"><ArrowUpRight /></span></a>)}{data.banks.length === 0 && <p className="empty-message">There are no demo institutions to show.</p>}</div>
    </section>
    <section className="featured-section" id="featured-role"><div className="featured-head"><div><div className="section-kicker">OPEN FOR DEMO APPLICATIONS</div><h2>A first look at what’s open.</h2></div><Button asChild variant="outline"><a href="/vacancies">View all vacancies <ArrowRight /></a></Button></div>
      {featured ? <article className="featured-role"><div className="role-brand"><span className="role-emblem"><Building2 /></span><span>{featured.bank.short_name || featured.bank.name}</span></div><div className="role-main"><span className="role-label">FEATURED DEMO ROLE</span><h3>{featured.title}</h3><p>{featured.bank.name} <span>·</span> {featured.department}</p></div><div className="role-meta"><span><UsersRound />{featured.openings} sample openings</span><span><CalendarDays />Closes {formatDate(featured.closing_date)}</span></div><Button asChild className="button-forest"><a href={`/apply/${featured.id}`}>View this role <ArrowRight /></a></Button></article> : <div className="empty-message featured-empty">No demo vacancies are open right now.</div>}
      <div className="featured-foot"><span><Check />Applications take a few minutes to complete</span><span><Check />Optional uploads</span><span><Check />A downloadable demo receipt</span></div>
    </section>
    <section className="safe-use-band"><div className="safe-use-inner"><div><span className="section-kicker">A QUICK, IMPORTANT NOTE</span><h2>Use invented details.<br /><span>Keep your real ones private.</span></h2></div><p>This is an independent software demonstration. Please never enter Aadhaar, PAN, bank details, card information, passwords, or OTPs. Your test application will not reach any actual employer.</p><Button asChild variant="outline"><a href="/vacancies">Browse sample roles <ArrowRight /></a></Button></div></section>
  </RecruitmentShell>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }