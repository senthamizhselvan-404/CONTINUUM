import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader, Loading, TrendIcon } from "@/components/common";

export default function Courses() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["courses"], queryFn: async () => (await api.get("/courses")).data });
  if (isLoading || !data) return <Loading />;
  const courses = data.courses.filter((c) => !q || c.code.toLowerCase().includes(q.toLowerCase()) || c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader testid="courses-header" title="Courses" subtitle="Behavioral signal density across the course catalog." />
      <input data-testid="courses-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses…"
        className="w-full sm:max-w-sm h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50" />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
              <th className="font-medium py-2.5 px-4">Course</th><th className="font-medium py-2.5 px-4">Department</th>
              <th className="font-medium py-2.5 px-4">Students</th><th className="font-medium py-2.5 px-4">Signals</th>
              <th className="font-medium py-2.5 px-4">Stability</th><th className="font-medium py-2.5 px-4">Trend</th></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.code} data-testid={`course-row-${c.code}`} onClick={() => nav(`/courses/${c.code}`)}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                  <td className="py-2.5 px-4"><div className="font-medium text-foreground font-mono">{c.code}</div><div className="text-xs text-muted-foreground">{c.name}</div></td>
                  <td className="py-2.5 px-4 text-muted-foreground">{c.dept}</td>
                  <td className="py-2.5 px-4 tabular-nums text-foreground">{c.students}</td>
                  <td className="py-2.5 px-4 tabular-nums text-foreground">{c.signals}</td>
                  <td className="py-2.5 px-4 tabular-nums text-muted-foreground">{c.avg_stability}%</td>
                  <td className="py-2.5 px-4"><TrendIcon trend={c.trend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
