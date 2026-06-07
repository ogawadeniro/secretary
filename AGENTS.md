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
| `domain/` | エンティティ、リポジトリポート | `Schedule`, `ScheduleRepository`, `CalendarShare`, `CalendarShareRepository`, `User`, `UserSetting` |
| `application/` | ユースケース（アプリケーションサービス） | `ScheduleUseCase`, `ScheduleService` |
| `infrastructure/` | JPA永続化、RESTエンドポイント | `JpaSchedule`, `SchedulePersistenceAdapter`, `ScheduleController`, `ScheduleDto`, `CalendarShareController` |

### フロントエンド（React + Vite + TypeScript）

```
frontend/src/
├── main.tsx                     # エントリーポイント
├── App.tsx                      # ルートコンポーネント
├── index.css                    # ダークテーマCSS
├── types/
│   ├── schedule.ts              # Schedule / ScheduleMember 型定義
│   ├── share.ts                 # CalendarShare 型定義
│   └── settings.ts              # UserSettings 型定義
├── api/
│   ├── authApi.ts               # 認証API（login / register / logout / me）
│   ├── scheduleApi.ts           # 予定CRUD API
│   ├── shareApi.ts              # カレンダー共有API
│   ├── memberApi.ts             # 予定メンバーAPI
│   ├── settingsApi.ts           # ユーザー設定API
│   └── userApi.ts               # ユーザー検索API
├── utils/
│   ├── dateUtils.ts             # 日付ユーティリティ（スロット計算・複数日またぎ・アクティブ期間）
│   └── colorUtils.ts            # 色ユーティリティ（減法混色・パレット・hex変換）
├── context/AuthContext.tsx       # 認証コンテキスト
└── components/
    ├── InfiniteCalendar.tsx     # 無限スクロールカレンダー（IntersectionObserver）
    ├── WeekRow.tsx              # 週単位の行（useMemoでスロットキャッシュ）
    ├── DayCell.tsx              # 日付セル（チップ・プレースホルダー・+N）
    ├── ScheduleDialog.tsx       # 予定CRUD + メンバー管理ダイアログ
    ├── SettingsDialog.tsx       # 設定ダイアログ（色・初回曜日・表示名）
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

## アクセス権限

### 閲覧可能
- 自分が作成した予定である
- 自分に共有されている予定である（`shared=true` かつカレンダー共有済み）

### 編集・削除可能
- 自分が作成した予定である
- または以下の3条件を全て満たす:
  1. 予定のメンバーに自分が含まれている
  2. 予定に含まれるメンバー全員に予定を共有している
  3. 予定に含まれるメンバー全員から予定を共有されている

`ScheduleService.canEditSchedule()` で判定。自分自身は共有チェック対象から除外。
フロントエンドは API 応答の `canEdit` フィールドでボタン表示を制御。

## 機能要件

### カレンダー表示
- **無限スクロール**: IntersectionObserver で上下のセンチネル要素を監視。端に達したら12週ずつ追加。初期表示は104週（約2年分）で今日を中央に配置。
- **週7日表示**: 日〜土の7列固定。各行は1週間。
- **アクティブ月**: ヘッダーに年/月を表示。画面中央付近に写っている日付の月を自動判定。
- **日付ハイライト**: アクティブ月の日付テキストは明るく、他の月は薄く表示。今日の日付セルは背景色で強調。
- **固定サイズ**: 全日付セルは同一サイズ（高さ110px固定）。

### 予定表示
- **チップ表示**: 各日付セルに予定タイトルが色付きチップで表示。5件超は残り件数を `+N` で表示。
- **チップ高さ**: 1.3em。`display: flex; align-items: center` で垂直中央配置。
- **チップ色**:
  - 個人（メンバー＝自分だけ）: 設定の `chipBgColor` を使用
  - 複数メンバー: 各メンバーの `chipBgColor` を減法混色（RGB幾何平均）で合成
  - 共有ユーザーの個人予定: オーナーの `chipBgColor` を使用
  - フォールバック: `ownerColor(username)`（決定論的10色パレット）
  - 文字色: 常に `#e0e0e0`（白色固定）
