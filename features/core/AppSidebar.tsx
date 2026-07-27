"use client";

import { usePathname } from "next/navigation";
import { ReaderMemory } from "@/features/core/ReaderMemory";

const NAV = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  {
    href: "/world-map",
    label: "World Memory",
    match: (path: string) => path === "/world-map" || path.startsWith("/world-map/"),
  },
  {
    href: "/works",
    label: "Works",
    match: (path: string) =>
      path === "/works" ||
      path.startsWith("/literary-sf") ||
      path.startsWith("/entertainment-sf") ||
      path.startsWith("/flash-fiction") ||
      path.startsWith("/stories/") ||
      path.startsWith("/flash/"),
  },
] as const;

type Props = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
};

/**
 * Site-wide navigation — Home / World Memory / Works only.
 * Reader Memory sits quietly below the nav (hidden when the rail is collapsed).
 */
export function AppSidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onNavigate,
}: Props) {
  const pathname = usePathname() || "/";

  return (
    <aside
      className="app-sidebar"
      data-collapsed={collapsed ? "true" : "false"}
      data-mobile-open={mobileOpen ? "true" : "false"}
      aria-label="Site"
    >
      <div className="app-sidebar-inner">
        <div className="app-sidebar-brand">
          <button
            type="button"
            className="app-sidebar-toggle"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar-nav"
            aria-label={collapsed ? "Open sidebar" : "Collapse sidebar"}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <a
            href="/"
            className="app-sidebar-title"
            onClick={onNavigate}
          >
            MIAV-922228
          </a>
        </div>

        <nav id="app-sidebar-nav" className="app-sidebar-nav" aria-label="Primary">
          <ul>
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={
                      active
                        ? "app-sidebar-link is-active"
                        : "app-sidebar-link"
                    }
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="app-sidebar-memory">
          <ReaderMemory workId="miav-922228" />
        </div>
      </div>
    </aside>
  );
}
