import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea } from "recharts";
import { ArrowLeft, Sparkles, HelpCircle, Clock, PenLine, BarChart2, ClipboardCheck, MessageSquarePlus, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageHeader, Loading, SeverityBadge, StatusBadge, StudentAvatar, ChartCard, TrustBanner, FactorBar, ConfidenceBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";

const TIP = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" };
const STATUSES = ["New", "Under Review", "Needs Follow-up", "Resolved", "Dismissed"];

function StudentContextPanel({ s, id, isEducator, isOwner }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const submitMut = useMutation({
    mutationFn: (t) => api.post(`/signals/${id}/context`, { text: t }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["signal", id] }); setText(""); toast.success("Context shared with your assigned educator."); },
  });

  return (
    <ChartCard testid="student-context-panel" title="Student Context" subtitle="Additional information the student has chosen to share">
      {s.context ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-sm text-foreground leading-relaxed" data-testid="context-text">"{s.context.text}"</p>
          <p className="text-xs text-muted-foreground mt-2">{s.context.submitted_at} · {s.context.status}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="no-context-yet">
          {s.context_requested ? "Context has been requested — no response yet." : "No context provided yet."}
        </p>
      )}

      {isOwner && !s.context && (
        <div className="mt-4 space-y-2">
          <Textarea data-testid="context-input" value={text} onChange={(e) => setText(e.target.value)}
            placeholder="e.g. I had multiple exams this week, or my project group changed…" className="min-h-[80px]" />
          <Button size="sm" className="gap-2" disabled={!text.trim() || submitMut.isPending} onClick={() => submitMut.mutate(text)} data-testid="submit-context-btn">
            <Send className="h-3.5 w-3.5" /> Add Context
          </Button>
        </div>
      )}
      {isEducator && !s.context && (
        <RequestContextButton id={id} disabled={s.context_requested} />
      )}
    </ChartCard>
  );
}

function RequestContextButton({ id, disabled }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => api.post(`/signals/${id}/request-context`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["signal", id] }); toast.success("Context requested from student."); },
  });
  return (
    <Button variant="outline" size="sm" className="gap-2 mt-3" disabled={disabled || mut.isPending}
      onClick={() => mut.mutate()} data-testid="request-context-btn">
      <MessageSquarePlus className="h-3.5 w-3.5" /> {disabled ? "Context requested" : "Request Context"}
    </Button>
  );
}

export default function SignalDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEducator = user?.role === "educator";
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
  const isOwner = user?.role === "student" && user?.student_id === s.student_id;
  const cohort = s.cohort_context;

  return (
    <div className="space-y-6">
      <button onClick={() => nav("/signals")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="back-to-signals">
        <ArrowLeft className="h-4 w-4" /> Signals
      </button>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <StudentAvatar src={s.student_avatar} name={s.student_name} size={56} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight">Signal Investigation</h1>
                <SeverityBadge severity={s.severity} testid="signal-severity" />
                <ConfidenceBadge confidence={s.confidence} testid="signal-confidence" />
                <StatusBadge status={s.status} testid="signal-status" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                <button onClick={() => nav(`/students/${s.student_id}`)} className="text-foreground hover:text-primary font-medium">{s.student_name}</button>
                {" · "}{s.course_code} — {s.course_name} · {s.semester} · Detected {s.detected}
              </p>
            </div>
          </div>
          {isEducator && (
            <div className="flex items-center gap-2">
              <Select value={s.status} onValueChange={(v) => statusMut.mutate(v)}>
                <SelectTrigger className="w-44" data-testid="signal-status-select"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={() => nav("/reviews")} className="gap-2" data-testid="open-review-btn"><ClipboardCheck className="h-4 w-4" /> Reviews</Button>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/[0.05] p-3">
          <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            This signal represents a meaningful change from {s.student_name.split(" ")[0]}'s established academic pattern.
            <span className="text-foreground font-medium"> It is not a determination of misconduct.</span> Severity reflects the
            size of the change; confidence reflects how much evidence supports treating it as a real pattern rather than noise —
            the two are independent.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Why am I seeing this */}
        <ChartCard testid="why-seeing-this" className="lg:col-span-2" title="Why was this surfaced?"
          subtitle="Contributing factors vs the student's own historical baseline">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            <FactorBar label="Writing-style deviation" value={s.factors.writing} />
            <FactorBar label="Submission-pattern deviation" value={s.factors.submission} />
            <FactorBar label="Performance deviation" value={s.factors.performance} />
            <FactorBar label="Longitudinal change" value={s.factors.longitudinal} />
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Historical baseline</div>
              <div className="text-foreground font-medium mt-0.5">Previous 4 semesters</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Current observation</div>
              <div className="text-foreground font-medium mt-0.5">Last 3 submissions</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Observed across</div>
              <div className="text-foreground font-medium mt-0.5">{s.persistence ?? "—"} assignment(s)</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Dimensions agreeing</div>
              <div className="text-foreground font-medium mt-0.5">{s.multi_signal_agreement ?? "—"} of 3</div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-primary/20 bg-primary/[0.05] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5" /> Explanation</span>
              {!shownExplanation && isEducator && (
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

      {cohort && (cohort.recent_hours != null || cohort.course_median_hours != null) && (
        <ChartCard testid="cohort-baseline" title="Longitudinal Context" subtitle="Personal baseline vs course norm — a change can be personal, or shared across the course">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Personal baseline</div>
              <div className="text-foreground font-medium mt-0.5">{cohort.personal_baseline_hours != null ? `${cohort.personal_baseline_hours}h before deadline` : "—"}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Recent behavior</div>
              <div className="text-foreground font-medium mt-0.5">{cohort.recent_hours != null ? `${cohort.recent_hours}h before deadline` : "—"}</div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Course median (this assessment)</div>
              <div className="text-foreground font-medium mt-0.5">{cohort.course_median_hours != null ? `${cohort.course_median_hours}h before deadline` : "—"}</div>
            </div>
          </div>
          {cohort.interpretation && <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{cohort.interpretation}</p>}
        </ChartCard>
      )}

      <StudentContextPanel s={s} id={id} isEducator={isEducator} isOwner={isOwner} />

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
