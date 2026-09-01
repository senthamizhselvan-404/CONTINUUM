import React from "react";

/**
 * CONTINUUM brand mark — a continuous line threading through connected
 * semester nodes. Represents "one student, multiple semesters, one profile".
 */
export function LogoMark({ size = 28, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}
      role="img" aria-label="CONTINUUM logo">
      <path d="M3 21 Q9 7 15 15 T29 10" stroke="hsl(var(--primary))" strokeWidth="2.4"
        fill="none" strokeLinecap="round" />
      <circle cx="3" cy="21" r="2.6" fill="hsl(var(--primary))" />
      <circle cx="10" cy="12.5" r="2.2" fill="hsl(var(--chart-2))" />
      <circle cx="15" cy="15" r="2.2" fill="hsl(var(--chart-2))" />
      <circle cx="22" cy="12.6" r="2.2" fill="hsl(var(--chart-2))" />
      <circle cx="29" cy="10" r="2.6" fill="hsl(var(--primary))" />
    </svg>
  );
}

export function Logo({ collapsed = false }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <LogoMark size={28} />
      {!collapsed && (
        <span className="font-bold tracking-tight text-[17px] text-foreground">
          CONTINUUM
        </span>
      )}
    </div>
  );
}
