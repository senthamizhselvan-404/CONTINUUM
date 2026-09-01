import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, Loading, EmptyState } from "@/components/common";
import { ScrollText } from "lucide-react";

export default function AuditLog() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["audit", q], queryFn: async () => (await api.get("/audit-log", { params: { q } })).data });

  return (
    <div className="space-y-6">
      <PageHeader testid="audit-log-header" title="Audit Log"
        subtitle="Every review action is recorded. This trail is essential for institutional trust and accountability." />
      <input data-testid="audit-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actions, users, entities…"
        className="w-full sm:max-w-sm h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50" />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? <div className="p-6"><Loading rows={8} /></div> :
          data.events.length === 0 ? <EmptyState icon={ScrollText} title="No audit events" description="No events match your search." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
                <th className="font-medium py-2.5 px-4">Timestamp</th><th className="font-medium py-2.5 px-4">User</th>
                <th className="font-medium py-2.5 px-4">Action</th><th className="font-medium py-2.5 px-4">Entity</th>
                <th className="font-medium py-2.5 px-4">Description</th></tr></thead>
              <tbody>
                {data.events.map((e) => (
                  <tr key={e.id} data-testid={`audit-row-${e.id}`} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap font-mono text-xs">{e.timestamp}</td>
                    <td className="py-2.5 px-4 text-foreground">{e.user}</td>
                    <td className="py-2.5 px-4"><span className="inline-flex rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs">{e.action}</span></td>
                    <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{e.entity}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{e.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
