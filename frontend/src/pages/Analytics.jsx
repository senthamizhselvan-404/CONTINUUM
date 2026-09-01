import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import api from "@/lib/api";
import { PageHeader, Loading, ChartCard, MetricCard } from "@/components/common";

const TIP = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" };
const CHART = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ["analytics"], queryFn: async () => (await api.get("/analytics")).data });
  if (isLoading || !data) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader testid="analytics-header" title="Analytics" subtitle="Institution-level behavioral stability, risk trends and intervention outcomes." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Behavioral Stability" value="87%" delta="Population baseline consistent" testid="an-stability" />
        <MetricCard label="Signals This Semester" value={data.signals_by_semester.at(-1)?.signals || 0} delta="Semester 5" deltaTone="up" testid="an-signals" />
        <MetricCard label="Under Follow-up" value="12" delta="Awaiting educator action" testid="an-followup" />
        <MetricCard label="Interventions" value="39" delta="Resolved or explained" deltaTone="down" testid="an-interventions" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard testid="an-signals-by-semester" title="Signals by semester" subtitle="Distribution across the academic timeline">
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

        <ChartCard testid="an-categories" title="Signal categories" subtitle="Breakdown by deviation type">
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.categories} dataKey="count" nameKey="type" innerRadius={54} outerRadius={90} paddingAngle={2}>
                  {data.categories.map((_, i) => <Cell key={i} fill={CHART[i % CHART.length]} />)}
                </Pie>
                <Tooltip contentStyle={TIP} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard testid="an-course-distribution" title="Course distribution" subtitle="Signals by course">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.course_distribution.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="course" width={56} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TIP} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="signals" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard testid="an-stability-dist" title="Behavioral stability distribution" subtitle="Students by deviation band">
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

        <ChartCard testid="an-outcomes" title="Intervention outcomes" subtitle="How reviewed signals resolved">
          <div className="space-y-2">
            {data.intervention_outcomes.map((o) => (
              <div key={o.outcome} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
                <span className="text-foreground">{o.outcome}</span><span className="font-mono font-semibold text-foreground">{o.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
