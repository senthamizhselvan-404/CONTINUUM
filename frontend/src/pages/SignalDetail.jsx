import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea } from "recharts";
import { ArrowLeft, Sparkles, HelpCircle, Clock, PenLine, BarChart2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageHeader, Loading, SeverityBadge, StatusBadge, StudentAvatar, ChartCard, TrustBanner, FactorBar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TIP = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" };
const STATUSES = ["New", "Under Review", "Needs Follow-up", "Resolved", "Dismissed"];

export default function SignalDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [explanation, setExplanation] = useState(null);
  const [expSource, setExpSource] = useState(null);
  const [explaining, setExplaining] = useState(false);

  const { data: s, isLoading } = useQuery({ queryKey: ["signal", id], queryFn: async () => (await api.get(`/signals/${id}`)).data });

  const statusMut = useMutation({
    mutationFn: (status) => api.patch(`/signals/${id}`, { status }),
    onSuccess: (_, status) => { qc.invalidateQueries({ queryKey: ["signal", id] }); toast.success(`Signal marked ${status}`); },
  });

  const explain = async () => {
    setExplaining(true);
    try {
      const { data } = await api.post(`/signals/${id}/explain`);
      setExplanation(data.explanation); setExpSource(data.source);
    } catch { toast.error("Could not generate explanation."); }
    finally { setExplaining(false); }
  };

  if (isLoading || !s) return <Loading />;
  const det = s.student_detail;
  const perf = det.performance;
  const perfData = perf.series.map((v, i) => ({ semester: `S${i + 1}`, score: v }));
  const [lo, hi] = perf.historical_range;
  const shownExplanation = explanation || s.explanation;
  const shownSource = expSource || s.explanation_source;

  return (
    <div className="space-y-6">
      <button onClick={() => nav("/signals")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="back-to-signals">
        <ArrowLeft className="h-4 w-4" /> Risk Signals
      </button>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <StudentAvatar src={s.student_avatar} name={s.student_name} size={56} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight">Behavioral Deviation</h1>
                <SeverityBadge severity={s.severity} testid="signal-severity" />
                <StatusBadge status={s.status} testid="signal-status" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                <button onClick={() => nav(`/students/${s.student_id}`)} className="text-foreground hover:text-primary font-medium">{s.student_name}</button>
                {" · "}{s.course_code} — {s.course_name} · {s.semester} · Detected {s.detected}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={s.status} onValueChange={(v) => statusMut.mutate(v)}>
              <SelectTrigger className="w-44" data-testid="signal-status-select"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => nav("/reviews")} className="gap-2" data-testid="open-review-btn"><ClipboardCheck className="h-4 w-4" /> Reviews</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Why am I seeing this */}
        <ChartCard testid="why-seeing-this" className="lg:col-span-2" title="Why am I seeing this?"
          subtitle="Contributing factors vs the student's own historical baseline">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            <FactorBar label="Writing-style deviation" value={s.factors.writing} />
            <FactorBar label="Submission-pattern deviation" value={s.factors.submission} />
            <FactorBar label="Performance deviation" value={s.factors.performance} />
            <FactorBar label="Longitudinal change" value={s.factors.longitudinal} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Historical baseline</div>
              <div className="text-foreground font-medium mt-0.5">Previous 4 semesters</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Current observation</div>
              <div className="text-foreground font-medium mt-0.5">Last 3 submissions</div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-primary/20 bg-primary/[0.05] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5" /> Explanation</span>
              {!shownExplanation && (
                <Button size="sm" onClick={explain} disabled={explaining} className="gap-1.5 h-7" data-testid="generate-explanation-btn">
                  <Sparkles className="h-3.5 w-3.5" /> {explaining ? "Generating…" : "Generate explanation"}
                </Button>
              )}
            </div>
            {shownExplanation ? (
              <>
                <p className="text-sm text-foreground leading-relaxed" data-testid="explanation-text">{shownExplanation}</p>
                <p className="text-[11px] text-muted-foreground mt-2">{shownSource === "llm" ? "Generated by Claude Sonnet 4.6 · human-in-the-loop" : "Prototype rationale"}</p>
              </>
            ) : <p className="text-sm text-muted-foreground">Generate a plain-language, non-accusatory rationale for this signal.</p>}
          </div>
        </ChartCard>

        {/* Evidence ledger */}
        <ChartCard testid="supporting-evidence" title="Supporting Evidence" subtitle="Transparent feature ledger">
          <div className="space-y-2">
            {s.evidence.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0 text-sm">
                <span className="text-muted-foreground">{e.label}</span>
                <span className="font-mono text-foreground">{e.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Performance context + submission */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard testid="signal-performance" title="Performance context"
          subtitle={perf.outside_baseline ? `Latest is outside historical range (${lo}–${hi})` : `Within range (${lo}–${hi})`}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={perfData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <ReferenceArea y1={lo} y2={hi} fill="hsl(var(--primary))" fillOpacity={0.1} />
                <Tooltip contentStyle={TIP} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.4} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard testid="signal-submission" title="Submission behavior shift" subtitle="Hours before deadline">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2"><Clock className="h-4 w-4 text-muted-foreground mt-0.5" /><div><span className="text-muted-foreground">Historical pattern: </span><span className="text-foreground">{det.submission_behavior.historical}</span></div></div>
            <div className="flex items-start gap-2"><PenLine className="h-4 w-4 text-muted-foreground mt-0.5" /><div><span className="text-muted-foreground">Recent pattern: </span><span className="text-foreground">{det.submission_behavior.recent}</span></div></div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-400 px-2 py-1">
            <BarChart2 className="h-3.5 w-3.5" /> {det.submission_behavior.label}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">A meaningful pattern change — not evidence of cheating.</p>
        </ChartCard>
      </div>

      <TrustBanner />
    </div>
  );
}
