"use client";

import { usePathname } from "next/navigation";
import { ReaderMemory } from "@/features/core/ReaderMemory";
import { gamesLibraryUrl } from "@/features/core/gamesUrl";
import { useT, type MessageKey } from "@/features/shared/i18n";

const NAV = [
  { href: "/", labelKey: "nav.home", match: (path: string) => path === "/" },
  {
    href: "/world-map",
    labelKey: "nav.world",
    match: (path: string) => path === "/world-map" || path.startsWith("/world-map/"),
  },
  {
    href: "/works",
    labelKey: "nav.works",
    match: (path: string) =>
      path === "/works" ||
      path.startsWith("/literary-sf") ||
      path.startsWith("/entertainment-sf") ||
      path.startsWith("/flash-fiction") ||
      path.startsWith("/stories/") ||
      path.startsWith("/flash/"),
  },
] as const satisfies readonly {
  href: string;
  labelKey: MessageKey;
  match: (path: string) => boolean;
}[];

/** Homepage APPS block — same anchor as HomePage `#apps`. */
const APPS_HREF = "/#apps";

type Props = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
};

/**
 * Site-wide navigation — Home / World Memory / Works / Game / Apps.
 * Game opens the external miav-games project. Apps scrolls to homepage APPS.
 * Language switcher lives in SiteShell only (not duplicated here).
 */
export function AppSidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onNavigate,
}: Props) {
  const pathname = usePathname() || "/";
  const gameHref = gamesLibraryUrl();
  const t = useT();

  return (
    <aside
      className="app-sidebar"
      data-collapsed={collapsed ? "true" : "false"}
      data-mobile-open={mobileOpen ? "true" : "false"}
      aria-label={t("nav.siteAria")}
    >
      <div className="app-sidebar-inner">
        <div className="app-sidebar-brand">
          <button
            type="button"
            className="app-sidebar-toggle"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar-nav"
            aria-label={collapsed ? t("shell.openSidebar") : t("shell.collapseSidebar")}
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

        <nav id="app-sidebar-nav" className="app-sidebar-nav" aria-label={t("nav.primaryAria")}>
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
                    {t(item.labelKey)}
                  </a>
                </li>
              );
            })}
            <li>
              <a
                href={gameHref}
                className="app-sidebar-link"
                onClick={onNavigate}
              >
                {t("nav.game")}
              </a>
            </li>
            <li>
              <a
                href={APPS_HREF}
                className="app-sidebar-link"
                onClick={onNavigate}
              >
                {t("nav.apps")}
              </a>
            </li>
          </ul>
        </nav>

        {pathname === "/" || pathname === "/chapters" ? null : (
          <div className="app-sidebar-memory">
            <ReaderMemory workId="miav-922228" />
          </div>
        )}
      </div>
    </aside>
  );
}
