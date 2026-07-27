import { GAME_LIBRARY } from "@/lib/catalog";

export function GameLibrary() {
  return (
    <div className="shell">
      <header className="shell-header shell-header--center">
        <p className="shell-brand">
          <a href="https://www.miav-922228.com/">MIAV-922228</a>
        </p>
        <h1 className="shell-title shell-title--library">Game Library</h1>
      </header>

      <main className="shell-main">
        <ul className="library-list">
          {GAME_LIBRARY.map((item) => (
            <li key={item.title} className="library-item">
              {item.status === "available" ? (
                <a href={`/game/${item.slug}`} className="library-link">
                  {item.title}
                </a>
              ) : (
                <span className="library-link library-link--muted">
                  {item.title}
                </span>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
