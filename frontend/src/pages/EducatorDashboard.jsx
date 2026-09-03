import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  GraduationCap, LogOut, Moon, Sun, UserPlus, Upload, Users,
  ThumbsUp, MessageSquareText, Eye, CalendarClock, ArrowUpCircle, ChevronDown, ArrowRight,
  BookOpen, ScrollText, BarChart3,
} from "lucide-react";
import { AddStudentModal, ImportStudentsModal } from "@/components/StudentDataModals";
import api from "@/lib/api";
import { LogoMark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { StudentAvatar, ChartCard, Loading, SeverityBadge, StatusBadge, EmptyState, ConfidenceBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Analytics from "@/pages/Analytics";

const QUICK_ACTIONS = [
  { key: "expected_behavior", label: "Expected Behavior", Icon: ThumbsUp },
  { key: "explained_context", label: "Explained by Context", Icon: MessageSquareText },
  { key: "continue_monitoring", label: "Continue Monitoring", Icon: Eye },
  { key: "follow_up", label: "Follow-up Meeting", Icon: CalendarClock },
  { key: "escalate", label: "Escalate", Icon: ArrowUpCircle },
];

/* ---------------- Human-in-the-loop review queue ---------------- */
function EducatorReviewsPanel() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["reviews", status],
    queryFn: async () => (await api.get("/reviews", { params: { status } })).data,
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action }) => api.post(`/reviews/${id}/action`, { action }),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success(`Action recorded: ${QUICK_ACTIONS.find((a) => a.key === action)?.label}`);
    },
  });

  const STATUSES = ["all", "Open", "In Progress", "Context Requested", "Follow-up"];

  return (
    <ChartCard testid="educator-reviews-panel" title="Human-in-the-Loop Reviews"
      subtitle="Active review queue across your institution. Every action is recorded to the audit trail."
      action={
        <div className="flex gap-1.5">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)} data-testid={`reviews-filter-${s.toLowerCase().replace(/ /g, "-")}`}
              className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors ${status === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      }>
      {isLoading ? <Loading rows={4} /> :
        data.total === 0 ? <EmptyState title="No signals require review" description="Your institution currently has no unresolved behavioral deviations." /> : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="font-medium py-2 px-3">Student</th>
                <th className="font-medium py-2 px-3">Signal</th>
                <th className="font-medium py-2 px-3">Severity</th>
                <th className="font-medium py-2 px-3">Confidence</th>
                <th className="font-medium py-2 px-3">Assigned reviewer</th>
                <th className="font-medium py-2 px-3">Status</th>
                <th className="font-medium py-2 px-3 text-right">Quick action</th>
              </tr>
            </thead>
            <tbody>
              {data.reviews.map((r) => (
                <tr key={r.id} data-testid={`educator-review-row-${r.id}`} onClick={() => nav(`/reviews/${r.id}`)}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                  <td className="py-2.5 px-3"><div className="flex items-center gap-2.5"><StudentAvatar src={r.student_avatar} name={r.student_name} size={28} /><span className="font-medium text-foreground">{r.student_name}</span></div></td>
                  <td className="py-2.5 px-3 text-muted-foreground">{r.signal_type}<span className="text-xs block font-mono">{r.course_code} · {r.semester}</span></td>
                  <td className="py-2.5 px-3"><SeverityBadge severity={r.severity} /></td>
                  <td className="py-2.5 px-3"><ConfidenceBadge confidence={r.confidence} /></td>
                  <td className="py-2.5 px-3 text-muted-foreground">{r.assigned_reviewer}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                  <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5" disabled={actionMut.isPending} data-testid={`review-actions-${r.id}`}>
                          Actions <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {QUICK_ACTIONS.map(({ key, label, Icon }) => (
                          <DropdownMenuItem key={key} onClick={() => actionMut.mutate({ id: r.id, action: key })} data-testid={`review-action-${key}-${r.id}`}>
                            <Icon className="h-4 w-4 mr-2" /> {label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <div className="pt-3 text-xs text-muted-foreground">{data.total} reviews in queue</div>}
    </ChartCard>
  );
}

export default function EducatorDashboard() {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: sstats } = useQuery({ queryKey: ["students-stats"], queryFn: async () => (await api.get("/students-stats")).data });
  const { data: sdata, isLoading } = useQuery({
    queryKey: ["students", "educator-recent"],
    queryFn: async () => (await api.get("/students?sort=name&order=asc&page_size=8")).data,
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["students-stats"] }); qc.invalidateQueries({ queryKey: ["students"] }); };

  const doLogout = async () => { await logout(); nav("/educator/login"); };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center gap-3 px-4 lg:px-8">
        <LogoMark size={26} />
        <span className="font-bold tracking-tight">CONTINUUM</span>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-[11px] font-medium text-primary ml-1">
          <GraduationCap className="h-3 w-3" /> EDUCATOR WORKSPACE
        </span>
        <nav className="hidden lg:flex items-center gap-1 ml-4">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => nav("/courses")} data-testid="educator-nav-courses"><BookOpen className="h-3.5 w-3.5" /> Courses</Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => nav("/audit-log")} data-testid="educator-nav-audit"><ScrollText className="h-3.5 w-3.5" /> Audit Log</Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => nav("/dashboard")} data-testid="educator-nav-full-workspace"><BarChart3 className="h-3.5 w-3.5" /> Full Workspace</Button>
        </nav>
        <div className="flex-1" />
        <button data-testid="educator-theme-toggle" onClick={toggle}
          className="h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-muted transition-colors">
          {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
        </button>
        <StudentAvatar src={user?.picture} name={user?.name} size={32} />
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={doLogout} data-testid="educator-logout-button">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </Button>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:p-8 space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Welcome, {(user?.name || "").split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Upload and manage your students' academic details, review surfaced behavioral signals, and monitor
            institution-wide analytics — all in one educator workspace.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[["Total Students", sstats?.total ?? "—"], ["Added This Month", sstats?.new_this_month ?? "—"],
            ["Active Signals", sstats?.active_signals ?? "—"], ["Require Review", sstats?.require_review ?? "—"]].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-border bg-card p-4">
              <div className="text-2xl font-bold tabular-nums text-foreground">{v}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{l}</div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="workspace" data-testid="educator-tabs">
          <TabsList>
            <TabsTrigger value="workspace" data-testid="tab-workspace">Workspace</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="workspace" className="space-y-6 mt-4">
            <ChartCard testid="educator-upload-panel" title="Add student details" subtitle="Upload one student at a time or import a full CSV / XLSX roster">
              <div className="flex flex-wrap gap-3">
                <Button className="gap-2" onClick={() => setAddOpen(true)} data-testid="educator-add-student-btn">
                  <UserPlus className="h-4 w-4" /> Add Student
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)} data-testid="educator-import-btn">
                  <Upload className="h-4 w-4" /> Import Students (CSV / XLSX)
                </Button>
              </div>
            </ChartCard>

            <ChartCard testid="educator-students-list" title="Your students" subtitle="Most recently added students in your workspace"
              action={<Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => nav("/students")} data-testid="educator-view-all-students">View all students <ArrowRight className="h-3.5 w-3.5" /></Button>}>
              {isLoading ? <Loading rows={3} /> : (sdata?.students?.length ? (
                <div className="divide-y divide-border">
                  {sdata.students.map((s) => (
                    <button key={s.id} data-testid={`educator-student-${s.id}`} onClick={() => nav(`/students/${s.id}`)}
                      className="w-full flex items-center gap-3 py-2.5 rounded-lg px-2 -mx-2 hover:bg-muted/50 transition-colors text-left">
                      <StudentAvatar src={s.avatar} name={s.name} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.student_id} · {s.program}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-10 gap-3">
                  <div className="h-11 w-11 rounded-xl bg-muted grid place-items-center"><Users className="h-5 w-5 text-muted-foreground" /></div>
                  <p className="text-sm text-muted-foreground">No students yet. Add your first student to get started.</p>
                </div>
              ))}
            </ChartCard>
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            <EducatorReviewsPanel />
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <Analytics />
          </TabsContent>
        </Tabs>
      </main>

      <AddStudentModal open={addOpen} onOpenChange={setAddOpen} onCreated={refresh} showViewProfile={false} />
      <ImportStudentsModal open={importOpen} onOpenChange={setImportOpen} onDone={refresh} />
    </div>
  );
}
