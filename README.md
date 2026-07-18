# MIAV-922228

[MIAV-922228](https://miav-922228.com) 公式サイトのリポジトリです。

文学SFプロジェクト **MIAV-922228** の公開用 Web サイトで、作品アーカイブ・書籍情報・著者プロフィール・お問い合わせを提供します。

AI・記憶・感情・人間存在をテーマにした speculative fiction の公式アーカイブとして設計されています。

## MIAV-922228とは

MIAV-922228 は、Takashi Yabe による文学SFプロジェクトです。

技術と人間のあいだで起きる静かな変化を、物語として記録します。公式サイトでは章の閲覧、書籍への案内、著者情報、連絡フォームを扱います。

- サイト: https://miav-922228.com  
- 著者: Takashi Yabe  

## 技術構成（Next.js）

| 項目 | 内容 |
|------|------|
| Framework | Next.js（App Router） |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Content | Markdown（`content/chapters/`） |
| SEO | `app/sitemap.ts` / `app/robots.ts` |

主なルート:

- `/` — トップ
- `/chapters` — 章アーカイブ
- `/chapters/[slug]` — 各章
- `/books` — 書籍
- `/author` — 著者
- `/contact` — お問い合わせ
- `/admin/contacts` — 管理者向け問い合わせ一覧（非公開）

章本文は `content/chapters/{locale}/*.md` で管理しています（frontmatter + Markdown）。

## Firebase の利用

| 用途 | サービス |
|------|----------|
| お問い合わせ保存 | Cloud Firestore（`contact_messages`） |
| 管理者ログイン | Firebase Authentication |
| サーバー書き込み・管理API | Firebase Admin SDK |

公開フォームの送信は **Next.js API Route（`/api/contact`）→ Admin SDK** 経由です。クライアントから Firestore へ直接書き込みません。

管理者画面は Firebase Auth のトークン検証と管理者 UID チェックを行い、API（`/api/admin/contacts`）経由で一覧・既読更新をします。

Firestore のクライアント向けセキュリティルールは、直接アクセスを拒否する構成です（詳細は `firestore.rules`）。

## 開発方法

### 必要条件

- Node.js（LTS 推奨）
- npm

### セットアップ

```bash
npm install
cp .env.example .env.local
```

`.env.local` に必要な値を設定したうえで:

```bash
npm run dev
```

http://localhost:3000 を開きます。

### その他のコマンド

```bash
npm run build   # 本番ビルド
npm run start   # ビルド後の起動
npm run lint    # ESLint
```

## 環境変数

テンプレートは `.env.example` です。実際の値は **`.env.local`（ローカル）** またはホスティングの Environment Variables（本番）に設定してください。リポジトリに秘密情報をコミットしないでください。

| 変数名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_SITE_URL` | 正規サイトURL（sitemap / robots） |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase クライアント |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase クライアント |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase クライアント |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase クライアント |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase クライアント |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase クライアント |
| `NEXT_PUBLIC_ADMIN_UID` | 管理者 UID（クライアント側の早期判定） |
| `ADMIN_UID` | 管理者 UID（API 側の認可） |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Admin SDK 用サービスアカウント JSON（文字列） |

`NEXT_PUBLIC_*` はブラウザに露出します。サービスアカウント JSON と実 UID の取り扱いには注意してください。

## ライセンス・著作権

本文・プロジェクト名を含む創作内容の権利は著者に帰属します。
