# MIAV-922228 — Firebase App Hosting 段階移行・試験手順

作成日：2026-10-27。**本番の Vercel / DNS / master は変更しない。**
あおいくん家族カレンダーの Firebase プロジェクトを流用しない。新しい独立プロジェクトのみ使う。

## 検証ブランチ
`feature/firebase-apphosting-staging-20261027`

Next.js 16.2.10 の MIAV は App Hosting の現行アクティブサポート版より新しく、まず試験ビルドが必要。
`next.config.ts` と既存のビルドスクリプト `npm run build` は変更しない。
`apphosting.yaml` はこのブランチ専用の低リソース設定（minInstances: 0, maxInstances: 2）。
**同時実行数と台数の制限は通信費の上限ではない。**

## Google / Firebase コンソールで必要な操作

1. Firebase console > 新規プロジェクト作成。MIAV専用で、あおいくんのプロジェクトとは別にする。Google Analytics はテストで必須ではない。
2. Blaze（従量課金）を有効化（App Hosting に必須）。支払情報の設定は必ず本人が行う。
3. 「Hosting とサーバーレス > App Hosting > バックエンドを作成」から GitHub の `chisou-dev/miav-922228` を接続。
4. **配信対象ブランチに `feature/firebase-apphosting-staging-20261027` を選ぶ。** `master` は選ばない。ルートディレクトリは `/`。
5. 地域を選ぶ（日本の読者中心なら東京近辺が候補。地域ごとの提供可否と料金は管理画面で確認）。
6. 環境変数・Secret Manager の設定を確認。Vercel にのみ登録している環境変数は自動移転しない。機密値をGitHubに書き込まない。
7. ドメインは Firebase が発行するテストURLのまま使用。**miav-922228.com のDNSは変更しない。**
8. 最初のロールアウトの Build logs/Cloud Run logs を確認。Next.js 16 のアダプタの互換性が最優先の検証項目。

## 費用を守る

- Firebase console > 使用量と請求 > Service-level spend caps で **App Hosting の月額上限予算**を設定（初期試験は小額・例 $5 など、本人の許容額に合わせて設定）。
- Cloud Billing の予算アラートも設定。
- サービス別 spend cap は**絶対的なハード上限ではない**。レポート遅延の数分間は超過請求の可能性がある。
- 他サービス（Cloud Functions, Firestore, Cloud Storage など）の支出を独立に確認し、必要に応じて別途 cap/アラート設定する。
- `maxInstances: 2` は Cloud Run のコスト・負荷抑制のためで、**CDN転送費・HTTPリクエスト費を停止するものではない。**

公式資料：
- https://firebase.google.com/docs/app-hosting/get-started
- https://firebase.google.com/docs/app-hosting/configure
- https://firebase.google.com/docs/app-hosting/frameworks-tooling
- https://firebase.google.com/docs/app-hosting/costs
- https://firebase.google.com/docs/projects/billing/spend-caps

## テスト前の確認

- ホームページの小説導線・英語学習版・言語切替・各ページを確認。
- 銀河の初期球・190回前後のタップ・星・惑星・最後の3分間・終了時のホーム帰還を確認。
- Binary Block、大気圏ゲーム、それぞれの保存・操作を確認。
- お問い合わせ・認証・DB/外部API等のサーバー処理が Vercel 固有機能や別プロジェクトに依存しないか確認。
- 外部 NASA 画像を直接取得する分は Firebase の送信量に通常は含まれないが、閲覧者の実通信量には含まれる。
- **全ての機能の移行先が準備できるまで、本番ドメインは切り替えない。**

## 1プレイの転送量実測

PC Chrome の開発者ツール > Network > Disable cache + Preserve log を有効化し、
テストURLを再読み込みしてから銀河旅行を最後まで1回行う。
Network の最後の `Transferred` 合計を記録し、`firebaseapp.com` 等の
App Hosting 由来と、外部 NASA ドメイン由来を別集計する。
同じ手順で通常ページ閲覧とゲームプレイの合計も記録する。
少なくとも「初回キャッシュなし」「再訪キャッシュあり」「モバイル」の3パターンを計測。
※実測では CDN 応答・SSG/SSR・API/DB/リクエスト数も別項目として確認する。

確認できた 1人あたり Firebase 配信 MB 数をもとに、1万人/10万人/100万人でコスト試算する。
**画像が190回再描画されても、190回ダウンロードするわけではない。**

## 正式移行判定

- テスト版が本番と同じ動作をすること
- Next.js 16 で安定してビルドできること
- 実測の転送量、Cloud Runと他の課金費用を確認できること
- 予算アラートとサービス別 spend cap の実際の挙動を確認できること
- DNS切り替え前のロールバック手順を用意すること

これらを満たすまではVercelの本番を残す。
