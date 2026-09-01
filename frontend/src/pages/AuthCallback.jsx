import React, { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LogoMark } from "@/components/Logo";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const nav = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = location.hash || window.location.hash;
    const sessionId = new URLSearchParams(hash.replace("#", "")).get("session_id");
    if (!sessionId) { nav("/login", { replace: true }); return; }
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        setUser(data.user);
        window.history.replaceState(null, "", "/dashboard");
        nav("/dashboard", { replace: true, state: { user: data.user } });
      } catch {
        nav("/login", { replace: true });
      }
    })();
  }, [location.hash, nav, setUser]);

  return (
    <div className="min-h-screen bg-background grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <LogoMark size={40} className="animate-pulse" />
        <span className="text-sm text-muted-foreground">Signing you in…</span>
      </div>
    </div>
  );
}
