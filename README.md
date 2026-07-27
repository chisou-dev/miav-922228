# miav-games

MIAV-922228 のゲーム専用リポジトリです。小説サイト（`miav-site` / `miav-922228`）とは完全に独立しています。

## 方針

- **miav-site** — 小説・World Memory・Works・About のみ
- **miav-games** — ゲームのみ（本リポジトリ）
- ゲームは `games/` 配下で 1 本ずつ独立開発し、完成したものだけ `lib/catalog.ts` と `games/registry.ts` に追加

## 技術

Next.js · React · TypeScript · Tailwind CSS（最小構成）

## ディレクトリ

| パス | 役割 |
|------|------|
| `app/` | ルーティング（`/game`, `/game/[slug]`） |
| `components/` | サイト共通 UI |
| `engine/` | 全ゲーム共有のエンジン層 |
| `games/` | 各ゲーム（他ゲームを import しない） |
| `hooks/` | React フック |
| `lib/` | カタログ・設定 |
| `styles/` | グローバル CSS |
| `types/` | 共有型 |

## 開発

```bash
npm install
npm run dev
```

デフォルト: http://localhost:3001

## 新しいゲームを追加する手順

1. `games/<slug>/` を作成（`Game.tsx`, `config.ts`, `types.ts`, `assets/`）
2. `games/registry.ts` に lazy loader を 1 行追加
3. `lib/catalog.ts` の `GAME_LIBRARY` にエントリを追加

ゲーム本体のコードは他ゲームや miav-site にコピーしません。

## サイトとの連携

miav-site の Game ボタンは `NEXT_PUBLIC_GAMES_BASE_URL`（例: `http://localhost:3001` / `https://games.miav-922228.com`）の `/game` へリンクするだけです。
