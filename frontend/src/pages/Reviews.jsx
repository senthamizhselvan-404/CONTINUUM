import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { PageHeader, Loading, SeverityBadge, StatusBadge, StudentAvatar, EmptyState } from "@/components/common";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Reviews() {
  const nav = useNavigate();
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({ queryKey: ["reviews", status], queryFn: async () => (await api.get("/reviews", { params: { status } })).data });

  return (
    <div className="space-y-6">
      <PageHeader testid="reviews-header" title="Reviews" subtitle="The human-in-the-loop queue. Every action is recorded to the audit trail.">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48" data-testid="filter-review-status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Needs Follow-up">Needs Follow-up</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? <div className="p-6"><Loading rows={6} /></div> :
          data.total === 0 ? <EmptyState title="No signals require review" description="Your institution currently has no unresolved behavioral deviations." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
                <th className="font-medium py-2.5 px-4">Student</th><th className="font-medium py-2.5 px-4">Signal</th>
                <th className="font-medium py-2.5 px-4">Severity</th><th className="font-medium py-2.5 px-4">Assigned reviewer</th>
                <th className="font-medium py-2.5 px-4">Created</th><th className="font-medium py-2.5 px-4">Status</th></tr></thead>
              <tbody>
                {data.reviews.map((r) => (
                  <tr key={r.id} data-testid={`review-row-${r.id}`} onClick={() => nav(`/reviews/${r.id}`)}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                    <td className="py-2.5 px-4"><div className="flex items-center gap-2.5"><StudentAvatar src={r.student_avatar} name={r.student_name} size={28} /><span className="font-medium text-foreground">{r.student_name}</span></div></td>
                    <td className="py-2.5 px-4 text-muted-foreground">{r.signal_type}<span className="text-xs block font-mono">{r.course_code} · {r.semester}</span></td>
                    <td className="py-2.5 px-4"><SeverityBadge severity={r.severity} /></td>
                    <td className="py-2.5 px-4 text-muted-foreground">{r.assigned_reviewer}</td>
                    <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{r.created}</td>
                    <td className="py-2.5 px-4"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">{data.total} reviews in queue</div>}
      </div>
    </div>
  );
}
