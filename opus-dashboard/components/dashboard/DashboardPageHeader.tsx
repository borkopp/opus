import type { ReactNode } from "react";
export function DashboardPageHeader({
  title,
  description,
  children,
  replayPublicTitle = false,
  replayPublicDescription = false,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  replayPublicTitle?: boolean;
  replayPublicDescription?: boolean;
}) {
  return (
    <header className="dashboard-page-header">
      <div>
        <h1 data-replay-public={replayPublicTitle || undefined}>{title}</h1>
        {description && (
          <p
            data-replay-public={replayPublicDescription || undefined}
            className="dashboard-page-description"
          >
            {description}
          </p>
        )}
      </div>
      {children && <div className="dashboard-page-actions">{children}</div>}
    </header>
  );
}
