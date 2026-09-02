import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, Moon, Sun, UserPlus, Upload, Users } from "lucide-react";
import { AddStudentModal, ImportStudentsModal } from "@/components/StudentDataModals";
import api from "@/lib/api";
import { LogoMark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { StudentAvatar, ChartCard, Loading } from "@/components/common";
import { Button } from "@/components/ui/button";

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

      <main className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Welcome, {(user?.name || "").split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Upload and manage your students' academic details. Continuum builds a longitudinal behavioral baseline from
            the records you provide, for educator review only.
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

        <ChartCard testid="educator-students-list" title="Your students" subtitle="Most recently added students in your workspace">
          {isLoading ? <Loading rows={3} /> : (sdata?.students?.length ? (
            <div className="divide-y divide-border">
              {sdata.students.map((s) => (
                <div key={s.id} data-testid={`educator-student-${s.id}`}
                  className="w-full flex items-center gap-3 py-2.5 rounded-lg px-2 -mx-2">
                  <StudentAvatar src={s.avatar} name={s.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.student_id} · {s.program}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-10 gap-3">
              <div className="h-11 w-11 rounded-xl bg-muted grid place-items-center"><Users className="h-5 w-5 text-muted-foreground" /></div>
              <p className="text-sm text-muted-foreground">No students yet. Add your first student to get started.</p>
            </div>
          ))}
        </ChartCard>
      </main>

      <AddStudentModal open={addOpen} onOpenChange={setAddOpen} onCreated={refresh} showViewProfile={false} />
      <ImportStudentsModal open={importOpen} onOpenChange={setImportOpen} onDone={refresh} />
    </div>
  );
}
