import React, { useState } from "react";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowUpDown, UserPlus, Upload, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, Loading, BandBadge, StudentAvatar, TrendIcon, EmptyState } from "@/components/common";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddStudentModal, ImportStudentsModal } from "@/components/StudentDataModals";

export default function Students() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [program, setProgram] = useState("all");
  const [sort, setSort] = useState("deviation");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const pageSize = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["students", q, status, program, sort, order, page],
    queryFn: async () => (await api.get("/students", { params: { q, status, program, sort, order, page, page_size: pageSize } })).data,
    placeholderData: keepPreviousData,
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["students"] }); qc.invalidateQueries({ queryKey: ["students-stats"] }); qc.invalidateQueries({ queryKey: ["overview"] }); };

  const toggleSort = (key) => {
    if (sort === key) setOrder((o) => (o === "desc" ? "asc" : "desc"));
    else { setSort(key); setOrder("desc"); }
    setPage(1);
  };

  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const emptyWorkspace = !isLoading && total === 0 && !q && status === "all" && program === "all";

  const modals = (
    <>
      <AddStudentModal open={addOpen} onOpenChange={setAddOpen} onCreated={refresh} />
      <ImportStudentsModal open={importOpen} onOpenChange={setImportOpen} onDone={refresh} />
    </>
  );

  if (emptyWorkspace) {
    return (
      <div className="space-y-6">
        <PageHeader testid="students-header" title="Students" subtitle="Monitor longitudinal academic behavior across your institution." />
        <div className="rounded-xl border border-border bg-card grid-texture">
          <EmptyState testid="empty-workspace" icon={Sparkles} title="Your Continuum workspace is ready."
            description="Add students or import academic records to begin building longitudinal profiles."
            action={
              <div className="flex flex-wrap gap-2 justify-center">
                <Button className="gap-2" onClick={() => setAddOpen(true)} data-testid="empty-add-student"><UserPlus className="h-4 w-4" /> Add Student</Button>
                <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)} data-testid="empty-import"><Upload className="h-4 w-4" /> Import Student Data</Button>
                <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)} data-testid="empty-demo"><Sparkles className="h-4 w-4" /> Explore Demo Dataset</Button>
              </div>
            } />
        </div>
        {modals}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader testid="students-header" title="Students"
        subtitle="Monitor longitudinal academic behavior across your institution.">
        <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)} data-testid="import-students-btn"><Upload className="h-4 w-4" /> Import Data</Button>
        <Button className="gap-2" onClick={() => setAddOpen(true)} data-testid="add-student-btn"><UserPlus className="h-4 w-4" /> Add Student</Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <input data-testid="students-search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search by name or student ID…"
          className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50" />
        <Select value={program} onValueChange={(v) => { setProgram(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48" data-testid="filter-program"><SelectValue placeholder="Program" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            <SelectItem value="Computer Science">Computer Science</SelectItem>
            <SelectItem value="Mathematics">Mathematics</SelectItem>
            <SelectItem value="Applied Sciences">Applied Sciences</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48" data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="stable">Stable</SelectItem>
            <SelectItem value="watch">Watch</SelectItem>
            <SelectItem value="meaningful">Meaningful deviation</SelectItem>
            <SelectItem value="high">High deviation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading && !data ? <div className="p-6"><Loading rows={6} /></div> :
          total === 0 ? <EmptyState title="No students match your filters" description="Try adjusting search or filters." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
                  <th className="font-medium py-2.5 px-4"><button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground">Student <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="font-medium py-2.5 px-4">Program</th>
                  <th className="font-medium py-2.5 px-4"><button onClick={() => toggleSort("year")} className="inline-flex items-center gap-1 hover:text-foreground">Year <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="font-medium py-2.5 px-4">Behavioral Status</th>
                  <th className="font-medium py-2.5 px-4"><button onClick={() => toggleSort("signals")} className="inline-flex items-center gap-1 hover:text-foreground">Signals <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="font-medium py-2.5 px-4">Last Activity</th>
                  <th className="font-medium py-2.5 px-4"><button onClick={() => toggleSort("deviation")} className="inline-flex items-center gap-1 hover:text-foreground">Index <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="font-medium py-2.5 px-4">Trend</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.id} data-testid={`student-row-${s.id}`} onClick={() => nav(`/students/${s.id}`)}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3">
                        <StudentAvatar src={s.avatar} name={s.name} size={30} />
                        <div>
                          <div className="font-medium text-foreground">{s.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{s.student_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-muted-foreground">{s.program}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">Year {s.year}</td>
                    <td className="py-2.5 px-4"><BandBadge band={s.band} /></td>
                    <td className="py-2.5 px-4 tabular-nums text-foreground">{s.signal_count}</td>
                    <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{s.last_activity}</td>
                    <td className="py-2.5 px-4 font-mono font-semibold tabular-nums text-foreground">{s.deviation_index}</td>
                    <td className="py-2.5 px-4"><TrendIcon trend={s.trend} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="page-prev"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="tabular-nums">Page {page} / {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} data-testid="page-next"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
      {modals}
    </div>
  );
}
