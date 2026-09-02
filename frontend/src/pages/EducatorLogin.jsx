import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

export default function EducatorLogin() {
  const nav = useNavigate();
  const { user, setUser } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav(user.role === "educator" ? "/educator" : "/dashboard", { replace: true }); }, [user, nav]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const path = mode === "login" ? "/auth/educator/login" : "/auth/educator/register";
      const { data } = await api.post(path, f);
      setUser(data.user);
      nav("/educator", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2.5 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-bold tracking-tight">CONTINUUM</span>
          </div>
          <p className="text-sm text-muted-foreground text-center mt-1">Educator workspace — upload and manage student records</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex rounded-lg border border-border p-1 mb-5 text-sm">
            <button type="button" data-testid="educator-tab-login" onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              Sign in
            </button>
            <button type="button" data-testid="educator-tab-register" onClick={() => setMode("register")}
              className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              Create account
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Full name</Label>
                <Input data-testid="educator-name" value={f.name} onChange={set("name")} placeholder="Dr. Rao" required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input data-testid="educator-email" type="email" value={f.email} onChange={set("email")} placeholder="you@university.edu" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Password</Label>
              <Input data-testid="educator-password" type="password" value={f.password} onChange={set("password")}
                placeholder="••••••••" minLength={6} required />
            </div>
            <Button type="submit" data-testid="educator-submit" disabled={busy} className="w-full h-11 gap-2 text-sm font-semibold mt-2">
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-5">
          Not an educator? <Link to="/login" className="text-primary hover:underline">Back to main sign in</Link>
        </p>
      </div>
    </div>
  );
}
