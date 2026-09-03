import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, RadarChart, PolarGrid, PolarAngleAxis, Radar as RRadar,
} from "recharts";
import { ArrowLeft, Clock, PenLine, TrendingDown, Layers, Plus, Upload } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, Loading, BandBadge, StudentAvatar, SeverityBadge, StatusBadge, ChartCard, TrustBanner, BaselineStatusBadge } from "@/components/common";
import { DeviationIndex } from "@/components/DeviationIndex";
import { Button } from "@/components/ui/button";
import { AddRecordModal, UploadRecordsModal } from "@/components/StudentDataModals";
import { cn } from "@/lib/utils";

const TIP = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" };

function BaselineRow({ label, historical, current }) {
  const dev = current.toLowerCase().includes("significant") ? "high" : current.toLowerCase().includes("moderate") ? "mod" : "stable";
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/60 last:border-0">
      <span className="text-sm text-foreground font-medium">{label}</span>
      <div className="flex items-center gap-4 text-xs">
        <div className="text-right">
          <div className="text-muted-foreground">Historical</div>
          <div className="text-foreground">{historical}</div>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="text-right min-w-[110px]">
          <div className="text-muted-foreground">Current</div>
          <div className={cn("font-medium", dev === "high" ? "text-rose-400" : dev === "mod" ? "text-amber-400" : "text-emerald-400")}>{current}</div>
        </div>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [activeSem, setActiveSem] = useState(4);
  const [addRecOpen, setAddRecOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { data: s, isLoading } = useQuery({ queryKey: ["student", id], queryFn: async () => (await api.get(`/students/${id}`)).data });

  if (isLoading || !s) return <Loading />;

  const perf = s.performance;
  const perfData = perf.series.map((v, i) => ({ semester: `S${i + 1}`, score: v }));
  const [lo, hi] = perf.historical_range;
  const radarData = s.writing_features.map((f) => ({ feature: f.feature.split(" ")[0], historical: f.historical, current: f.current }));
  const semIdx = Math.min(activeSem, s.semesters.length - 1);
  const sem = s.semesters[semIdx];

  return (
    <div className="space-y-6">
      <button onClick={() => nav("/students")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="back-to-students">
        <ArrowLeft className="h-4 w-4" /> Students
      </button>

      {/* Hero header */}
      <div className="rounded-xl border border-border bg-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-20" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5 justify-between">
          <div className="flex items-center gap-4">
            <StudentAvatar src={s.avatar} name={s.name} size={64} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{s.name}</h1>
              <p className="text-sm text-muted-foreground font-mono">{s.student_id}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{s.program} · Year {s.year}</span>
                <BandBadge band={s.band} testid="profile-status-badge" />
                <BaselineStatusBadge status={s.baseline_status} testid="profile-baseline-status" />
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground max-w-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Overall Behavioral Status</span>
            <p className="text-foreground font-medium mt-1">{s.status_label}</p>
            <p className="text-xs mt-1">This academic history is viewed as one continuous behavioral system.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" className="gap-1.5" onClick={() => setAddRecOpen(true)} data-testid="add-student-data-btn"><Plus className="h-3.5 w-3.5" /> Add Student Data</Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setUploadOpen(true)} data-testid="upload-records-btn"><Upload className="h-3.5 w-3.5" /> Upload Records</Button>
            </div>
          </div>
        </div>
      </div>

      <DeviationIndex index={s.deviation_index} band={s.band} factors={s.factors} testid="profile-deviation-index" />

      {/* Longitudinal timeline */}
      <ChartCard testid="longitudinal-timeline" title="Longitudinal Timeline"
        subtitle="One student → five semesters → one continuous profile. Click a semester to inspect.">
        <div className="relative pt-2 pb-1">
          <div className="absolute left-0 right-0 top-7 h-0.5 bg-border" />
          <div className="relative gap-2" style={{ display: "grid", gridTemplateColumns: `repeat(${s.semesters.length}, minmax(0,1fr))` }}>
            {s.semesters.map((sm, i) => {
              const active = i === semIdx;
              const tone = sm.stability === "Significant" ? "bg-rose-500" : sm.stability === "Moderate" ? "bg-amber-500" : "bg-emerald-500";
              return (
                <button key={sm.id} data-testid={`timeline-sem-${i + 1}`} onClick={() => setActiveSem(i)} className="flex flex-col items-center group">
                  <span className={cn("h-4 w-4 rounded-full ring-4 ring-card z-10 transition-transform group-hover:scale-125", tone, active && "scale-125")} />
                  <span className={cn("mt-2 text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>{sm.label}</span>
                  <span className="text-[10px] text-muted-foreground">{sm.term}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4 animate-fade-up" key={activeSem}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">{sem.label} · {sem.term}</h4>
            <BandBadge band={{ key: sem.stability === "Significant" ? "high" : sem.stability === "Moderate" ? "meaningful" : "stable", label: sem.stability === "Stable" ? "Stable" : `${sem.stability} deviation`, range: "" }} />
          </div>
          <div className="grid sm:grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">Grade average</div><div className="text-lg font-bold tabular-nums">{sem.grade_avg}</div></div>
            <div><div className="text-xs text-muted-foreground">Submissions</div><div className="text-lg font-bold tabular-nums">{sem.submissions}</div></div>
            <div><div className="text-xs text-muted-foreground">Signals</div><div className="text-lg font-bold tabular-nums">{sem.signals}</div></div>
            <div><div className="text-xs text-muted-foreground">Stability</div><div className="text-lg font-bold">{sem.stability}</div></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {sem.courses.map((c) => (
              <span key={c.code} className="text-xs rounded-md border border-border bg-background px-2 py-1 text-muted-foreground">
                <span className="font-mono text-foreground">{c.code}</span> · {c.name} · {c.grade}
              </span>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* Behavioral baseline + Writing style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard testid="behavioral-baseline" title="Behavioral Baseline" subtitle="Historical baseline vs current observation">
          <div>
            {Object.entries(s.baseline).map(([k, v]) => (
              <BaselineRow key={k} label={k} historical={v.historical} current={v.current} />
            ))}
          </div>
        </ChartCard>

        <ChartCard testid="writing-style" title="Writing Style" subtitle="Stylometric features — historical baseline vs recent submissions">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={80}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="feature" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <RRadar name="Historical" dataKey="historical" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.15} strokeWidth={1.5} />
                <RRadar name="Current" dataKey="current" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip contentStyle={TIP} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 justify-center text-xs mt-1">
            <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-muted-foreground" /> Historical: Low variation</span>
            <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" /> Current: {s.factors.writing >= 40 ? "Moderate deviation" : "Consistent"}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">Describes statistical variation in stylometric features. It does not indicate authorship or misconduct.</p>
        </ChartCard>
      </div>

      {/* Performance + Submission */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard testid="academic-performance" title="Academic Performance"
          subtitle={perf.outside_baseline ? `Latest observation is outside the historical range (${lo}–${hi})` : `Within historical range (${lo}–${hi})`}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={perfData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <ReferenceArea y1={lo} y2={hi} fill="hsl(var(--primary))" fillOpacity={0.1} />
                <Tooltip contentStyle={TIP} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.4} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {perf.outside_baseline && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-400 px-2 py-1">
              <TrendingDown className="h-3.5 w-3.5" /> Outside historical baseline — context required, not automatically suspicious
            </div>
          )}
        </ChartCard>

        <ChartCard testid="submission-behavior" title="Submission Behavior" subtitle="Hours before deadline across recent submissions">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={s.submission_behavior.timeline.map((v, i) => ({ n: `#${i + 1}`, hours: v }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="n" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} />
                <Line type="monotone" dataKey="hours" stroke="hsl(var(--chart-2))" strokeWidth={2.4} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-start gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><span className="text-muted-foreground">Historical: </span><span className="text-foreground">{s.submission_behavior.historical}</span></div></div>
            <div className="flex items-start gap-2"><PenLine className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><span className="text-muted-foreground">Recent: </span><span className="text-foreground">{s.submission_behavior.recent}</span></div></div>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-400 px-2 py-1">
              <Layers className="h-3.5 w-3.5" /> {s.submission_behavior.label}
            </span>
          </div>
        </ChartCard>
      </div>

      {/* Academic history + submission audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard testid="academic-history" title="Academic History" subtitle="Semester · course · grade · assignments">
          {s.academic_history.length === 0 ? <p className="text-sm text-muted-foreground py-4">No academic records yet.</p> : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground border-b border-border sticky top-0 bg-card">
                  <th className="py-2 px-2">Semester</th><th className="py-2 px-2">Course</th><th className="py-2 px-2">Grade</th><th className="py-2 px-2">Assignments</th></tr></thead>
                <tbody>
                  {s.academic_history.map((h, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 px-2 text-muted-foreground">{h.semester}</td>
                      <td className="py-2 px-2 font-mono text-xs">{h.course_code}</td>
                      <td className="py-2 px-2 font-semibold tabular-nums">{h.grade ?? "—"}</td>
                      <td className="py-2 px-2 tabular-nums">{h.assignments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
        <ChartCard testid="submission-audit" title="Submission Audit" subtitle="Submission time vs deadline">
          {s.submissions.length === 0 ? <p className="text-sm text-muted-foreground py-4">No submission-timing data for this student.</p> : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground border-b border-border sticky top-0 bg-card">
                  <th className="py-2 px-2">Assignment</th><th className="py-2 px-2">Submitted</th><th className="py-2 px-2">Before deadline</th><th className="py-2 px-2">Pattern</th></tr></thead>
                <tbody>
                  {s.submissions.map((sub, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 px-2">{sub.assignment}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{sub.submitted}</td>
                      <td className="py-2 px-2 tabular-nums">{sub.hours_before != null ? `${sub.hours_before}h` : "—"}</td>
                      <td className="py-2 px-2">{sub.pattern === "Near deadline"
                        ? <span className="text-amber-400 text-xs">Near deadline</span>
                        : <span className="text-muted-foreground text-xs">{sub.pattern}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Signals list */}
      <ChartCard testid="student-signals" title="Signals" subtitle="Behavioral deviations surfaced for review">
        {s.signals.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No signals. This student is consistent with their behavioral baseline.</p>
        ) : (
          <div className="space-y-2">
            {s.signals.map((sig) => (
              <button key={sig.id} data-testid={`profile-signal-${sig.id}`} onClick={() => nav(`/signals/${sig.id}`)}
                className="w-full flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 hover:border-primary/30 transition-colors text-left">
                <div>
                  <div className="text-sm font-medium text-foreground">{sig.signal_type}</div>
                  <div className="text-xs text-muted-foreground">{sig.course_code} · {sig.semester} · {sig.detected}</div>
                </div>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={sig.severity} />
                  <StatusBadge status={sig.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </ChartCard>

      <ChartCard testid="student-audit-trail" title="Review History & Audit Trail" subtitle="Every reviewer action on this student is recorded">
        {(!s.audit_trail || s.audit_trail.length === 0) ? <p className="text-sm text-muted-foreground py-4">No audit events yet.</p> : (
          <div className="relative pl-4 space-y-4 before:absolute before:left-1 before:top-1 before:bottom-1 before:w-px before:bg-border">
            {s.audit_trail.map((e) => (
              <div key={e.id} className="relative">
                <span className="absolute -left-[13px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{e.action}</span>
                  <span className="text-xs text-muted-foreground">{e.timestamp}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{e.description} · {e.user}</p>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      <TrustBanner />

      <AddRecordModal open={addRecOpen} onOpenChange={setAddRecOpen} studentId={s.id} onSaved={() => qc.invalidateQueries({ queryKey: ["student", id] })} />
      <UploadRecordsModal open={uploadOpen} onOpenChange={setUploadOpen} studentId={s.id} onSaved={() => qc.invalidateQueries({ queryKey: ["student", id] })} />
    </div>
  );
}
