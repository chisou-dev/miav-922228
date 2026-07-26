"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/features/core/AppSidebar";

export const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";

type Props = {
  children: ReactNode;
};

function isDesktopViewport() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

/**
 * Site chrome: shared sidebar + main content that expands when collapsed.
 * Persists `sidebarCollapsed` in localStorage (desktop rail). Mobile drawer starts closed.
 */
export function AppLayout({ children }: Props) {
  const pathname = usePathname() || "/";
  const isAdmin = pathname.startsWith("/admin");

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
      setCollapsed(stored);
      document.documentElement.dataset.sidebarCollapsed = stored
        ? "true"
        : "false";
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function persistCollapsed(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "true" : "false");
    } catch {
      // ignore
    }
    document.documentElement.dataset.sidebarCollapsed = next ? "true" : "false";
  }

  function toggle() {
    if (isDesktopViewport()) {
      persistCollapsed(!collapsed);
      return;
    }
    setMobileOpen((open) => !open);
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div
      className="app-layout"
      data-collapsed={collapsed ? "true" : "false"}
      data-mobile-open={mobileOpen ? "true" : "false"}
      data-ready={ready ? "true" : "false"}
    >
      <button
        type="button"
        className="app-sidebar-mobile-trigger"
        onClick={toggle}
        aria-label="Open sidebar"
      >
        <span aria-hidden="true">☰</span>
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <AppSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={toggle}
        onNavigate={() => setMobileOpen(false)}
      />

      <div className="app-main">{children}</div>
    </div>
  );
}
