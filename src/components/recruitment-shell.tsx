import type { ReactNode } from "react";
import { ArrowRight, BadgeCheck, Landmark, LockKeyhole } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type RecruitmentShellProps = { children: ReactNode };

export function RecruitmentShell({ children }: RecruitmentShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="recruitment-app">
      <div className="demo-banner">
        <BadgeCheck aria-hidden="true" size={15} />
        <span>FICTIONAL RECRUITMENT DEMO</span>
        <span className="demo-banner-divider" aria-hidden="true">·</span>
        <span>NOT AN OFFICIAL BANK WEBSITE</span>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="Recruitment Demo Portal home">
            <span className="brand-symbol"><Landmark size={21} strokeWidth={1.8} /></span>
            <span className="brand-name">Recruitment<span>Demo Portal</span></span>
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <Link className={pathname === "/" ? "active" : ""} to="/">Home</Link>
            <Link className={pathname.startsWith("/vacancies") || pathname.startsWith("/apply") ? "active" : ""} to="/vacancies" search={{ q: "", bank: "" }}>Vacancies</Link>
            <Link className={pathname === "/admin" ? "active" : ""} to="/admin">Manager</Link>
          </nav>
          <Button asChild variant="outline" size="sm" className="header-action">
            <Link to="/vacancies" search={{ q: "", bank: "" }}>Explore roles <ArrowRight aria-hidden="true" /></Link>
          </Button>
        </div>
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-mark"><Landmark size={18} aria-hidden="true" /></span>
            <div><strong>Recruitment Demo Portal</strong><span>Independent software demonstration</span></div>
          </div>
          <p className="footer-disclaimer">Fictional institutions and sample openings. No real application is sent to a bank, employer, or recruitment authority.</p>
          <div className="footer-safe"><LockKeyhole size={14} aria-hidden="true" /> Synthetic details only</div>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} Recruitment Demo Portal <span>·</span> For software testing only <span>·</span> <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">Office photo via Unsplash</a></div>
      </footer>
    </div>
  );
}