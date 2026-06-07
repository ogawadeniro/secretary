# secretary — スケジュール管理・リマインダーアプリ

Spring Boot 3.4.3 (REST API) + React (Vite + TypeScript) + PostgreSQL。
Vaadin から React に移行済み。

## ビルド & 実行

```bash
# フルビルド（React → Spring Boot JAR）
bash build.sh

# 開発サーバー起動（Spring Boot + Vite を同時起動）
bash dev.sh

# 個別起動
SPRING_PROFILES_ACTIVE=develop java -jar target/secretary-0.0.1-SNAPSHOT.jar  # API:8080
cd frontend && npm run dev                                                     # UI:5173
```

プロファイルは環境変数 `SPRING_PROFILES_ACTIVE` で選択:

- 開発: `export SPRING_PROFILES_ACTIVE=develop`
- 本番: Dockerコンテナ起動時は `deploy.sh` が自動設定
- テスト: JUnit実行時は自動検出

## アーキテクチャ

### バックエンド（クリーンアーキテクチャ）

```
domain/ → application/ → infrastructure/ ← frontend/ (React)
```

依存関係は外側→内側。内側（domain）はどのフレームワークにも依存しない。

| レイヤー | 役割 | キーファイル |
|----------|------|-------------|
| `domain/` | エンティティ、リポジトリポート | `Schedule`, `ScheduleRepository`, `CalendarShare`, `CalendarShareRepository` |
| `application/` | ユースケース（アプリケーションサービス） | `ScheduleUseCase`, `ScheduleService` |
| `infrastructure/` | JPA永続化、RESTエンドポイント | `JpaSchedule`, `SchedulePersistenceAdapter`, `ScheduleController`, `ScheduleDto`, `CalendarShareController` |

### フロントエンド（React + Vite + TypeScript）

```
frontend/src/
├── main.tsx                     # エントリーポイント
├── App.tsx                      # ルートコンポーネント
├── index.css                    # ダークテーマCSS
├── types/schedule.ts            # Schedule型定義
├── types/share.ts               # CalendarShare型定義
├── api/scheduleApi.ts           # 予定REST APIクライアント
├── api/shareApi.ts              # 共有設定REST APIクライアント
├── api/userApi.ts               # ユーザー検索APIクライアント
├── utils/dateUtils.ts           # 日付ユーティリティ
├── utils/colorUtils.ts          # 色ユーティリティ（ownerColor, textColorFromBg）
├── context/AuthContext.tsx       # 認証コンテキスト
└── components/
    ├── InfiniteCalendar.tsx     # 無限スクロールカレンダー（IntersectionObserver）
    ├── WeekRow.tsx              # 週単位の行
    ├── DayCell.tsx              # 日付セル
    ├── ScheduleDialog.tsx       # 予定CRUDダイアログ
    ├── SettingsDialog.tsx       # 設定ダイアログ
    ├── ShareDialog.tsx          # カレンダー共有管理ダイアログ
    └── LoginPage.tsx            # ログインページ
```

### 主要エントリーポイント

| 役割 | ファイル |
|------|----------|
| アプリ起動 | `Application.java` |
| REST API | `infrastructure/rest/ScheduleController.java` |
| JPAエンティティ | `infrastructure/persistence/JpaSchedule.java`（テーブル: `schedules`） |
| ドメインモデル | `domain/model/Schedule.java` |
| アプリケーションサービス | `application/service/ScheduleService.java` |

## 機能要件

### カレンダー表示
- **無限スクロール**: IntersectionObserver で上下のセンチネル要素を監視。端に達したら12週ずつ追加。初期表示は104週（約2年分）で今日を中央に配置。
- **週7日表示**: 日〜土の7列固定。各行は1週間。
- **アクティブ月**: ヘッダーに年/月を表示。画面中央付近に写っている日付の月を自動判定。
- **日付ハイライト**: アクティブ月の日付テキストは明るく、他の月は薄く表示。今日の日付セルは背景色で強調。
- **固定サイズ**: 全日付セルは同一サイズ（高さ110px固定）。予定の数に関わらずレイアウトが崩れない。

### 予定表示
- **チップ表示**: 各日付セルに予定タイトルが色付きチップで表示。5件超は残り件数を `+N` で表示。
- **チップ高さ**: 1.3em。`display: flex; align-items: center` で垂直中央配置。
- **オーナー色分け**: 自分の予定は設定の `chipBgColor`、共有ユーザーの予定は決定論的10色パレットから割り当てた色で表示。
  - 色割り当て関数: `ownerColor(username)` in `colorUtils.ts`（文字コードハッシュ → 10色）
