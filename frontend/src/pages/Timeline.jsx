import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { PageHeader, Loading, ChartCard, TrustBanner, BaselineStatusBadge, SeverityBadge, StatusBadge } from "@/components/common";
import { cn } from "@/lib/utils";

function stabilityTone(stability) {
  if (stability === "Significant") return { key: "high", dot: "bg-rose-500", text: "text-rose-400", label: "Meaningful behavioral change" };
  if (stability === "Moderate") return { key: "meaningful", dot: "bg-amber-500", text: "text-amber-400", label: "Minor deviation" };
  return { key: "stable", dot: "bg-emerald-500", text: "text-emerald-400", label: "Stable" };
}

export default function Timeline() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [active, setActive] = useState(null);
  const { data: s, isLoading } = useQuery({
    queryKey: ["student", user?.student_id],
    queryFn: async () => (await api.get(`/students/${user.student_id}`)).data,
    enabled: !!user?.student_id,
  });

  if (isLoading || !s) return <Loading />;

  const semesters = s.semesters || [];
  const idx = active ?? semesters.length - 1;
  const sem = semesters[idx];
  const semSignals = (s.signals || []).filter((sig) => sig.semester === sem?.label);

  return (
    <div className="space-y-6">
      <PageHeader testid="timeline-header" title="Academic Timeline"
        subtitle="Your academic journey as one continuous behavioral profile — not a series of unrelated snapshots." />

      <ChartCard testid="timeline-baseline" title="Behavioral baseline"
        subtitle="Continuum compares your recent activity against your own history, not a fixed rulebook.">
        <div className="flex flex-wrap items-center gap-3">
          <BaselineStatusBadge status={s.baseline_status} testid="timeline-baseline-status" />
          <span className="text-xs text-muted-foreground">{s.baseline_status?.detail}</span>
        </div>
      </ChartCard>

      <ChartCard testid="timeline-strip" title="Semester-by-semester" subtitle="Click a semester to see what Continuum observed">
        <div className="relative pt-2 pb-1">
          <div className="absolute left-0 right-0 top-7 h-0.5 bg-border" />
          <div className="relative gap-2" style={{ display: "grid", gridTemplateColumns: `repeat(${semesters.length}, minmax(0,1fr))` }}>
            {semesters.map((sm, i) => {
              const tone = stabilityTone(sm.stability);
              const isActive = i === idx;
              return (
                <button key={sm.id} data-testid={`timeline-node-${i + 1}`} onClick={() => setActive(i)} className="flex flex-col items-center group">
                  <span className={cn("h-4 w-4 rounded-full ring-4 ring-card z-10 transition-transform group-hover:scale-125", tone.dot, isActive && "scale-125")} />
                  <span className={cn("mt-2 text-xs font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>{sm.label}</span>
                  <span className="text-[10px] text-muted-foreground">{sm.term}</span>
                  <span className={cn("text-[10px] mt-0.5", tone.text)}>{i === 0 ? "Baseline established" : tone.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {sem && (
          <div className="mt-5 rounded-lg border border-border bg-muted/20 p-4 animate-fade-up" key={idx}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h4 className="text-sm font-semibold">{sem.label} · {sem.term}</h4>
              <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
                stabilityTone(sem.stability).key === "high" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                stabilityTone(sem.stability).key === "meaningful" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")}>
                {idx === 0 ? "Baseline established" : stabilityTone(sem.stability).label}
              </span>
            </div>
            <div className="grid sm:grid-cols-4 gap-4 text-sm">
              <div><div className="text-xs text-muted-foreground">Grade average</div><div className="text-lg font-bold tabular-nums">{sem.grade_avg}</div></div>
              <div><div className="text-xs text-muted-foreground">Submissions</div><div className="text-lg font-bold tabular-nums">{sem.submissions}</div></div>
              <div><div className="text-xs text-muted-foreground">Signals</div><div className="text-lg font-bold tabular-nums">{sem.signals}</div></div>
              <div><div className="text-xs text-muted-foreground">Behavioral stability</div><div className="text-lg font-bold">{sem.stability}</div></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sem.courses.map((c) => (
                <span key={c.code} className="text-xs rounded-md border border-border bg-background px-2 py-1 text-muted-foreground">
                  <span className="font-mono text-foreground">{c.code}</span> · {c.name} · {c.grade}
                </span>
              ))}
            </div>

            {semSignals.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Relevant signals this semester</p>
                {semSignals.map((sig) => (
                  <button key={sig.id} data-testid={`timeline-signal-${sig.id}`} onClick={() => nav(`/signals/${sig.id}`)}
                    className="w-full flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 hover:border-primary/30 transition-colors text-left">
                    <div>
                      <div className="text-sm font-medium text-foreground">{sig.signal_type}</div>
                      <div className="text-xs text-muted-foreground">{sig.course_code} · {sig.detected}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={sig.severity} />
                      <StatusBadge status={sig.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </ChartCard>

      <TrustBanner />
    </div>
  );
}
