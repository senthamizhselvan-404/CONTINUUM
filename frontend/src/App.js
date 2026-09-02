import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import Login from "@/pages/Login";
import EducatorLogin from "@/pages/EducatorLogin";
import EducatorDashboard from "@/pages/EducatorDashboard";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import StudentProfile from "@/pages/StudentProfile";
import Signals from "@/pages/Signals";
import SignalDetail from "@/pages/SignalDetail";
import Reviews from "@/pages/Reviews";
import ReviewDetail from "@/pages/ReviewDetail";
import Analytics from "@/pages/Analytics";
import Courses from "@/pages/Courses";
import CourseDetail from "@/pages/CourseDetail";
import DataSources from "@/pages/DataSources";
import AuditLog from "@/pages/AuditLog";
import SettingsPage from "@/pages/Settings";
import { LogoMark } from "@/components/Logo";

function FullLoader() {
  return (
    <div className="min-h-screen bg-background grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <LogoMark size={40} className="animate-pulse" />
        <span className="text-sm text-muted-foreground">Loading CONTINUUM…</span>
      </div>
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "educator") return <Navigate to="/educator" replace />;
  return <AppShell>{children}</AppShell>;
}

function ProtectedEducator({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/educator/login" replace />;
  if (user.role !== "educator") return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/educator/login" element={<EducatorLogin />} />
      <Route path="/educator" element={<ProtectedEducator><EducatorDashboard /></ProtectedEducator>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/students" element={<Protected><Students /></Protected>} />
      <Route path="/students/:id" element={<Protected><StudentProfile /></Protected>} />
      <Route path="/signals" element={<Protected><Signals /></Protected>} />
      <Route path="/signals/:id" element={<Protected><SignalDetail /></Protected>} />
      <Route path="/reviews" element={<Protected><Reviews /></Protected>} />
      <Route path="/reviews/:id" element={<Protected><ReviewDetail /></Protected>} />
      <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
      <Route path="/courses" element={<Protected><Courses /></Protected>} />
      <Route path="/courses/:code" element={<Protected><CourseDetail /></Protected>} />
      <Route path="/data-sources" element={<Protected><DataSources /></Protected>} />
      <Route path="/audit-log" element={<Protected><AuditLog /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
