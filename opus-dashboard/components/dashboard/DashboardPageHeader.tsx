import type { ReactNode } from "react";
export function DashboardPageHeader({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <header className="dashboard-page-header">
      <div>
        {eyebrow && <p className="dashboard-page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && (
          <p className="dashboard-page-description">{description}</p>
        )}
      </div>
      {children && <div className="dashboard-page-actions">{children}</div>}
    </header>
  );
}
