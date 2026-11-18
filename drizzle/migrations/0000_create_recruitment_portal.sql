CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recruitment_admin_emails (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.recruitment_admin_emails TO service_role;
ALTER TABLE public.recruitment_admin_emails ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

CREATE POLICY "Users can view their own assigned roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.assign_recruitment_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email_confirmed_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.recruitment_admin_emails WHERE email = lower(NEW.email)
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_recruitment_admin_role() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER assign_recruitment_admin_role_on_verified_account
AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.assign_recruitment_admin_role();

CREATE TABLE public.bank_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  footer_text TEXT NOT NULL DEFAULT '',
  primary_color TEXT NOT NULL DEFAULT '#183b57',
  accent_color TEXT NOT NULL DEFAULT '#bb9657',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bank_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_profiles TO authenticated;
GRANT ALL ON public.bank_profiles TO service_role;
ALTER TABLE public.bank_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitors can view active demo banks" ON public.bank_profiles FOR SELECT TO anon USING (active = TRUE);
CREATE POLICY "Users can view active banks or administrators can view all" ON public.bank_profiles FOR SELECT TO authenticated USING (active = TRUE OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Administrators manage demo banks" ON public.bank_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID NOT NULL REFERENCES public.bank_profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'General Banking',
  openings INTEGER NOT NULL DEFAULT 1 CHECK (openings > 0),
  qualification TEXT NOT NULL DEFAULT 'Graduation in any discipline',
  age_criteria TEXT NOT NULL DEFAULT '18–30 years (demo criteria)',
  description TEXT NOT NULL,
  selection_process TEXT NOT NULL DEFAULT 'Written test · Interview (demo)',
  opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
  closing_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vacancies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacancies TO authenticated;
GRANT ALL ON public.vacancies TO service_role;
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitors can view active demo vacancies" ON public.vacancies FOR SELECT TO anon USING (active = TRUE AND EXISTS (SELECT 1 FROM public.bank_profiles b WHERE b.id = bank_id AND b.active = TRUE));
CREATE POLICY "Users can view active vacancies or administrators can view all" ON public.vacancies FOR SELECT TO authenticated USING ((active = TRUE AND EXISTS (SELECT 1 FROM public.bank_profiles b WHERE b.id = bank_id AND b.active = TRUE)) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Administrators manage demo vacancies" ON public.vacancies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.applications (
  reference UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_token UUID NOT NULL UNIQUE,
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  qualification TEXT NOT NULL,
  institution TEXT NOT NULL,
  passing_year INTEGER NOT NULL,
  grade TEXT NOT NULL DEFAULT '',
  employment_status TEXT NOT NULL,
  experience TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  skills TEXT NOT NULL DEFAULT '',
  photo_storage_path TEXT,
  supporting_document_storage_path TEXT,
  demo_acknowledged BOOLEAN NOT NULL DEFAULT FALSE CHECK (demo_acknowledged = TRUE),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators manage demo applications" ON public.applications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Administrators manage private applicant files" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'recruitment-applications' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'recruitment-applications' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.bank_profiles (id, name, short_name, description, footer_text)
VALUES ('10000000-0000-4000-8000-000000000001', 'National Finance Demo Bank', 'NFDB', 'A fictional institution for recruitment workflow testing.', 'Independent software demonstration · No real recruitment');

INSERT INTO public.vacancies (id, bank_id, title, department, openings, qualification, age_criteria, description, selection_process, opening_date, closing_date)
VALUES ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Junior Banking Associate (Demo)', 'Branch Operations', 12, 'Graduation in any discipline (sample criteria)', '18–30 years (sample only)', 'A fictional vacancy used to test the recruitment application workflow.', 'Written test · Interview (demo)', DATE '2026-11-17', DATE '2027-01-01');