- **複数日またぎ接続表示**:
  - `getSchedulePosition()` で single / start / middle / end を判定。
  - 開始日は右マージン0、中間日は左右マージン0・border-radius 0、終了日は左マージン0。隣接セル間で背景色がシームレスに連続。
  - `buildGlobalMultiDayInfo()` で全複数日またぎ予定を開始日順にソートし、アクティブ期間（最小開始〜最大終了日）を計算。
  - アクティブ期間内: `computeDaySlots()` が固定スロット＋プレースホルダー（不可視）で行位置を保持。
  - アクティブ期間外: 単純にその日の複数日またぎ予定から順に詰めて表示。
  - プレースホルダーは予定が「開始済み」かつ「今週以降に終了」の場合のみ表示。未開始や過去終了はスキップ。
- **週境界でのタイトル再表示**: 日曜日（週の初め）に前週から継続中の予定もタイトルを表示。
- **即時反映**: 保存後すぐにカレンダー画面に戻り更新を反映。
- **日付比較**: `toEpochDay()` で時刻を正規化した日付比較。
- **共有アイコン**: 複数メンバーがいる予定のチップに `Users` アイコンを表示。

### ダイアログ（CRUD）
- **ボトムシート形式**: 画面下部からスライドアップ（200msアニメーション）。
- **作成**: 「＋ 予定を追加」ボタンでフォーム表示。
- **編集**: 鉛筆アイコンボタンで既存値をプリセット。PATCH部分更新対応。
- **削除**: ゴミ箱アイコン→確認ダイアログ→削除実行の二段階操作。
- **日時自動補正**: `adjustEndByStart()` / `adjustStartByEnd()` で終了≦開始を防止。`adjustingRef` で相互発火防止。
- **終日予定**: チェックボックスONで時刻非表示、保存時 `00:00`。
- **共有設定**: 「他のユーザーと共有する」チェックボックス。デフォルトON。
- **メンバー管理**: 相互共有ユーザーを補完候補として表示。表示名・ユーザー名でフィルタ可能。バッジは表示名を表示し、各メンバーの `chipBgColor` を背景色に使用。作成者は固定バッジ（`surface2` 背景色、削除不可）。
- **エラー・保存中状態**: エラーバナー表示、保存ボタンは `saving` で無効化。保存 → ダイアログを閉じる（二度押し不要）。

### 設定
- **予定チップの色**: スウォッチ一覧から選択。
- **週の開始曜日**: 日曜〜土曜から選択。
- **表示名**: 任意の表示名を設定。バッジや予定カードに表示される。
- **デフォルトに戻す**: 全設定を初期値にリセット。

### カレンダー共有
- ユーザー名を入力して共有設定を作成・削除。
- 共有してくれている相手は一覧表示のみ（削除不可）。
- 相互共有ユーザーは予定メンバーの検索候補として利用可能。

### PWA
- **Manifest**: `display: standalone`、`background_color: #1a1a2e`、`theme_color: #16213e`。
- **iOS対応**: `apple-mobile-web-app-capable`、`apple-touch-icon`、ステータスバー透過。
- **絵文字favicon**: 📅 をSVG data URIで設定。

### REST API
- 予定のCRUD（GET一覧/個別、POST作成、PATCH更新、DELETE削除）
- 予定メンバー管理（GET一覧、POST追加、DELETE削除）
- カレンダー共有管理（GET一覧/incoming、POST作成、DELETE削除）
- ユーザー検索（GET search、ユーザー名・表示名両方で部分一致）
- ユーザー設定（GET取得、PUT更新、DELETEリセット）
- 日付形式: `yyyy/MM/dd-HH:mm`（Jackson @JsonFormat）
- `updateTime` はサーバー側で自動設定
- 自分以外のユーザーの予定は `shared=true` のみ取得
- API応答に `canEdit`, `ownerDisplayName`, `memberUsernames`, `memberChipBgColors`, `memberDisplayNames` を含む

## 無限スクロールカレンダー

`InfiniteCalendar.tsx` がコアコンポーネント。以下のサブコンポーネント・ユーティリティと連携:

