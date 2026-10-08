import type { ReactNode } from "react";

export function AdminLayout({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="admin-layout">
      <header className="admin-layout-heading">
        <div>
          <div className="section-label">Management</div>
          <h2>{title}</h2>
        </div>
        {actions}
      </header>
      <div className="admin-layout-content">{children}</div>
    </section>
  );
}
