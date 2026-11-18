DROP POLICY "Visitors can submit acknowledged demo applications" ON public.applications;
REVOKE INSERT ON public.applications FROM anon;