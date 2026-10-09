import type { ReactNode } from "react";

export function SettingsLayout({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="settings-layout">
      <header className="settings-layout-heading">
        <div>
          <div className="section-label">Settings</div>
          <h2>{title}</h2>
        </div>
        {actions}
      </header>
      <div className="settings-layout-content">{children}</div>
    </section>
  );
}
