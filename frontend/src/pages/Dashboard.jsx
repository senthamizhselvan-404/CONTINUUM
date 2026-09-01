import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from "recharts";
import { Users, Radar, ClipboardCheck, Activity, ArrowRight, ArrowRightLeft } from "lucide-react";
import api from "@/lib/api";
import { MetricCard, PageHeader, ChartCard, Loading, SeverityBadge, StatusBadge, StudentAvatar, TrustBanner } from "@/components/common";
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

export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [activeCat, setActiveCat] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ["overview"], queryFn: async () => (await api.get("/overview")).data });

  if (isLoading || !data) return <Loading />;
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
    </div>
  );
}
