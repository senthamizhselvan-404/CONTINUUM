# CONTINUUM — Product Requirements & Architecture

## Original problem statement
Build CONTINUUM, an investor-facing academic-integrity SaaS MVP. Tagline: "Academic integrity has a memory problem." Longitudinal, human-in-the-loop behavioral analytics that surfaces meaningful behavioral change across a student's academic history (writing-style drift, submission-pattern shifts, performance volatility, cross-semester drift) for **educator review** — never accuses. Series-A enterprise UX quality (Apple/Linear/Stripe/Notion/Vercel principles).

## User choices
- Auth: Emergent-managed Google login + one-click "Enter Demo".
- LLM explanations: Claude Sonnet 4.6 via Emergent universal key.
- Theme: dark-first with premium light toggle. Accent: Electric Cyan #0EA5E9.

## Tech stack
- Frontend: React 19, react-router 7, TanStack Query, Recharts, Tailwind + shadcn/ui, Plus Jakarta Sans + JetBrains Mono, sonner toasts.
- Backend: FastAPI, Motor (async MongoDB), httpx, emergentintegrations (Claude Sonnet 4.6).
- DB: MongoDB (collections: institution, departments, courses, semesters, students, signals, reviews, audit_events, data_sources, settings, users, user_sessions).

## Architecture
- Analytics engine (`analytics_engine.py`): deterministic synthetic pipeline — buildBaseline, analyzeWritingDrift, analyzePerformanceVolatility, analyzeSubmissionPatterns, calculateLongitudinalTrend, generateRiskSignal, generateExplanation. Prototype Behavioral Deviation Index (0-100, weighted writing/submission/performance/longitudinal) with bands Stable/Watch/Meaningful/High. Architected so an ML/LLM model can replace it.
- Synthetic data (`seed_data.py`): 1 institution, 3 departments, 10 courses, 5 semesters, 112 students, 38 signals, reviews, audit trail. Curated demo cases: Arjun Kumar (writing drift, hero), Meera Nair (multi-signal), Rahul Menon (performance volatility), Aisha Khan (submission pattern), Priya/Daniel/Ananya (stable).
- Auth: Emergent Google OAuth (session_token httpOnly cookie, 7-day) + demo endpoint. Owner = senthamizhsarathy@gmail.com.
- LLM (`llm_service.py`): guardrailed, non-accusatory explanations; deterministic fallback on failure; persisted on signal.

## Implemented (2026-06)
- Login (Google + Enter Demo), full app shell (collapsible sidebar, global search, notifications, theme toggle, DEMO ENVIRONMENT badge).
- Dashboard (KPIs, Behavioral Signals Over Time, Signal Distribution, Signals Requiring Attention, Old-World vs Continuum, trust banner).
- Students table (search/filter/sort/pagination) + Student longitudinal profile (deviation gauge, 5-semester timeline, baseline, writing radar, performance range chart, submission behavior, signals).
- Risk Signals list + filters; Signal detail ("Why am I seeing this?" factor breakdown, evidence ledger, LLM explanation, status update).
- Reviews queue + Review workspace (notes, 5 actions, all update state + audit).
- Analytics (signals by semester, risk trend, categories, course distribution, stability, outcomes).
- Courses list + detail (students/signals/trends tabs). Data Sources (simulated). Audit Log. Settings (institution, users, roles, prototype thresholds, privacy, reset demo).
- Human-in-the-loop trust language throughout; responsive; dark/light; data-testid coverage. Verified: 21/21 backend tests + all frontend flows.

## Known limitations
- Data-source connectors (LMS/Gradebook/Repository/SIS) are SIMULATED statuses (no live integration).
- Analytics are deterministic synthetic, not a validated detector (labeled "Prototype").
- Demo endpoint is open (fine for investor demo; gate/rate-limit for prod).

## Iteration 2 (2026-06) — Reviewer is the operator
- Reviewer adds/imports/manages student data from inside the dashboard (no student portal).
- Backend: student_engine.py recomputes longitudinal analytics + generates explainable signals from RAW records (grades, submission timing, stylometry). import_utils.py parses CSV/XLSX, builds template, summarizes new-vs-existing. Endpoints: POST /students, GET /students/import/template, POST /students/import/preview|commit|demo, POST /students/{id}/records, POST /students/{id}/records/import, GET /students-stats. Imports APPEND (never overwrite) keyed by student_id; analytics recompute on every change; audit + activity logged.
- Frontend: AddStudentModal, ImportStudentsModal (drag-drop + preview + New/Existing + demo + template), AddRecordModal, UploadRecordsModal. Students empty-workspace state; Student profile Academic History + Submission Audit + Review History/Audit Trail + Add/Upload actions; Dashboard Students workspace section + Recent Activity.
- Tested 13/13 new endpoints + frontend flows. Fixed CRITICAL /api/overview IndexError (tolerates short performance.series). Demo reset clears student_activity.

## Backlog / next production steps
- P1: Replace analytics engine with real ML feature pipeline; live data-source connectors.
- P1: RBAC enforcement per role (owner/dept admin/reviewer/faculty) + department scoping.
- P2: Typed request validation (pydantic) on mutations; FastAPI lifespan; status enum validation.
- P2: Notifications/assignment workflow, export/reporting, SSO/SAML.
