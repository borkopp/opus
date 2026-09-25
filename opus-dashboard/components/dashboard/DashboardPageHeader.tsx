import type { ReactNode } from "react";
export function DashboardPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="dashboard-page-header">
      <div>
        <h1>{title}</h1>
        {description && (
          <p className="dashboard-page-description">{description}</p>
        )}
      </div>
      {children && <div className="dashboard-page-actions">{children}</div>}
    </header>
  );
}