- **InfiniteCalendar.tsx**: IntersectionObserver で上下のセンチネル要素を監視。端に達したら週を追加（12週ずつ）。初期表示は104週（約2年分）で今日を中央に配置。アクティブ月は画面中央付近に写っている日付の月にする。各スケジュールに `canEdit` フラグを持ち、ボタン表示を制御。
- **WeekRow.tsx**: 週単位の行。`useMemo` で `buildGlobalMultiDayInfo()` → `computeDaySlots()` の結果をキャッシュ。各日付のスロット配列を計算し DayCell に渡す。
- **DayCell.tsx**: 日付セル。チップ（`schedule-chip`）・プレースホルダー（`.schedule-placeholder`）・+N オーバーフロー表示を行う。チップ色は減法混色で計算。
- **dateUtils.ts**: スロット計算全般。`getSchedulePosition()`、`buildGlobalMultiDayInfo()`、`computeDaySlots()`、`shouldShowTitle()` 等。
- **colorUtils.ts**: `scheduleColor()`（RGB幾何平均による減法混色）、`PERSONAL_COLORS`（低明度 vivid 4色）、`hexToRgb()`。

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
- PATCHの成功ステータスは200 OK（201 CREATED ではない）。
- テストは JUnit 5 + Mockito + H2。`mvn test` で実行。
- CI/CDは GitHub Actions（`.github/workflows/ci.yml`）。mainブランチにpushで自動テスト→Dockerイメージを `ghcr.io/ogawadeniro/secretary:latest` にpush。
- Dockerデプロイは `Dockerfile` + `deploy.sh` を参照。Rocky Linux 9.4 で動作確認。
- スマホでのズームイン防止のため、全 `input`/`textarea`/`select` に `font-size: 16px; touch-action: manipulation;` を適用。

## プロジェクトスクリプト

| スクリプト | 用途 |
|-----------|------|
| `build.sh` | Reactビルド → Spring Bootのstaticにコピー → JARパッケージ |
| `dev.sh` | Spring Boot + Vite を同時起動（Ctrl+Cで終了） |
| `deploy.sh` | リモートサーバーにデプロイ（JARビルド → scp → Dockerビルド → 起動） |
| `setup-server.sh` | 初回サーバーセットアップ（Docker/DB/キーストア） |
| `setup-letsencrypt.sh` | Let's Encrypt 証明書の初回取得・更新（acme.sh使用） |

## ブランチ戦略

```
feature/xxx → merge → dev → (デプロイ時) → merge → main
fix/xxx     → merge → dev → (デプロイ時) → merge → main
```

- `main`: 本番リリース版。デプロイ時にのみ更新
- `dev`: 開発統合ブランチ。feature/fix はここにマージ
- `feature/xxx`, `fix/xxx`: 1機能・1修正 = 1ブランチ

## 将来のアイデア

### 公開コード方式のカレンダー共有（検討中）
各ユーザーが発行する公開コード（例: `X7K9M2`）を入力して共有する方式。
実装には `user_settings` テーブルに `share_code` カラム追加が必要。

### 共有ブロック機能（検討中）
ブロックされたユーザーは以後、自分の予定を相手に共有できなくなる。
`share_blocks` テーブル（blocker_username, blocked_username, created_at）の追加が必要。

## DBセットアップ

```sql
psql -U postgres -d postgres
create role rogawa with login createdb;
\q
psql -U rogawa -d postgres
create database secretary;
\q
psql -U rogawa -d secretary;

-- 予定
create table schedules (
    id serial primary key,
    title text not null,
    is_all_day boolean not null,
    start_datetime timestamptz not null,
    end_datetime timestamptz not null,
    owner text not null,
    description text,
    update_time timestamptz not null,
    shared boolean not null default true
);

-- カレンダー共有設定
create table calendar_shares (
    id bigserial primary key,
    owner_username text not null,
    shared_with_username text not null,
    permission text not null default 'READ',
    created_at timestamptz not null default now(),
    unique(owner_username, shared_with_username)
);

-- 予定メンバー
create table schedule_members (
    id bigserial primary key,
    schedule_id bigint not null references schedules(id) on delete cascade,
    username text not null,
    created_at timestamptz not null default now(),
    unique(schedule_id, username)
);

-- ユーザー
create table users (
    id bigserial primary key,
    username text not null unique,
    password text not null,
    display_name text
);

-- ユーザー設定
create table user_settings (
    id bigserial primary key,
    username text not null unique,
    chip_bg_color text,
    first_day_of_week integer
);
```