- **複数日またぎ接続表示**:
  - `getSchedulePosition()` で single / start / middle / end を判定。
  - 開始日は右マージン0、中間日は左右マージン0・border-radius 0、終了日は左マージン0。隣接セル間で背景色がシームレスに連続。
  - `buildGlobalMultiDayInfo()` で全複数日またぎ予定を開始日順にソートし、アクティブ期間（最小開始〜最大終了日）を計算。
  - アクティブ期間内: `computeDaySlots()` が固定スロット＋プレースホルダー（不可視）で行位置を保持。
  - アクティブ期間外: 単純にその日の複数日またぎ予定から順に詰めて表示。
  - プレースホルダーは予定が「開始済み」かつ「今週以降に終了」の場合のみ表示。未開始や過去終了はスキップ。
- **週境界でのタイトル再表示**: 日曜日（週の初め）に前週から継続中の予定もタイトルを表示。
- **オーナー色分け**: 作成者ごとに異なる色でチップを表示（10色パレットから決定論的割り当て）。
- **即時反映**: 保存後すぐにカレンダー画面に戻り更新を反映。
- **日付比較**: `toEpochDay()` で時刻を正規化した日付比較。

### ダイアログ（CRUD）
- **ボトムシート形式**: 画面下部からスライドアップ（200msアニメーション）。
- **作成**: 「＋ 予定を追加」ボタンでフォーム表示。タイトル・作成者・終日・開始日時・終了日時・説明・共有設定。
- **編集**: 鉛筆アイコンボタンで既存値をプリセット。PATCH部分更新対応。
- **削除**: ゴミ箱アイコン→確認ダイアログ→削除実行の二段階操作。
- **日時自動補正**: `adjustEndByStart()` / `adjustStartByEnd()` で終了≦開始を防止。`adjustingRef` で相互発火防止。
- **終日予定**: チェックボックスONで時刻非表示、保存時 `00:00`。
- **共有設定**: 終日チェックボックスの横に「他のユーザーと共有する」チェックボックスを配置。デフォルトON。
- **エラー・保存中状態**: エラーバナー表示、保存ボタンは `saving` で無効化。

### PWA
- **Manifest**: `display: standalone`、`background_color: #1a1a2e`、`theme_color: #16213e`。
- **iOS対応**: `apple-mobile-web-app-capable`、`apple-touch-icon`、ステータスバー透過。
- **絵文字favicon**: 📅 をSVG data URIで設定。

### REST API
- 予定のCRUD（GET一覧/個別、POST作成、PATCH更新、DELETE削除）
- カレンダー共有管理（GET一覧/incoming、POST作成、DELETE削除）
- ユーザー検索（GET search）
- 日付形式: `yyyy/MM/dd-HH:mm`（Jackson @JsonFormat）
- `updateTime` はサーバー側で自動設定
- `shared`（公開設定）フィールド対応。自分以外のユーザーの予定は `shared=true` のみ取得

## 無限スクロールカレンダー

`InfiniteCalendar.tsx` がコアコンポーネント。以下のサブコンポーネント・ユーティリティと連携:

- **InfiniteCalendar.tsx**: IntersectionObserver で上下のセンチネル要素を監視。端に達したら週を追加（12週ずつ）。初期表示は104週（約2年分）で今日を中央に配置。アクティブ月は画面中央付近に写っている日付の月にする。
- **WeekRow.tsx**: 週単位の行。`useMemo` で `buildGlobalMultiDayInfo()` → `computeDaySlots()` の結果をキャッシュ。各日付のスロット配列を計算し DayCell に渡す。
- **DayCell.tsx**: 日付セル。チップ（`schedule-chip`）・プレースホルダー（`.schedule-placeholder`）・+N オーバーフロー表示を行う。
- **dateUtils.ts**: スロット計算全般。`getSchedulePosition()`（single/start/middle/end判定）、`buildGlobalMultiDayInfo()`（複数日またぎ予定をソートしアクティブ期間を計算）、`computeDaySlots()`（各日のスロット配列生成）、`shouldShowTitle()`（タイトル表示判定）等。

その他挙動:
- アクティブ月に含まれる日付テキストはアクティブ月に含まれない日付テキストより明るい色で表示する
- 予定の日付比較は `toEpochDay()` で時刻を正規化
- 予定を保存したらすぐにカレンダー画面に戻る

## プロファイル戦略

| プロファイル | 設定ファイル | 使いどころ |
|------------|-------------|-----------|
| `develop` | `application-develop.properties` | ローカル開発（IDEやCLIで起動） |
| `product` | `application-product.properties` | 本番Dockerコンテナ（`deploy.sh` が設定） |
| `test` | テストリソース内に内蔵 | JUnit自動検出 |

`application.properties` にはデフォルトプロファイルの指定がない。
必ず `SPRING_PROFILES_ACTIVE` で明示的に指定すること。

