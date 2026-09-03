import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function Login() {
  const nav = useNavigate();
  const { user, enterDemo } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav(user.role === "educator" ? "/educator" : "/dashboard", { replace: true }); }, [user, nav]);

  const demo = async () => {
    setBusy(true);
    try { await enterDemo(); nav("/dashboard", { replace: true }); }
    catch { toast.error("Could not start demo. Please try again."); setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      {/* Left — form */}
      <div className="flex flex-col justify-between p-8 lg:p-14">
        <div className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="font-bold tracking-tight text-lg">CONTINUUM</span>
        </div>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-3">Longitudinal Academic Integrity Intelligence</p>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-[1.1]">
            Academic integrity has a memory problem.
          </h1>
          <p className="text-muted-foreground mt-4 text-sm lg:text-base leading-relaxed">
            Understand behavioral change across the academic journey — not a single submission. CONTINUUM builds longitudinal
            academic profiles, surfaces meaningful behavioral changes, and gives educators explainable evidence for human review.
          </p>

          <div className="mt-9 space-y-3">
            <Button data-testid="enter-demo-button" onClick={demo} disabled={busy}
              className="w-full h-11 gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> {busy ? "Loading demo…" : "Enter Demo"}
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-1">
              Investor demo · fictional synthetic data only
            </p>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Link to="/educator/login" data-testid="educator-login-link">
              <Button variant="outline" className="w-full h-11 gap-2 text-sm font-semibold">
                <GraduationCap className="h-4 w-4" /> Sign in as Educator
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground text-center pt-1">
              Educators upload and manage student records in a dedicated workspace
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">© 2026 Continuum · Human-in-the-loop by design</p>
      </div>

      {/* Right — brand panel */}
      <div className="hidden lg:block relative overflow-hidden border-l border-border bg-card/40">
        <div className="absolute inset-0 grid-texture opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/10" />
        <div className="relative h-full flex flex-col justify-center p-14">
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 glow-accent max-w-md">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">Longitudinal intelligence</p>
            <svg viewBox="0 0 400 120" className="w-full h-28 mb-6">
              <line x1="0" y1="90" x2="400" y2="90" stroke="hsl(var(--border))" strokeWidth="1" />
              <path d="M20 80 L110 74 L200 82 L290 70 L370 28" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray="1000" style={{ strokeDashoffset: 0 }} />
              {[[20,80],[110,74],[200,82],[290,70],[370,28]].map(([x,y],i)=>(
                <circle key={i} cx={x} cy={y} r={i===4?6:4} fill={i===4?"hsl(var(--chart-5))":"hsl(var(--primary))"} />
              ))}
            </svg>
            <p className="text-sm text-foreground font-medium leading-relaxed">
              "Continuum doesn't just inspect the submission. It remembers the student."
            </p>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              We don't replace academic integrity teams. We give them memory.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[["5", "Semesters"], ["1", "Baseline"], ["∞", "Continuity"]].map(([n, l]) => (
                <div key={l} className="rounded-lg border border-border bg-background/50 py-3">
                  <div className="text-xl font-bold text-foreground tabular-nums">{n}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
