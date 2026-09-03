import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { Loading, ChartCard, MetricCard, SeverityBadge, StatusBadge, BandBadge, StudentAvatar } from "@/components/common";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIP = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--foreground))" };

export default function CourseDetail() {
  const { code } = useParams();
  const nav = useNavigate();
  const { data: c, isLoading } = useQuery({ queryKey: ["course", code], queryFn: async () => (await api.get(`/courses/${code}`)).data });
  if (isLoading || !c) return <Loading />;

  return (
    <div className="space-y-6">
      <button onClick={() => nav("/courses")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="back-to-courses">
        <ArrowLeft className="h-4 w-4" /> Courses
      </button>
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold tracking-tight font-mono">{c.code}</h1>
        <p className="text-muted-foreground">{c.name} · {c.dept}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Students" value={c.students} testid="course-students" />
        <MetricCard label="Active Signals" value={c.signals} testid="course-signals" />
        <MetricCard label="Avg Stability" value={`${c.avg_stability}%`} testid="course-stability" />
        <MetricCard label="Flagged Students" value={c.roster.length} testid="course-flagged" />
      </div>

      <ChartCard testid="course-health" title="Course Health" subtitle="Is behavioral change concentrated in this course, or in specific students?">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[["Students", c.health.students], ["Stable", c.health.stable], ["Watch", c.health.watch],
            ["Meaningful Deviation", c.health.meaningful_deviation], ["High Deviation", c.health.high_deviation]].map(([l, v]) => (
            <div key={l} className="rounded-lg border border-border bg-muted/20 p-3 text-center">
              <div className="text-xl font-bold tabular-nums text-foreground">{v}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{l}</div>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Assessment patterns by semester</p>
          <div className="space-y-1.5">
            {c.assessment_patterns.map((a) => (
              <div key={a.semester} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-foreground font-medium">{a.semester}</span>
                <span className={a.status === "Stable" ? "text-emerald-400 text-xs" : "text-amber-400 text-xs"}>{a.status}{a.signal_count > 0 ? ` · ${a.signal_count} signal${a.signal_count !== 1 ? "s" : ""}` : ""}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Course-wide patterns help distinguish a student-specific change from an assessment- or course-wide shift — reducing false positives.</p>
        </div>
      </ChartCard>

      <Tabs defaultValue="students" className="w-full">
        <TabsList data-testid="course-tabs">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="trends">Semester Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <ChartCard title="Flagged students" subtitle="Students in this course with active behavioral signals">
            {c.roster.length === 0 ? <p className="text-sm text-muted-foreground py-4">No flagged students in this course.</p> : (
              <div className="space-y-2">
                {c.roster.map((s) => (
                  <button key={s.id} onClick={() => nav(`/students/${s.id}`)} className="w-full flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors text-left">
                    <div className="flex items-center gap-3"><StudentAvatar src={s.avatar} name={s.name} size={30} /><span className="font-medium text-foreground">{s.name}</span></div>
                    <div className="flex items-center gap-3"><span className="font-mono text-sm text-foreground">{s.deviation_index}</span><BandBadge band={s.band} /></div>
                  </button>
                ))}
              </div>
            )}
          </ChartCard>
        </TabsContent>

        <TabsContent value="signals" className="mt-4">
          <ChartCard title="Course signals">
            <div className="space-y-2">
              {c.signal_list.map((s) => (
                <button key={s.id} onClick={() => nav(`/signals/${s.id}`)} className="w-full flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors text-left">
                  <div><div className="text-sm font-medium text-foreground">{s.student_name}</div><div className="text-xs text-muted-foreground">{s.signal_type} · {s.semester} · {s.detected}</div></div>
                  <div className="flex items-center gap-2"><SeverityBadge severity={s.severity} /><StatusBadge status={s.status} /></div>
                </button>
              ))}
            </div>
          </ChartCard>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <ChartCard title="Semester trends" subtitle="Signals vs average performance by semester">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={c.semester_trends} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TIP} />
                  <Bar dataKey="signals" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={32} />
                  <Line type="monotone" dataKey="performance" stroke="hsl(var(--chart-4))" strokeWidth={2.4} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
