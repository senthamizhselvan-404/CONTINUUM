import React from "react";
import { CheckCircle2, TrendingUp, AlertTriangle, Zap, Minus, ArrowUpRight, ArrowDownRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, LineChart, Line } from "recharts";

/* ---------------- severity + band semantics (dual-encoded) ---------------- */
export const SEVERITY = {
  High: { label: "High", color: "text-rose-400", dot: "bg-rose-500",
    cls: "bg-rose-500/10 text-rose-400 border-rose-500/20", Icon: AlertTriangle },
  Moderate: { label: "Moderate", color: "text-amber-400", dot: "bg-amber-500",
    cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", Icon: TrendingUp },
  Low: { label: "Low", color: "text-emerald-400", dot: "bg-emerald-500",
    cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", Icon: CheckCircle2 },
};

export const BANDS = {
  stable: { label: "Stable", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", Icon: CheckCircle2 },
  watch: { label: "Watch", cls: "bg-sky-500/10 text-sky-400 border-sky-500/20", Icon: TrendingUp },
  meaningful: { label: "Meaningful deviation", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", Icon: AlertTriangle },
  high: { label: "High deviation", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20", Icon: Zap },
};

export const STATUS_CLS = {
  "New": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "Under Review": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Needs Follow-up": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Needs review": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Resolved": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Dismissed": "bg-muted text-muted-foreground border-border",
  "Open": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "In Progress": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Context Requested": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Context Received": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  "Follow-up": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Escalated": "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export const BASELINE_MATURITY_CLS = {
  building: "bg-muted text-muted-foreground border-border",
  developing: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  established: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export function SeverityBadge({ severity, testid }) {
  const m = SEVERITY[severity] || SEVERITY.Low;
  const { Icon } = m;
  return (
    <span data-testid={testid} className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", m.cls)}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

export function BandBadge({ band, testid }) {
  const m = BANDS[band?.key] || BANDS.stable;
  const { Icon } = m;
  return (
    <span data-testid={testid} className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", m.cls)}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

export function StatusBadge({ status, testid }) {
  return (
    <span data-testid={testid} className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
      STATUS_CLS[status] || "bg-muted text-muted-foreground border-border")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", (STATUS_CLS[status] || "").includes("emerald") ? "bg-emerald-500" :
        (STATUS_CLS[status] || "").includes("amber") ? "bg-amber-500" :
        (STATUS_CLS[status] || "").includes("indigo") ? "bg-indigo-500" :
        (STATUS_CLS[status] || "").includes("sky") ? "bg-sky-500" : "bg-muted-foreground")} />
      {status}
    </span>
  );
}

export function ConfidenceBadge({ confidence, testid }) {
  if (confidence == null) return null;
  const tone = confidence >= 70 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : confidence >= 50 ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
    : "bg-muted text-muted-foreground border-border";
  return (
    <span data-testid={testid} title="Confidence that this deviation is a meaningful, evidenced pattern — independent of severity (magnitude)."
      className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums", tone)}>
      Confidence {confidence}%
    </span>
  );
}

export function BaselineStatusBadge({ status, testid }) {
  if (!status) return null;
  const cls = {
    building: "bg-muted text-muted-foreground border-border",
    developing: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    established: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  }[status.key] || "bg-muted text-muted-foreground border-border";
  return (
    <span data-testid={testid} title={status.detail}
      className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", cls)}>
      Baseline: {status.label}
    </span>
  );
}

export function TrendIcon({ trend }) {
  if (trend === "up") return <ArrowUpRight className="h-4 w-4 text-rose-400" />;
  if (trend === "down") return <ArrowDownRight className="h-4 w-4 text-emerald-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function StudentAvatar({ src, name, size = 32 }) {
  return (
    <div className="rounded-lg overflow-hidden bg-muted border border-border shrink-0 grid place-items-center"
      style={{ width: size, height: size }}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" />
        : <span className="text-xs font-semibold text-muted-foreground">{name?.slice(0, 1)}</span>}
    </div>
  );
}

/* ---------------- layout primitives ---------------- */
export function PageHeader({ title, subtitle, children, testid }) {
  return (
    <div data-testid={testid} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function MetricCard({ label, value, delta, deltaTone = "muted", spark, icon: Icon, testid }) {
  return (
    <div data-testid={testid} className="rounded-xl border border-border bg-card p-4 lg:p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{value}</div>
        {spark && (
          <div className="w-20 h-8 opacity-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark.map((v, i) => ({ i, v }))}>
                <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {delta && (
        <div className={cn("mt-1 text-xs font-medium",
          deltaTone === "up" ? "text-rose-400" : deltaTone === "down" ? "text-emerald-400" : "text-muted-foreground")}>
          {delta}
        </div>
      )}
    </div>
  );
}

export function ChartCard({ title, subtitle, action, children, className, testid }) {
  return (
    <div data-testid={testid} className={cn("rounded-xl border border-border bg-card p-5", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon = ShieldCheck, action, testid }) {
  return (
    <div data-testid={testid} className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-12 w-12 rounded-xl bg-muted grid place-items-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ rows = 5 }) {
  return (
    <div className="space-y-3" data-testid="loading-state">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
    </div>
  );
}

export function TrustBanner({ testid = "trust-banner" }) {
  return (
    <div data-testid={testid} className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4 flex items-start gap-3">
      <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-foreground">Designed for educator review</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Continuum surfaces behavioral trends and supporting evidence for human review. It does not make
          disciplinary decisions or determine academic misconduct.
        </p>
      </div>
    </div>
  );
}

export function FactorBar({ label, value, tone = "primary" }) {
  const toneMap = { primary: "bg-primary", rose: "bg-rose-500", amber: "bg-amber-500", indigo: "bg-indigo-500" };
  const t = value >= 60 ? "rose" : value >= 40 ? "amber" : value >= 20 ? "primary" : "indigo";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground tabular-nums">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", toneMap[t])} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
