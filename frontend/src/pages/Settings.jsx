import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Users, ShieldCheck, SlidersHorizontal, Lock, Database, RotateCcw } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, Loading, ChartCard, StudentAvatar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const ROLES = [
  { role: "Institution Administrator", desc: "Full access to all departments, settings and users." },
  { role: "Department Administrator", desc: "Access scoped to a department's students and signals." },
  { role: "Academic Integrity Reviewer", desc: "Reviews signals, adds notes, records decisions." },
  { role: "Faculty", desc: "Views signals for their own courses only." },
];

export default function SettingsPage() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/settings")).data });
  const [th, setTh] = useState(null);

  useEffect(() => { if (data) setTh(data.thresholds); }, [data]);

  const saveMut = useMutation({
    mutationFn: (t) => api.patch("/settings/thresholds", t),
    onSuccess: () => toast.success("Prototype thresholds updated"),
  });
  const resetMut = useMutation({
    mutationFn: () => api.post("/demo/reset"),
    onSuccess: () => { toast.success("Demo data reset"); refetch(); },
  });

  if (isLoading || !data || !th) return <Loading />;

  const Threshold = ({ label, k }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-foreground">{label}</span>
        <span className="font-mono text-sm text-primary">{th[k]}%</span>
      </div>
      <Slider data-testid={`threshold-${k}`} value={[th[k]]} min={0} max={100} step={1}
        onValueChange={([v]) => setTh((p) => ({ ...p, [k]: v }))} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader testid="settings-header" title="Settings" subtitle="Institution configuration, roles, and prototype detection thresholds.">
        <Button variant="outline" className="gap-2" onClick={() => resetMut.mutate()} disabled={resetMut.isPending} data-testid="reset-demo-btn">
          <RotateCcw className="h-4 w-4" /> Reset Demo Data
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard testid="settings-institution" title={<span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Institution</span>}>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border/60"><span className="text-muted-foreground">Name</span><span className="text-foreground font-medium">{data.institution_name}</span></div>
            <div className="flex justify-between py-2 border-b border-border/60"><span className="text-muted-foreground">Departments</span><span className="text-foreground">3</span></div>
            <div className="flex justify-between py-2"><span className="text-muted-foreground">Data retention</span><span className="text-foreground">{data.privacy.retention_months} months</span></div>
          </div>
        </ChartCard>

        <ChartCard testid="settings-privacy" title={<span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Privacy</span>}>
          <div className="flex items-center justify-between py-2">
            <div><div className="text-sm text-foreground">Data minimization</div><div className="text-xs text-muted-foreground">Store only features required for analysis</div></div>
            <Switch checked={data.privacy.data_minimization} data-testid="privacy-minimization" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Student information is treated as sensitive institutional data. Access is role-based and audited.</p>
        </ChartCard>

        <ChartCard testid="settings-thresholds" className="lg:col-span-2" title={<span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Signal Thresholds</span>}
          subtitle="Prototype threshold — not scientifically validated. Adjusts when a factor contributes to a signal.">
          <div className="grid sm:grid-cols-3 gap-6">
            <Threshold label="Writing deviation threshold" k="writing_deviation" />
            <Threshold label="Performance deviation threshold" k="performance_deviation" />
            <Threshold label="Submission pattern threshold" k="submission_pattern" />
          </div>
          <div className="mt-5 flex items-center gap-2">
            <Button className="gap-2" onClick={() => saveMut.mutate(th)} disabled={saveMut.isPending} data-testid="save-thresholds-btn">Save thresholds</Button>
            <span className="inline-flex rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-400 px-2 py-1 text-xs">Prototype threshold</span>
          </div>
        </ChartCard>

        <ChartCard testid="settings-users" title={<span className="flex items-center gap-2"><Users className="h-4 w-4" /> Users</span>}>
          <div className="space-y-2">
            {data.users.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-2.5"><StudentAvatar src={u.picture} name={u.name} size={30} /><div><div className="text-sm text-foreground font-medium">{u.name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div></div>
                <span className="text-xs rounded-md border border-border bg-muted/50 px-2 py-0.5 capitalize">{u.role}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard testid="settings-roles" title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Roles</span>}>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <div key={r.role} className="rounded-lg border border-border p-3"><div className="text-sm font-medium text-foreground">{r.role}</div><div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div></div>
            ))}
          </div>
        </ChartCard>

        <ChartCard testid="settings-sources" className="lg:col-span-2" title={<span className="flex items-center gap-2"><Database className="h-4 w-4" /> Data Sources</span>}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.sources.map((ds) => (
              <div key={ds.id} className="rounded-lg border border-border p-3"><div className="text-sm text-foreground font-medium">{ds.name}</div><div className="text-xs text-muted-foreground mt-0.5">{ds.status}</div></div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
