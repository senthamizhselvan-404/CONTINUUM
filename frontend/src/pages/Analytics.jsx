import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Loading, ChartCard, MetricCard, BandBadge, FactorBar, SeverityBadge, StatusBadge, EmptyState } from "@/components/common";

const TIP = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" };
const CHART = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

/* ---------------- Student Demo: personal analytics only ---------------- */
function PersonalAnalytics({ data }) {
  const nav = useNavigate();
  const { deviation_index, band, status_label, factors, grade_trend, writing_features,
          submission_behavior, submission_timeline, signals } = data;

  return (
    <div className="space-y-6">
      <PageHeader testid="analytics-header" title="My Analytics"
        subtitle="Your personal deviation index, writing style, submission pattern and grade trend. Visible only to you." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Behavioral Change Index" value={deviation_index} delta={status_label} testid="an-my-index" />
        <div className="rounded-xl border border-border bg-card p-4 lg:p-5 flex flex-col justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Behavioral Band</span>
          <div className="mt-2"><BandBadge band={band} testid="an-my-band" /></div>
        </div>
        <MetricCard label="Writing Consistency" value={`${factors.writing}%`} delta="Compared with your historical baseline" testid="an-my-writing" />
        <MetricCard label="Submission Pattern" value={`${factors.submission}%`} delta="Compared with your historical baseline" testid="an-my-submission" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard testid="an-my-grade-trend" title="My grade trend" subtitle="Average grade across semesters">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={grade_trend} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={TIP} />
                <Line type="monotone" dataKey="grade" name="Grade" stroke="hsl(var(--chart-1))" strokeWidth={2.4} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard testid="an-my-submission-timeline" title="My submission pattern" subtitle="Hours before deadline, most recent submissions">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={submission_timeline} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="submission" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="hours_before" name="Hours before deadline" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{submission_behavior.historical} {submission_behavior.recent}</p>
        </ChartCard>
      </div>

      <ChartCard testid="an-my-writing-features" title="My writing style deviation" subtitle="Historical vs current, per feature">
        <div className="space-y-4">
          {writing_features.map((f) => (
            <FactorBar key={f.feature} label={`${f.feature} (${f.unit})`} value={f.deviation} />
          ))}
        </div>
      </ChartCard>

      <ChartCard testid="an-my-signals" title="My signals" subtitle="Behavioral changes surfaced on your own record">
        {signals.length === 0 ? (
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
                {signals.map((s) => (
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
    </div>
  );
}

/* ---------------- Educator: institution-wide analytics ---------------- */
function InstitutionAnalytics({ data }) {
  const nav = useNavigate();
  return (
    <div className="space-y-6">
      <PageHeader testid="analytics-header" title="Analytics" subtitle="Institution-level behavioral stability, risk trends and intervention outcomes." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Post-Intervention Normalization" value="72%" delta="Students whose behavior returned toward baseline after review · demo data" testid="an-normalization" />
        <MetricCard label="Signals This Semester" value={data.signals_by_semester.at(-1)?.signals || 0} delta="Semester 5" deltaTone="up" testid="an-signals" />
        <MetricCard label="Under Follow-up" value="12" delta="Awaiting educator action" testid="an-followup" />
        <MetricCard label="Interventions" value="39" delta="Resolved or explained · all time" deltaTone="down" testid="an-interventions" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard testid="an-signals-by-semester" title="Where is review activity increasing?" subtitle="Signal volume across the academic timeline">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.signals_by_semester} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="signals" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard testid="an-risk-trend" title="Risk trend" subtitle="New risk vs resolved over time">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.risk_trend} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="risk" name="New risk" stroke="hsl(var(--chart-5))" strokeWidth={2.4} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="hsl(var(--chart-3))" strokeWidth={2.4} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard testid="an-categories" title="Signal categories" subtitle="Breakdown by deviation type — click a slice to drill in">
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.categories} dataKey="count" nameKey="type" innerRadius={54} outerRadius={90} paddingAngle={2}
                  onClick={(d) => nav(`/signals?type=${encodeURIComponent(d.type)}`)} cursor="pointer">
                  {data.categories.map((_, i) => <Cell key={i} fill={CHART[i % CHART.length]} />)}
                </Pie>
                <Tooltip contentStyle={TIP} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard testid="an-course-distribution" title="Courses generating the most review workload" subtitle="Signals by course — click a bar to open the course">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.course_distribution.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="course" width={56} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="signals" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={16}
                  onClick={(d) => nav(`/courses/${d.course}`)} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard testid="an-stability-dist" title="Student population behavioral stability" subtitle="Students by deviation band">
          <div className="space-y-3">
            {data.stability.map((b, i) => {
              const total = data.stability.reduce((a, x) => a + x.count, 0);
              return (
                <div key={b.band}>
                  <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground">{b.band}</span><span className="font-mono text-foreground">{b.count}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(b.count / total) * 100}%`, background: CHART[i % CHART.length] }} /></div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard testid="an-outcomes" title="What happened after signals were reviewed?" subtitle="Human review outcomes">
          <div className="space-y-2">
            {data.intervention_outcomes.map((o) => (
              <div key={o.outcome} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
                <span className="text-foreground">{o.outcome}</span><span className="font-mono font-semibold text-foreground">{o.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {data.emerging_patterns?.length > 0 && (
        <ChartCard testid="an-emerging-patterns" title="Emerging Patterns" subtitle="Institution-level trends — possible contributing factors, not causal claims">
          <div className="space-y-3">
            {data.emerging_patterns.map((p, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <p className="text-sm text-foreground font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-1.5">Possible contributing factors: {p.factors.join(" · ")}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["analytics"], queryFn: async () => (await api.get("/analytics")).data });
  if (isLoading || !data) return <Loading />;

  return (user?.role === "student" || data.personal)
    ? <PersonalAnalytics data={data} />
    : <InstitutionAnalytics data={data} />;
}
