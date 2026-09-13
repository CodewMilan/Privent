import type { ReactNode } from "react";
import { SiteNav } from "../site-nav";
import { SiteFooter } from "../site-footer";
import "../landing.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="desk-shell">
      <SiteNav current="dashboard" />
      {children}
      <SiteFooter />
    </div>
  );
}
