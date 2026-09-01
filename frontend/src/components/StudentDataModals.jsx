import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileSpreadsheet, Download, Sparkles, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

function Dropzone({ onFile, testid }) {
  const [drag, setDrag] = useState(false);
  const [name, setName] = useState(null);
  const handle = (f) => { if (f) { setName(f.name); onFile(f); } };
  return (
    <label data-testid={testid}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
      className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors",
        drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40")}>
      <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      <div className="h-11 w-11 rounded-lg bg-muted grid place-items-center"><UploadCloud className="h-5 w-5 text-muted-foreground" /></div>
      {name ? <span className="text-sm text-foreground font-medium">{name}</span>
        : <><span className="text-sm text-foreground font-medium">Drop CSV / XLSX or click to browse</span>
          <span className="text-xs text-muted-foreground">Student records & academic history</span></>}
    </label>
  );
}

export function AddStudentModal({ open, onOpenChange, onCreated }) {
  const nav = useNavigate();
  const [f, setF] = useState({ student_id: "", full_name: "", email: "", department: "Computer Science", program: "B.Sc Computer Science", year: "1", enrollment_date: "", current_semester: "1", current_gpa: "", advisor: "" });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v?.target ? v.target.value : v }));

  const submit = async () => {
    if (!f.student_id || !f.full_name) { toast.error("Student ID and Full Name are required"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/students", f);
      setCreated(data.id);
      toast.success("Student added successfully.");
      onCreated?.();
    } catch (e) { toast.error(e.response?.data?.detail || "Could not add student"); }
    finally { setBusy(false); }
  };

  const close = () => { setCreated(null); setF({ ...f, student_id: "", full_name: "", email: "", current_gpa: "", advisor: "" }); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Add Student</DialogTitle>
          <DialogDescription>Create a longitudinal student profile in your Continuum workspace.</DialogDescription></DialogHeader>
        {created ? (
          <div className="py-8 flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-sm font-semibold text-foreground">Student added successfully.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={close}>Add another</Button>
              <Button className="gap-2" data-testid="open-created-profile" onClick={() => { close(); nav(`/students/${created}`); }}>Open Student Profile <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
              <Field label="Student ID *"><Input data-testid="field-student-id" value={f.student_id} onChange={set("student_id")} placeholder="STU-2024-3001" /></Field>
              <Field label="Full Name *"><Input data-testid="field-full-name" value={f.full_name} onChange={set("full_name")} placeholder="Jane Doe" /></Field>
              <Field label="Email"><Input data-testid="field-email" value={f.email} onChange={set("email")} placeholder="jane@university.edu" /></Field>
              <Field label="Department"><Select value={f.department} onValueChange={set("department")}><SelectTrigger data-testid="field-department"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Computer Science">Computer Science</SelectItem><SelectItem value="Mathematics">Mathematics</SelectItem><SelectItem value="Applied Sciences">Applied Sciences</SelectItem></SelectContent></Select></Field>
              <Field label="Program"><Input data-testid="field-program" value={f.program} onChange={set("program")} placeholder="B.Sc Computer Science" /></Field>
              <Field label="Year"><Select value={f.year} onValueChange={set("year")}><SelectTrigger data-testid="field-year"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4].map(y=><SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Enrollment Date"><Input data-testid="field-enrollment" type="date" value={f.enrollment_date} onChange={set("enrollment_date")} /></Field>
              <Field label="Current Semester"><Select value={f.current_semester} onValueChange={set("current_semester")}><SelectTrigger data-testid="field-current-sem"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(y=><SelectItem key={y} value={String(y)}>Semester {y}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Current GPA / Grade"><Input data-testid="field-gpa" value={f.current_gpa} onChange={set("current_gpa")} placeholder="82" /></Field>
              <Field label="Advisor"><Input data-testid="field-advisor" value={f.advisor} onChange={set("advisor")} placeholder="Dr. Rao" /></Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={submit} disabled={busy} data-testid="submit-add-student" className="gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Add Student</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ImportStudentsModal({ open, onOpenChange, onDone }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setFile(null); setPreview(null); setBusy(false); };
  const close = () => { reset(); onOpenChange(false); };

  const downloadTemplate = async () => {
    try {
      const res = await api.get("/students/import/template", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = "continuum_student_template.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Could not download template"); }
  };

  const doPreview = async (f) => {
    setFile(f); setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const { data } = await api.post("/students/import/preview", fd);
      setPreview(data);
    } catch (e) { toast.error(e.response?.data?.detail || "Could not read file"); }
    finally { setBusy(false); }
  };

  const commit = async () => {
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/students/import/commit", fd);
      toast.success(`Imported — ${data.created} new, ${data.updated} updated, ${data.signals_generated} signals generated.`);
      onDone?.(); close();
    } catch (e) { toast.error(e.response?.data?.detail || "Import failed"); setBusy(false); }
  };

  const useDemo = async () => {
    setBusy(true);
    try { const { data } = await api.post("/students/import/demo"); toast.success(`Demo dataset processed — ${data.students} students.`); onDone?.(); close(); }
    catch { toast.error("Could not load demo dataset"); setBusy(false); }
  };

  const s = preview?.summary;
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{preview ? "Review Data Before Import" : "Import Student Data"}</DialogTitle>
          <DialogDescription>Add student records and academic history to Continuum.</DialogDescription></DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <Dropzone onFile={doPreview} testid="import-dropzone" />
            {busy && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Reading file…</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={downloadTemplate} data-testid="download-template-btn"><Download className="h-4 w-4" /> Download Template</Button>
              <Button variant="outline" className="gap-2" onClick={useDemo} disabled={busy} data-testid="use-demo-dataset-btn"><Sparkles className="h-4 w-4" /> Use Demo Dataset</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[["Records", s.total_records], ["Students", s.students], ["New", s.new_students], ["Existing", s.existing_students], ["Courses", s.courses], ["Semesters", s.semesters]].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
                  <div className="text-lg font-bold tabular-nums text-foreground">{v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
            {preview.errors?.length > 0 && <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-400">{preview.errors.length} potential issue(s): {preview.errors[0]}</div>}
            <div className="rounded-lg border border-border overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card"><tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 px-3">Student ID</th><th className="py-2 px-3">Student</th><th className="py-2 px-3">Course</th><th className="py-2 px-3">Sem</th><th className="py-2 px-3">Assignment</th><th className="py-2 px-3">Grade</th><th className="py-2 px-3">Status</th></tr></thead>
                <tbody>
                  {preview.preview.map((r, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 px-3 font-mono">{r.student_id}</td><td className="py-1.5 px-3">{r.student_name}</td>
                      <td className="py-1.5 px-3 font-mono">{r.course_code}</td><td className="py-1.5 px-3">{r.semester}</td>
                      <td className="py-1.5 px-3">{r.assignment_name}</td><td className="py-1.5 px-3">{r.grade ?? "—"}</td>
                      <td className="py-1.5 px-3"><span className={cn("rounded px-1.5 py-0.5", r.status === "New" ? "bg-sky-500/10 text-sky-400" : "bg-amber-500/10 text-amber-400")}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={commit} disabled={busy} data-testid="commit-import-btn" className="gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Import Data</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AddRecordModal({ open, onOpenChange, studentId, onSaved }) {
  const [f, setF] = useState({ semester: "5", course_code: "", course_name: "", assignment_name: "", grade: "", submission_date: "", deadline: "", writing_sample: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v?.target ? v.target.value : v }));
  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/students/${studentId}/records`, f);
      toast.success(`Student audit updated.${data.signals_generated ? ` ${data.signals_generated} new signal.` : ""}`);
      onSaved?.(); onOpenChange(false);
      setF({ ...f, assignment_name: "", grade: "", writing_sample: "" });
    } catch { toast.error("Could not save record"); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Add Academic Record</DialogTitle>
          <DialogDescription>Continuum will recompute this student's longitudinal analytics.</DialogDescription></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          <Field label="Semester"><Select value={f.semester} onValueChange={set("semester")}><SelectTrigger data-testid="rec-semester"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(y=><SelectItem key={y} value={String(y)}>Semester {y}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Course Code"><Input data-testid="rec-course-code" value={f.course_code} onChange={set("course_code")} placeholder="CS301" /></Field>
          <Field label="Course Name"><Input value={f.course_name} onChange={set("course_name")} placeholder="Machine Learning" /></Field>
          <Field label="Assignment"><Input data-testid="rec-assignment" value={f.assignment_name} onChange={set("assignment_name")} placeholder="Project Report" /></Field>
          <Field label="Grade"><Input data-testid="rec-grade" value={f.grade} onChange={set("grade")} placeholder="61" /></Field>
          <Field label="Submission Date"><Input data-testid="rec-submission" type="datetime-local" value={f.submission_date} onChange={set("submission_date")} /></Field>
          <Field label="Deadline"><Input data-testid="rec-deadline" type="datetime-local" value={f.deadline} onChange={set("deadline")} /></Field>
          <div className="sm:col-span-2"><Field label="Writing Sample"><Textarea data-testid="rec-writing" value={f.writing_sample} onChange={set("writing_sample")} placeholder="Paste a text excerpt for stylometric analysis…" className="min-h-[80px]" /></Field></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy} data-testid="save-record-btn" className="gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UploadRecordsModal({ open, onOpenChange, studentId, onSaved }) {
  const [busy, setBusy] = useState(false);
  const upload = async (f) => {
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const { data } = await api.post(`/students/${studentId}/records/import`, fd);
      toast.success(`Added ${data.added} record(s) to student history. ${data.signals_generated} new signal(s).`);
      onSaved?.(); onOpenChange(false);
    } catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Upload Additional Records</DialogTitle>
          <DialogDescription>New academic records are appended to this student's longitudinal history — existing history is never replaced.</DialogDescription></DialogHeader>
        <Dropzone onFile={upload} testid="upload-records-dropzone" />
        {busy && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing & recomputing baseline…</p>}
      </DialogContent>
    </Dialog>
  );
}
