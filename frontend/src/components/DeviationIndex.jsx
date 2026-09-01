import React from "react";
import { FactorBar } from "@/components/common";
import { cn } from "@/lib/utils";

const BAND_COLOR = {
  stable: "hsl(var(--chart-3))", watch: "hsl(var(--primary))",
  meaningful: "hsl(var(--chart-4))", high: "hsl(var(--chart-5))",
};

export function DeviationGauge({ index, band, size = 132 }) {
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(index, 100) / 100;
  const offset = circ * (1 - pct * 0.75); // 270deg arc
  const color = BAND_COLOR[band?.key] || BAND_COLOR.stable;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[135deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="9"
          strokeLinecap="round" strokeDasharray={`${circ * 0.75} ${circ}`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={`${circ * 0.75} ${circ}`} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums text-foreground">{index}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export function DeviationIndex({ index, band, factors, testid = "deviation-index" }) {
  return (
    <div data-testid={testid} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold">Prototype Behavioral Deviation Index</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Not a scientifically validated risk score. Every score shows its contributing factors.</p>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <DeviationGauge index={index} band={band} />
          <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
            band?.key === "high" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
            band?.key === "meaningful" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
            band?.key === "watch" ? "bg-sky-500/10 text-sky-400 border-sky-500/20" :
            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")}>
            {band?.label} · {band?.range}
          </span>
        </div>
        <div className="flex-1 w-full space-y-3">
          <FactorBar label="Writing drift" value={factors.writing} />
          <FactorBar label="Submission pattern drift" value={factors.submission} />
          <FactorBar label="Performance deviation" value={factors.performance} />
          <FactorBar label="Longitudinal change" value={factors.longitudinal} />
        </div>
      </div>
    </div>
  );
}
