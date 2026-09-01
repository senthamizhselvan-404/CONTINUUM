import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Server, Database, FileStack, GraduationCap, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import { cn } from "@/lib/utils";

const ICONS = { "ds_lms": Server, "ds_grade": Database, "ds_repo": FileStack, "ds_sis": GraduationCap };
const STATUS = {
  "Connected": { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", Icon: CheckCircle2 },
  "Syncing": { cls: "bg-sky-500/10 text-sky-400 border-sky-500/20", Icon: RefreshCw },
  "Not Connected": { cls: "bg-muted text-muted-foreground border-border", Icon: XCircle },
};

export default function DataSources() {
  const { data, isLoading } = useQuery({ queryKey: ["data-sources"], queryFn: async () => (await api.get("/data-sources")).data });
  if (isLoading || !data) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader testid="data-sources-header" title="Data Sources"
        subtitle="Continuum normalizes multiple academic data streams into one longitudinal profile. Connections are simulated in this demo." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.sources.map((ds) => {
          const Icon = ICONS[ds.id] || Server;
          const st = STATUS[ds.status] || STATUS["Not Connected"];
          return (
            <div key={ds.id} data-testid={`data-source-${ds.id}`} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center"><Icon className="h-5 w-5 text-muted-foreground" /></div>
                  <div><div className="font-semibold text-foreground">{ds.name}</div><div className="text-xs text-muted-foreground">{ds.type}</div></div>
                </div>
                <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", st.cls)}>
                  <st.Icon className={cn("h-3 w-3", ds.status === "Syncing" && "animate-spin")} /> {ds.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Records</div><div className="font-mono text-foreground">{ds.records}</div></div>
                <div><div className="text-xs text-muted-foreground">Last sync</div><div className="text-foreground">{ds.last_sync}</div></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-5">
        <p className="text-sm font-semibold text-foreground">Architected for real integrations</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-3xl">
          The analytics engine consumes a normalized feature layer, so live LMS, gradebook, submission-repository and SIS
          connectors can replace the simulated sources without changing downstream baselines, drift detection or review workflows.
        </p>
      </div>
    </div>
  );
}