## 開発の注意点

- **Java 21必須**。Node.js 18+。
- 日付フォーマットは `yyyy/MM/dd-HH:mm`（Jacksonの `@JsonFormat`）。REST DTOの `ScheduleDto` に適用。
- `updateTime` はサーバー側（`ScheduleService`）で自動設定。フロントエンドから送信不要。
- Lombok（`@Data`）使用。IDEで注釈処理を有効にすること。
- テストは JUnit 5 + Mockito + H2。`mvn test` で実行。
- CI/CDは GitHub Actions（`.github/workflows/ci.yml`）。mainブランチにpushで自動テスト→Dockerイメージを `ghcr.io/ogawadeniro/secretary:latest` にpush。
- Dockerデプロイは `Dockerfile` + `deploy.sh` を参照。Rocky Linux 9.4 で動作確認。

## プロジェクトスクリプト

| スクリプト | 用途 |
|-----------|------|
| `build.sh` | Reactビルド → Spring Bootのstaticにコピー → JARパッケージ |
| `dev.sh` | Spring Boot + Vite を同時起動（Ctrl+Cで終了） |
| `deploy.sh` | リモートサーバーにデプロイ（JARビルド → scp → Dockerビルド → 起動） |
| `setup-server.sh` | 初回サーバーセットアップ（Docker/DB/キーストア） |
| `setup-letsencrypt.sh` | Let's Encrypt 証明書の初回取得・更新（acme.sh使用） |

### デプロイ

```bash
bash deploy.sh    # パスワードを対話式で入力（または環境変数で事前設定）
```

または環境変数で事前設定:

```bash
export SECRETARY_DB_PASSWORD=your-password
bash deploy.sh
```

### ブランチ戦略

```
feature/xxx → merge → dev → (デプロイ時) → merge → main
fix/xxx     → merge → dev → (デプロイ時) → merge → main
```

- `main`: 本番リリース版。デプロイ時にのみ更新
- `dev`: 開発統合ブランチ。feature/fix はここにマージ
- `feature/xxx`, `fix/xxx`: 1機能・1修正 = 1ブランチ

## APIテスト

```bash
curl -X GET http://localhost:8080/api/v1/schedules
curl -X POST http://localhost:8080/api/v1/schedules \
  -H "Content-Type:application/json" \
  -d '{"title":"test","isAllDay":false,"startDatetime":"2026/06/05-12:30","endDatetime":"2026/06/05-13:30","owner":"rogawa","description":"test schedule"}'
curl -X PATCH http://localhost:8080/api/v1/schedules/1 \
  -H "Content-Type:application/json" \
  -d '{"title":"test2"}'
curl -X DELETE http://localhost:8080/api/v1/schedules/2

### カレンダー共有API

```bash
# 共有設定一覧（自分が共有している相手）
curl -X GET http://localhost:8080/api/v1/shares
# 共有設定一覧（自分が共有されている相手）
curl -X GET http://localhost:8080/api/v1/shares/incoming
# 共有設定を作成
curl -X POST http://localhost:8080/api/v1/shares \
  -H "Content-Type: application/json" \
  -d '{"sharedWithUsername":"user2"}'
# 共有設定を削除
curl -X DELETE http://localhost:8080/api/v1/shares/1
# ユーザー検索
curl -X GET "http://localhost:8080/api/v1/users/search?q=user"
```
```

## 将来のアイデア

### 公開コード方式のカレンダー共有（検討中）

現在の共有方法はユーザー名直接入力方式だが、セキュリティ向上のため
各ユーザーが発行する公開コード（share_code）を入力して共有する方式も検討中。

- コードはランダムな英数字（例: `X7K9M2`）
- 設定画面でコード表示 + 再生成可能
- コードを知っている人だけが共有リクエスト可能
- 実装には `user_settings` テーブルに `share_code` カラム追加が必要

## DBセットアップ

```sql
psql -U postgres -d postgres
create role rogawa with login createdb;
\q
psql -U rogawa -d postgres
create database secretary;
\q
psql -U rogawa -d secretary;
    create table schedules (
        id serial primary key,
        title text not null,
        is_all_day boolean not null,
        start_datetime timestamptz not null,
        end_datetime timestamptz not null,
        owner text not null,
        description text,
        update_time timestamptz not null
);
```

### カレンダー共有機能のマイグレーション（v2）

```sql
-- schedules テーブルに shared カラム追加（デフォルト true）
alter table schedules add column shared boolean not null default true;

-- カレンダー共有設定テーブル
create table calendar_shares (
    id bigserial primary key,
    owner_username text not null,
    shared_with_username text not null,
    permission text not null default 'READ',
    created_at timestamptz not null default now(),
    unique(owner_username, shared_with_username)
);
```
