import React from "react";
import { Check, X, ShieldCheck, Eye, Lock } from "lucide-react";
import { PageHeader, ChartCard } from "@/components/common";

const USED = [
  "Submission timestamps",
  "Assignment metadata",
  "Course performance",
  "Writing characteristics (stylometric features only — never full text retained beyond analysis)",
  "Historical academic patterns",
];

const NOT_USED = [
  "Private messages",
  "Social media activity",
  "Personal files",
  "Webcam surveillance",
  "Microphone surveillance",
  "Unrelated device activity",
];

const WHO = [
  { role: "Student", scope: "Own academic profile only" },
  { role: "Course Instructor", scope: "Relevant course signals for students they teach" },
  { role: "Academic Integrity Reviewer", scope: "Assigned review cases and their supporting evidence" },
  { role: "Institution Administrator", scope: "Aggregate, institution-level analytics — not individual student detail" },
];

export default function DataPrivacy() {
  return (
    <div className="space-y-6">
      <PageHeader testid="data-privacy-header" title="My Data"
        subtitle="What Continuum uses, what it never touches, and who can see it." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard testid="data-used" title="Data used by Continuum" subtitle="Only academic-context signals feed the longitudinal profile">
          <div className="space-y-2.5">
            {USED.map((d) => (
              <div key={d} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-foreground">{d}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard testid="data-not-used" title="Never used" subtitle="Continuum is designed to minimize unnecessary data collection">
          <div className="space-y-2.5">
            {NOT_USED.map((d) => (
              <div key={d} className="flex items-start gap-2.5 text-sm">
                <X className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard testid="data-who-sees" title={<span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Who can see this?</span>}
        subtitle="Access is role-based and scoped to what each role needs to do its job">
        <div className="space-y-2">
          {WHO.map((w) => (
            <div key={w.role} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm gap-4">
              <span className="font-medium text-foreground shrink-0">{w.role}</span>
              <span className="text-muted-foreground text-right">{w.scope}</span>
            </div>
          ))}
        </div>
      </ChartCard>

      <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4 flex items-start gap-3">
        <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Data access is logged</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Every time your record is opened for review, that access is recorded to an institutional audit trail. Continuum does
            not make automated disciplinary decisions — signals are surfaced for human educators, who review them alongside any
            context you choose to provide.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Purpose limitation</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Your academic data is used only to support academic-integrity review and academic-support workflows — never for
            unrelated evaluation, and never shared outside your institution.
          </p>
        </div>
      </div>
    </div>
  );
}
