import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg font-sans text-ink" style={{ colorScheme: "dark" }}>
      {children}
    </div>
  );
}
