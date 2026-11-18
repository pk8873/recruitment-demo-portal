import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { BadgeCheck, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type AdminLoginProps = { initialMessage?: string };

export function AdminLogin({ initialMessage = "" }: AdminLoginProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) throw new Error("Those sign-in details could not be verified.");
      const { data: isAdmin, error: permissionError } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
      if (permissionError || !isAdmin) {
        await supabase.auth.signOut();
        throw new Error("This account does not have manager access.");
      }
      await router.navigate({ to: "/admin" });
      await router.invalidate();
    } catch (error) {
      const description = error instanceof Error ? error.message : "Please check your details and try again.";
      setMessage(description);
      toast.error(description);
    } finally {
      setIsBusy(false);
    }
  }

  return <div className="admin-login-wrap"><div className="admin-login-mark"><KeyRound /></div><div className="section-kicker">RESTRICTED ACCESS</div><h1>Manager sign in</h1><p>Sign in with the approved manager email to manage demo banks, vacancies, and submissions.</p>{message && <div className="admin-alert" role="alert"><ShieldCheck />{message}</div>}<form className="admin-login-form" onSubmit={onSubmit}><div className="form-field"><Label htmlFor="admin-email">Manager email</Label><Input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="form-field"><Label htmlFor="admin-password">Password</Label><Input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div><Button className="button-forest" type="submit" disabled={isBusy}>{isBusy ? "Checking access…" : "Sign in securely"}<BadgeCheck /></Button></form><div className="admin-login-note"><ShieldCheck /><span>Only approved email addresses can access applicant records.</span></div></div>;
}