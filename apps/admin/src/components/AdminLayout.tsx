import type { ReactNode } from "react";
import { GlassCard } from "@hungernet/ui";

export function AdminLayout({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <GlassCard style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div>
          <div className="section-label">Management</div>
          <h2 style={{ marginTop: "0.25rem" }}>{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </GlassCard>
  );
}
