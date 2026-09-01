import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ThumbsUp, MessageSquarePlus, ArrowUpCircle, XCircle, Send } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Loading, SeverityBadge, StatusBadge, StudentAvatar, ChartCard, TrustBanner, FactorBar, BandBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const ACTIONS = [
  { key: "acknowledge", label: "Acknowledge", Icon: Check },
  { key: "expected", label: "Mark as expected behavior", Icon: ThumbsUp },
  { key: "request_info", label: "Request additional information", Icon: MessageSquarePlus },
  { key: "escalate", label: "Escalate", Icon: ArrowUpCircle },
  { key: "dismiss", label: "Dismiss", Icon: XCircle },
];

export default function ReviewDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const { data: r, isLoading } = useQuery({ queryKey: ["review", id], queryFn: async () => (await api.get(`/reviews/${id}`)).data });

  const actionMut = useMutation({
    mutationFn: (action) => api.post(`/reviews/${id}/action`, { action }),
    onSuccess: (_, action) => { qc.invalidateQueries({ queryKey: ["review", id] }); toast.success(`Action recorded: ${ACTIONS.find(a => a.key === action)?.label}`); },
  });
  const noteMut = useMutation({
    mutationFn: (text) => api.post(`/reviews/${id}/notes`, { text }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["review", id] }); setNote(""); toast.success("Note saved"); },
  });

  if (isLoading || !r) return <Loading />;
  const sig = r.signal, st = r.student;

  return (
    <div className="space-y-6">
      <button onClick={() => nav("/reviews")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="back-to-reviews">
        <ArrowLeft className="h-4 w-4" /> Reviews
      </button>

      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <StudentAvatar src={r.student_avatar} name={r.student_name} size={56} />
          <div>
            <div className="flex items-center gap-2 flex-wrap"><h1 className="text-xl font-bold tracking-tight">Signal Review</h1><SeverityBadge severity={r.severity} /><StatusBadge status={r.status} /></div>
            <p className="text-sm text-muted-foreground mt-1">{r.student_name} · {r.signal_type} · {r.course_code} · {r.semester}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChartCard testid="review-student-overview" title="Student overview">
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div><div className="text-xs text-muted-foreground">Program</div><div className="text-foreground font-medium">{st.program} · Year {st.year}</div></div>
              <div><div className="text-xs text-muted-foreground">Deviation index</div><div className="text-foreground font-medium font-mono">{st.deviation_index}/100</div></div>
              <div><div className="text-xs text-muted-foreground">Baseline</div><BandBadge band={st.band} /></div>
            </div>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => nav(`/students/${st.id}`)} data-testid="view-full-profile">View full longitudinal profile</Button>
          </ChartCard>

          <ChartCard testid="review-signal-summary" title="Signal summary & supporting evidence">
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mb-4">
              <FactorBar label="Writing-style deviation" value={sig.factors.writing} />
              <FactorBar label="Submission-pattern deviation" value={sig.factors.submission} />
              <FactorBar label="Performance deviation" value={sig.factors.performance} />
              <FactorBar label="Longitudinal change" value={sig.factors.longitudinal} />
            </div>
            {sig.explanation && <p className="text-sm text-foreground leading-relaxed rounded-lg border border-border bg-muted/20 p-3">{sig.explanation}</p>}
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">Historical baseline</div><div className="text-foreground font-medium">Previous 4 semesters</div></div>
              <div className="rounded-lg border border-border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">Recent behavior</div><div className="text-foreground font-medium">Last 3 submissions</div></div>
            </div>
            <Button variant="ghost" size="sm" className="mt-3 text-primary" onClick={() => nav(`/signals/${sig.id}`)} data-testid="view-signal-detail">Open full signal investigation →</Button>
          </ChartCard>

          <ChartCard testid="reviewer-notes" title="Reviewer notes">
            <div className="space-y-3 mb-4">
              {r.notes?.length ? r.notes.map((n) => (
                <div key={n.id} className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1"><span className="font-medium text-foreground">{n.reviewer}</span><span>{n.timestamp}</span></div>
                  <p className="text-sm text-foreground">{n.text}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">No notes yet.</p>}
            </div>
            <Textarea data-testid="note-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a reviewer note (e.g., context provided by the student)…" className="min-h-[80px]" />
            <Button className="mt-3 gap-2" disabled={!note.trim() || noteMut.isPending} onClick={() => noteMut.mutate(note)} data-testid="save-note-btn">
              <Send className="h-4 w-4" /> Save note
            </Button>
          </ChartCard>
        </div>

        <div className="space-y-6">
          <ChartCard testid="review-actions" title="Actions" subtitle="Each action updates state & audit trail">
            <div className="space-y-2">
              {ACTIONS.map(({ key, label, Icon }) => (
                <Button key={key} variant="outline" className="w-full justify-start gap-2.5 h-10" disabled={actionMut.isPending}
                  onClick={() => actionMut.mutate(key)} data-testid={`action-${key}`}>
                  <Icon className="h-4 w-4 text-muted-foreground" /> {label}
                </Button>
              ))}
            </div>
          </ChartCard>
          <TrustBanner />
        </div>
      </div>
    </div>
  );
}
