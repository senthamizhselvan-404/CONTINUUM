import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from "recharts";
import { Users, Radar, ClipboardCheck, Activity, ArrowRight, ArrowRightLeft, UserPlus, Upload, HelpCircle, ChevronDown } from "lucide-react";
import { AddStudentModal, ImportStudentsModal } from "@/components/StudentDataModals";
import api from "@/lib/api";
import { MetricCard, PageHeader, ChartCard, Loading, SeverityBadge, StatusBadge, StudentAvatar, TrustBanner, BandBadge, EmptyState, BaselineStatusBadge } from "@/components/common";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const CHART = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-mono text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/* ---------------- Student Demo: personal overview only ---------------- */
function PersonalDashboard({ data }) {
  const nav = useNavigate();
  const [whyOpen, setWhyOpen] = useState(false);
  const { student, performance_series, recent_signals, signal_count } = data;
  const firstName = (student?.name || "there").split(" ")[0];
  const delta = student.index_delta ?? 0;
  const deltaDir = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <div className="space-y-6">
      <PageHeader testid="dashboard-header" title={`${greeting()}, ${firstName}`}
        subtitle="Your personal behavioral baseline and longitudinal performance — visible only to you.">
        <Button variant="outline" onClick={() => nav("/signals")} className="gap-2" data-testid="view-signals-btn">
          My signals <ArrowRight className="h-4 w-4" />
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div data-testid="kpi-my-index" className="rounded-xl border border-border bg-card p-4 lg:p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Behavioral Change Index</span>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-foreground">{student.deviation_index}</div>
          <div className="mt-1 text-xs font-medium text-muted-foreground">{student.status_label}</div>
          {delta !== 0 && (
            <div className={cn("mt-1 text-xs font-medium", deltaDir === "up" ? "text-amber-400" : "text-emerald-400")}>
              {deltaDir === "up" ? "↑" : "↓"} {Math.abs(delta)} points from previous period
            </div>
          )}
          {data.student.change_breakdown?.length > 0 && (
            <button onClick={() => setWhyOpen((o) => !o)} data-testid="why-did-this-change-btn"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <HelpCircle className="h-3 w-3" /> Why did this change? <ChevronDown className={cn("h-3 w-3 transition-transform", whyOpen && "rotate-180")} />
            </button>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 lg:p-5 flex flex-col justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Band</span>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <BandBadge band={student.band} testid="kpi-my-band" />
            <BaselineStatusBadge status={student.baseline_status} testid="kpi-my-baseline-status" />
          </div>
        </div>
        <MetricCard testid="kpi-my-signals" label="My Signals" value={signal_count}
          delta="Personal signals only" icon={Radar} />
      </div>

      {whyOpen && data.student.change_breakdown?.length > 0 && (
        <ChartCard testid="behavioral-change-breakdown" title="Behavioral Change Breakdown"
          subtitle="Measures how much your recent academic behavior differs from your personal baseline, decomposed by contributing factor.">
          <div className="space-y-2">
            {data.student.change_breakdown.map((b) => (
              <div key={b.label} className="flex items-center justify-between text-sm py-1.5 border-b border-border/60 last:border-0">
                <span className="text-muted-foreground">{b.label}</span>
                <span className={cn("font-mono font-semibold tabular-nums", b.points > 0 ? "text-amber-400" : "text-muted-foreground")}>
                  {b.points > 0 ? "+" : ""}{b.points}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      <ChartCard testid="my-performance-trend" title="My Longitudinal Performance"
        subtitle="Your average grade across semesters — one continuous behavioral profile">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performance_series} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gPersonal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="value" name="Average grade" stroke="hsl(var(--primary))" strokeWidth={2.4} fill="url(#gPersonal)" dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard testid="my-recent-signals" title="My Recent Signals" subtitle="Behavioral changes surfaced on your own record — not determinations of misconduct"
        action={<Button variant="ghost" size="sm" onClick={() => nav("/signals")} className="gap-1.5 text-primary">View all <ArrowRight className="h-3.5 w-3.5" /></Button>}>
        {recent_signals.length === 0 ? (
          <EmptyState title="No signals on your record" description="Your behavioral baseline is currently stable." />
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="font-medium py-2 px-3">Signal</th>
                  <th className="font-medium py-2 px-3">Course</th>
                  <th className="font-medium py-2 px-3">Severity</th>
                  <th className="font-medium py-2 px-3">Detected</th>
                  <th className="font-medium py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_signals.map((s) => (
                  <tr key={s.id} data-testid={`signal-row-${s.id}`} onClick={() => nav(`/signals/${s.id}`)}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                    <td className="py-2.5 px-3 text-foreground font-medium">{s.signal_type}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{s.course_code}</td>
                    <td className="py-2.5 px-3"><SeverityBadge severity={s.severity} /></td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{s.detected}</td>
                    <td className="py-2.5 px-3"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <TrustBanner />
    </div>
  );
}

/* ---------------- Educator/institution overview ---------------- */
function InstitutionDashboard({ data }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeCat, setActiveCat] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { data: sstats } = useQuery({ queryKey: ["students-stats"], queryFn: async () => (await api.get("/students-stats")).data });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["students-stats"] }); qc.invalidateQueries({ queryKey: ["overview"] }); qc.invalidateQueries({ queryKey: ["students"] }); };

  const { stats, signals_over_time, recent_signals, distribution } = data;
  const firstName = (user?.name || "there").split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader testid="dashboard-header" title={`${greeting()}, ${firstName}`}
        subtitle="Here's what changed across your student population.">
        <Button variant="outline" onClick={() => nav("/signals")} className="gap-2" data-testid="view-signals-btn">
          Review signals <ArrowRight className="h-4 w-4" />
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard testid="kpi-students" label="Students Monitored" value={stats.students_monitored.toLocaleString()}
          delta="Across 5 active semesters" icon={Users} spark={[40, 42, 41, 45, 48]} />
        <MetricCard testid="kpi-active-signals" label="Active Signals" value={stats.active_signals}
          delta="+6 this week" deltaTone="up" icon={Radar} spark={[20, 24, 28, 33, 37]} />
        <MetricCard testid="kpi-needs-review" label="Needs Review" value={stats.needs_review}
          delta="Awaiting educator action" deltaTone="up" icon={ClipboardCheck} spark={[8, 9, 11, 10, 12]} />
        <MetricCard testid="kpi-significant-drift" label="Significant Drift" value={stats.significant_drift}
          delta="High-deviation profiles" deltaTone="up" icon={Activity} spark={[3, 4, 5, 7, 8]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ChartCard testid="signals-over-time" className="lg:col-span-8" title="Behavioral Signals Over Time"
          subtitle="One student → multiple semesters → one continuous behavioral profile">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signals_over_time} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="deviation" name="Avg deviation" stroke="hsl(var(--primary))" strokeWidth={2.4} fill="url(#gDev)" dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="high" name="Upper band" stroke="hsl(var(--chart-5))" strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard testid="signal-distribution" className="lg:col-span-4" title="Signal Distribution"
          subtitle="Click a category to filter">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="type" width={112} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}
                  onClick={(d) => { setActiveCat(d.type); nav(`/signals?type=${encodeURIComponent(d.type)}`); }}>
                  {distribution.map((_, i) => <Cell key={i} cursor="pointer" fill={CHART[i % CHART.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {distribution.map((d, i) => (
              <button key={d.type} onClick={() => nav(`/signals?type=${encodeURIComponent(d.type)}`)}
                data-testid={`dist-${d.type.replace(/ /g,'-').toLowerCase()}`}
                className="w-full flex items-center justify-between text-xs hover:bg-muted rounded px-1.5 py-1">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART[i % CHART.length] }} />{d.type}
                </span>
                <span className="font-mono text-foreground">{d.count}</span>
              </button>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard testid="recent-signals" title="Signals Requiring Attention" subtitle="Most recent unresolved behavioral deviations"
        action={<Button variant="ghost" size="sm" onClick={() => nav("/signals")} className="gap-1.5 text-primary">View all <ArrowRight className="h-3.5 w-3.5" /></Button>}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="font-medium py-2 px-3">Student</th>
                <th className="font-medium py-2 px-3">Signal</th>
                <th className="font-medium py-2 px-3">Course</th>
                <th className="font-medium py-2 px-3">Severity</th>
                <th className="font-medium py-2 px-3">Detected</th>
                <th className="font-medium py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent_signals.map((s) => (
                <tr key={s.id} data-testid={`signal-row-${s.id}`} onClick={() => nav(`/signals/${s.id}`)}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <StudentAvatar src={s.student_avatar} name={s.student_name} size={28} />
                      <span className="font-medium text-foreground">{s.student_name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{s.signal_type}</td>
                  <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{s.course_code}</td>
                  <td className="py-2.5 px-3"><SeverityBadge severity={s.severity} /></td>
                  <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{s.detected}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Students workspace section */}
      <ChartCard testid="dashboard-students" title="Students" subtitle="Your Continuum workspace at a glance"
        action={<div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)} data-testid="dash-import-btn"><Upload className="h-3.5 w-3.5" /> Import</Button>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)} data-testid="dash-add-student-btn"><UserPlus className="h-3.5 w-3.5" /> Add Student</Button>
        </div>}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 grid grid-cols-2 gap-3">
            {[["Total Students", sstats?.total ?? "—"], ["Added This Month", sstats?.new_this_month ?? "—"], ["Active Signals", sstats?.active_signals ?? "—"], ["Require Review", sstats?.require_review ?? "—"]].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-2xl font-bold tabular-nums text-foreground">{v}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{l}</div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Student Activity</span>
              <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => nav("/students")} data-testid="view-all-students">View All Students <ArrowRight className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="space-y-1.5">
              {(sstats?.recent_activity || []).length === 0 ? <p className="text-sm text-muted-foreground">No recent activity yet. Add or import students to begin.</p> :
                sstats.recent_activity.map((a, i) => (
                  <button key={i} onClick={() => nav(`/students/${a.student_id}`)} data-testid={`activity-${i}`}
                    className="w-full flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-muted/50 transition-colors text-left">
                    <span className="text-sm text-foreground"><span className="font-medium">{a.student_name}</span> — {a.text}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">{a.timestamp}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </ChartCard>

      {/* Old world vs Continuum */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard testid="old-vs-continuum" className="lg:col-span-2" title="Why longitudinal matters"
          subtitle="The difference between snapshot detection and behavioral memory">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Traditional approach</p>
              {["Single submission", "Static detection", "One-time check", "Reactive"].map((t) => (
                <div key={t} className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />{t}
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/[0.06] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Continuum
              </p>
              {["Longitudinal behavior", "Behavioral baseline", "Continuous analysis", "Trend / drift detection", "Early signal", "Human review"].map((t) => (
                <div key={t} className="flex items-center gap-2 py-1 text-sm text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />{t}
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
        <TrustBanner />
      </div>

      <AddStudentModal open={addOpen} onOpenChange={setAddOpen} onCreated={refresh} />
      <ImportStudentsModal open={importOpen} onOpenChange={setImportOpen} onDone={refresh} />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["overview"], queryFn: async () => (await api.get("/overview")).data });

  if (isLoading || !data) return <Loading />;

  return (user?.role === "student" || data.personal)
    ? <PersonalDashboard data={data} />
    : <InstitutionDashboard data={data} />;
}
