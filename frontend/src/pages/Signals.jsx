import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader, Loading, SeverityBadge, StatusBadge, StudentAvatar, EmptyState, ConfidenceBadge } from "@/components/common";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SIGNAL_TYPES = ["Writing Drift", "Performance Volatility", "Submission Pattern Shift", "Cross-Semester Drift", "Multi-Signal Deviation"];
const SEVERITIES = ["Low", "Moderate", "High"];
const STATUSES = ["New", "Under Review", "Needs Follow-up", "Resolved", "Dismissed"];

export default function Signals() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("all");
  const [signalType, setSignalType] = useState("all");
  const [status, setStatus] = useState("all");
  const [semester, setSemester] = useState("all");

  useEffect(() => { const t = sp.get("type"); if (t) setSignalType(t); }, [sp]);

  const { data, isLoading } = useQuery({
    queryKey: ["signals", q, severity, signalType, status, semester],
    queryFn: async () => (await api.get("/signals", { params: { q, severity, signal_type: signalType, status, semester } })).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader testid="signals-header" title="Risk Signals"
        subtitle="Behavioral deviations surfaced for educator review. Signals are not determinations of misconduct." />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <input data-testid="signals-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
          className="col-span-2 md:col-span-1 h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50" />
        <Select value={severity} onValueChange={setSeverity}><SelectTrigger data-testid="filter-severity"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All severity</SelectItem>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={signalType} onValueChange={setSignalType}><SelectTrigger data-testid="filter-type"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All types</SelectItem>{SIGNAL_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger data-testid="filter-signal-status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={semester} onValueChange={setSemester}><SelectTrigger data-testid="filter-semester"><SelectValue placeholder="Semester" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All semesters</SelectItem>{[1,2,3,4,5].map((s) => <SelectItem key={s} value={`Semester ${s}`}>Semester {s}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? <div className="p-6"><Loading rows={6} /></div> :
          data.total === 0 ? <EmptyState title="No signals match your filters" description="Your institution currently has no matching behavioral deviations." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
                <th className="font-medium py-2.5 px-4">Student</th><th className="font-medium py-2.5 px-4">Signal</th>
                <th className="font-medium py-2.5 px-4">Course</th><th className="font-medium py-2.5 px-4">Semester</th>
                <th className="font-medium py-2.5 px-4">Severity</th><th className="font-medium py-2.5 px-4">Confidence</th>
                <th className="font-medium py-2.5 px-4">Detected</th>
                <th className="font-medium py-2.5 px-4">Status</th></tr></thead>
              <tbody>
                {data.signals.map((s) => (
                  <tr key={s.id} data-testid={`signal-row-${s.id}`} onClick={() => nav(`/signals/${s.id}`)}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                    <td className="py-2.5 px-4"><div className="flex items-center gap-2.5"><StudentAvatar src={s.student_avatar} name={s.student_name} size={28} /><span className="font-medium text-foreground">{s.student_name}</span></div></td>
                    <td className="py-2.5 px-4 text-muted-foreground">{s.signal_type}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{s.course_code}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{s.semester}</td>
                    <td className="py-2.5 px-4"><SeverityBadge severity={s.severity} /></td>
                    <td className="py-2.5 px-4"><ConfidenceBadge confidence={s.confidence} /></td>
                    <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{s.detected}</td>
                    <td className="py-2.5 px-4"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">{data.total} signals</div>}
      </div>
    </div>
  );
}
