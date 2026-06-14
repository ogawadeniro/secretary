# secretary — スケジュール管理・リマインダーアプリ

Spring Boot 3.4.3 (REST API) + React (Vite + TypeScript) + PostgreSQL。

## 機能概要

### カレンダー表示
- **無限スクロール**: IntersectionObserver による上下方向の無限スクロール。初期表示は約2年分（104週）、端に到達すると12週ずつ追加。スクロール位置は週追加時も自動補正（ジャンプ防止）。
- **週7日表示**: 日〜土の7列固定、各行は1週間。ヘッダーに曜日ラベル（日=赤、土=青）。
- **アクティブ月検出**: 画面中央付近の日付から年月を自動判定しヘッダーに表示。
- **日付ハイライト**: アクティブ月の日付は明るく、他の月は薄く表示。今日のセルは背景色で強調。
- **固定行高**: 各行の高さは110px固定。予定数によらずレイアウト不変。

### 予定表示（チップ・複数日またぎ・オーバーフロー）
- **チップ表示**: 各日付セルに予定タイトルが色付きチップで表示。長いタイトルは `...` で省略。
- **最大表示件数**: `MAX_VISIBLE_SLOTS = 5`。5件超は `+N` で残り件数を表示。
- **複数日またぎの接続表示**: 開始日〜終了日の範囲で、隣接セル間でチップがシームレスにつながって見える。`start / middle / end` の3ポジションで border-radius と margin を調整。
- **週境界でのタイトル再表示**: 日曜日（週の初め）に前週から継続中の予定もタイトルを表示。
- **チップ色**: 個人予定は低明度 vivid パレット（4色）、複数メンバーがいる予定は各メンバーの設定色を減法混色（幾何平均）で合成。文字色は常に白（`#e0e0e0`）。
- **共有アイコン**: 複数メンバーがいる予定のチップに `Users` アイコンを表示。
- **即時反映**: 予定の作成/編集/削除後、カレンダーに即時反映。

### ダイアログ（予定の作成・編集・削除）
- **ボトムシート形式**: 画面下部からスライドアップ（200msアニメーション）。オーバーレイクリックで閉じる。
- **予定一覧**: 選択日付に該当する予定をカード形式で表示。各カードに編集（鉛筆）・削除（ゴミ箱）ボタン。
- **作成フォーム**: タイトル・終日フラグ・開始日時・終了日時・説明・共有設定・メンバーを入力。
- **編集・削除権限**: 作成者、またはメンバーかつ全メンバーと相互にカレンダー共有しているユーザーのみ。
- **メンバー管理**: 相互共有ユーザーから検索・追加。バッジに表示名と各メンバーの設定色を表示。作成者は固定表示で削除不可。
- **日時自動補正**: 開始変更時に終了≦開始なら終了を+1時間に補正。終了変更時も同様。相互発火は `adjustingRef` で防止。
- **終日予定**: チェックボックスONで時刻入力が非表示。保存時は `00:00` が設定される。

### カレンダー共有
- ユーザー名を入力してカレンダー単位の共有設定を作成・削除。
- 共有されたユーザーの予定（`shared=true`）がカレンダーに表示される。
- 相互共有ユーザーは予定メンバーの検索候補として表示される。

### やることリスト
- **CRUD**: やることの作成・一覧表示・編集・削除。フッタータブでカレンダーと切り替え。
- **完了管理**: チェックボックスタップで確認ダイアログ→完了トグル。全完了時にランダムメッセージを表示。
- **期限設定**: 日付＋時刻の期限を設定可能。期限なしのものは未完了リスト最下部に配置。
- **グループフィルター**: FilterBar でグループ単位の絞り込み（カレンダーと共用）。
- **メンバー管理**: カレンダーのメンバー管理と同様の MemberAutocomplete + バッジ表示。グループ所属ユーザーを補完候補に表示。作成者は自動メンバーとして固定表示・削除不可。
- **ソート**: 未完了リストは期限昇順、完了リストは作成日時降順。

### PWA
- **Web App Manifest**: `display: standalone`、テーマ色に合わせた `background_color` / `theme_color`。
- **iOS対応**: `apple-mobile-web-app-capable` でフルスクリーン起動、`apple-touch-icon` でホーム画面アイコン。
- **絵文字ファビコン**: 📅 カレンダー絵文字をSVG data URIでfavicon設定。

### REST API
- **予定CRUD**: 予定の取得（一覧/個別）、作成、部分更新、削除。
- **予定メンバー管理**: 予定ごとのメンバー追加・削除・一覧取得。
- **やることCRUD**: やることの取得（一覧）、作成、部分更新、削除、完了トグル。
- **やることメンバー管理**: やることごとのメンバー追加・削除。
- **カレンダー共有**: 共有設定の作成・一覧取得（送信/受信）・削除。
- **ユーザー検索**: ユーザー名・表示名での部分一致検索。
- **日付形式**: `yyyy/MM/dd-HH:mm`（Jackson @JsonFormat）。
- **updateTime自動設定**: 作成・更新時のタイムスタンプはサーバー側で自動設定。

### アクセス権限

| 操作 | 条件 |
|------|------|
| 閲覧 | 自分が作成した予定、または自分に共有されている（`shared=true` かつカレンダー共有済み）予定 |
| 編集・削除 | 自分が作成した予定、または（予定のメンバーに自分が含まれている かつ 全メンバーから共有されている かつ 全メンバーに共有している）予定 |

## アーキテクチャ

### バックエンド（クリーンアーキテクチャ）

```
domain/ → application/ → infrastructure/
```

依存関係は外側→内側。内側（domain）はどのフレームワークにも依存しない。

| レイヤー | 役割 | キーファイル |
|----------|------|-------------|
| `domain/` | エンティティ、リポジトリポート | `Schedule.java`, `ScheduleRepository.java`, `CalendarShare.java`, `User.java`, `TodoItem.java`, `TodoItemRepository.java` |
| `application/` | ユースケース | `ScheduleUseCase.java`, `ScheduleService.java`, `TodoService.java`, `CustomUserDetailsService.java` |
| `infrastructure/` | JPA永続化、RESTエンドポイント | `JpaSchedule.java`, `ScheduleController.java`, `ScheduleDto.java`, `TodoController.java`, `TodoDto.java` |

### フロントエンド

```
frontend/src/
├── main.tsx                     # エントリーポイント
├── App.tsx                      # ルートコンポーネント
├── index.css                    # ダークテーマCSS
├── types/
│   ├── schedule.ts              # Schedule / ScheduleMember 型定義
│   ├── share.ts                 # CalendarShare 型定義
│   ├── group.ts                 # Group / GroupMember 型定義
│   ├── settings.ts              # UserSettings 型定義
│   └── todo.ts                  # TodoItem 型定義
├── api/
│   ├── client.ts                # 共通APIクライアント（fetchラッパー）
│   ├── authApi.ts               # 認証API（login/register/logout/me）
│   ├── scheduleApi.ts           # 予定CRUD API
│   ├── shareApi.ts              # カレンダー共有API
│   ├── memberApi.ts             # 予定メンバーAPI
│   ├── todoApi.ts               # やることCRUD API
│   ├── groupApi.ts              # グループAPI
│   ├── settingsApi.ts           # ユーザー設定API
│   └── userApi.ts               # ユーザー検索API
├── hooks/
│   └── useDateTimeCorrection.ts # 日時補正カスタムフック
├── utils/
│   ├── dateUtils.ts             # 日付ユーティリティ（スロット計算、アクティブ期間、ポジション判定）
│   ├── dateUtils.test.ts        # 45テスト
│   └── colorUtils.ts            # 色ユーティリティ（減法混色、パレット）
├── context/AuthContext.tsx       # 認証コンテキスト
└── components/
    ├── InfiniteCalendar.tsx     # 無限スクロールカレンダー（IntersectionObserver）
    ├── WeekRow.tsx              # 週単位の行
    ├── DayCell.tsx              # 日付セル
    ├── ScheduleDialog.tsx       # 予定CRUDダイアログ
    ├── MemberManager.tsx        # 予定メンバー管理（追加・削除・補完）
    ├── MemberAutocomplete.tsx   # メンバー補完入力コンポーネント
    ├── TimePicker.tsx           # 時刻選択ポップアップ
    ├── SettingsDialog.tsx       # 設定ダイアログ（色・表示・アカウント）
    ├── ShareDialog.tsx          # カレンダー共有管理ダイアログ
    ├── GroupDialog.tsx          # グループ管理ダイアログ
    ├── FilterBar.tsx            # グループフィルター（カレンダー＋やること共用）
    ├── FooterTabs.tsx           # フッタータブ（管理/カレンダー/やること）
    ├── TodoScreen.tsx           # やること一覧画面（未完了/完了/フィルター）
    ├── TodoDialog.tsx           # やること作成・編集ダイアログ
    ├── TodoDetailDialog.tsx     # やること詳細表示ダイアログ
    ├── ConfirmDialog.tsx        # 確認ダイアログ（削除・完了トグル）
    ├── LoginPage.tsx            # ログインページ
    ├── AccountDialog.tsx        # アカウント管理ダイアログ
    ├── ForgotPasswordPage.tsx   # パスワード忘れページ
    └── ResetPasswordPage.tsx    # パスワードリセットページ
```

## 開発

### 要件

- Java 21
- Node.js 18+
- Maven 3.9+
- PostgreSQL（開発用DBが `localhost:5432/secretary` にあること）
- Lombok（IDEで注釈処理を有効にすること）

### ビルド & 実行

```bash
# フルビルド（React → Spring Boot JAR）
bash build.sh

# 開発サーバー起動（Spring Boot + Vite を同時起動）
bash dev.sh

# 個別起動
SPRING_PROFILES_ACTIVE=develop java -jar target/secretary-0.0.1-SNAPSHOT.jar  # API:8080
cd frontend && npm run dev                                                     # UI:5173
```

| 状況 | 使うスクリプト | 説明 |
|------|--------------|------|
| フロントエンド開発中 | `dev.sh` or `npm run dev` | Viteがホットリロードで即時反映 |
| バックエンド開発中 | `mvn spring-boot:run` or IDE | ViteからAPIをプロキシ |
| デプロイ前 | `bash build.sh` | JARにフロントエンドを統合 |
| 本番Dockerデプロイ | `deploy.sh` が内部で実行 | 自動ビルド＆転送 |

### テスト

```bash
mvn test
```

| テストクラス | 種別 | 備考 |
|------------|------|------|
| `ScheduleServiceTest` | サービス | JUnit 5 + Mockito |
| `OwnerColorUtilTest` | 単体テスト | 色ユーティリティ（back） |
| `ScheduleServiceTest` | サービス | JUnit 5 + Mockito |
| `ScheduleControllerTest` | RESTコントローラ | Spring MockMvc + Mockito |
| `JpaScheduleRepositoryTest` | JPA永続化 | Spring DataJpaTest + H2 |

- テスト用DBは **H2インメモリ**。テスト実行時にPostgreSQLは不要。

### 注意点

- `src/main/resources/static/` は `build.sh` で自動生成。手動編集不可。
- 日付フォーマットは `yyyy/MM/dd-HH:mm`（Jacksonの `@JsonFormat`）。
- `updateTime` はサーバー側で自動設定。フロントエンドから送信しないこと。

## バージョン管理

[Semantic Versioning](https://semver.org/)（`MAJOR.MINOR.PATCH`）に従う。

| バージョン | 上げるタイミング | 例 |
|-----------|----------------|-----|
| MAJOR | 互換性のないAPI変更・アーキテクチャ刷新 | Vaadin→React移行 |
| MINOR | 後方互換のある機能追加 | アカウント管理機能 |
| PATCH | 後方互換のあるバグ修正・リファクタリング | APIクライアント共通化 |

- **mainにマージ＋デプロイ** したら MINOR または PATCH を上げる
- 大きな機能追加で MAJOR を上げる
- タグは `main` ブランチに打つ

## CI/CD

`main` ブランチへのpush / PR で `mvn test` + Dockerイメージビルドが実行される（`.github/workflows/ci.yml`）。

## デプロイ

### 構成

```
開発マシン → bash build.sh → deploy.sh → 本番サーバ（Docker: --network host, 8443 HTTPS, 443→socat→8443）
```

### 初回セットアップ（本番サーバで一度だけ）

```bash
git clone https://github.com/ogawadeniro/secretary.git && cd secretary && bash setup-server.sh
```

### デプロイ（開発マシンから）

```bash
bash deploy.sh    # パスワードを対話式で入力
export SECRETARY_DB_PASSWORD=your-password && bash deploy.sh  # または環境変数
```

## API

ベースURL: `https://secretary.ryokotu.com/api/v1/`

### 予定

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| GET | /schedules | 全予定を取得 |
| GET | /schedules/{id} | 指定IDの予定を取得 |
| POST | /schedules | 予定を新規登録 |
| PATCH | /schedules/{id} | 予定を部分更新 |
| DELETE | /schedules/{id} | 予定を削除 |

### 予定メンバー

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| GET | /schedules/{id}/members | メンバー一覧 |
| POST | /schedules/{id}/members | メンバー追加 |
| DELETE | /schedules/{id}/members?username= | メンバー削除 |

### やること

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| GET | /todos | 全やることを取得 |
| POST | /todos | やることを新規作成 |
| PATCH | /todos/{id} | やることを部分更新 |
| DELETE | /todos/{id} | やることを削除 |
| PATCH | /todos/{id}/toggle-complete | 完了状態をトグル |

### やることメンバー

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| POST | /todos/{id}/members | メンバー追加 |
| DELETE | /todos/{id}/members?username= | メンバー削除 |

### カレンダー共有

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| GET | /shares | 自分が共有している相手一覧 |
| GET | /shares/incoming | 自分を共有してくれている相手一覧 |
| POST | /shares | 共有設定を作成 |
| DELETE | /shares/{id} | 共有設定を削除 |

### ユーザー

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| GET | /users/search?q= | ユーザー名/表示名で部分一致検索 |
| GET | /users/search?q=&groupId= | グループメンバーを候補に含めて検索 |

### リクエスト例

```bash
curl -X GET http://localhost:8080/api/v1/schedules
curl -X POST http://localhost:8080/api/v1/schedules \
  -H "Content-Type:application/json" \
  -d '{"title":"test","isAllDay":false,"startDatetime":"2026/06/05-12:30","endDatetime":"2026/06/05-13:30","owner":"rogawa","description":"test schedule"}'
curl -X PATCH http://localhost:8080/api/v1/schedules/1 -H "Content-Type:application/json" -d '{"title":"test2"}'
curl -X DELETE http://localhost:8080/api/v1/schedules/2
curl -X GET "http://localhost:8080/api/v1/users/search?q=user"
```

## DB

### テーブル定義

```sql
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
    first_day_of_week integer,
    time_interval integer not null default 5
);

-- やること
create table todo_items (
    id bigserial primary key,
    title text not null,
    description text not null default '',
    owner text not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    deadline timestamptz,
    completed boolean not null default false
);

-- やることグループ紐付け
create table todo_item_groups (
    id bigserial primary key,
    todo_item_id bigint not null references todo_items(id) on delete cascade,
    group_id bigint not null references groups(id) on delete cascade,
    unique(todo_item_id, group_id)
);

-- やることメンバー
create table todo_item_members (
    id bigserial primary key,
    todo_item_id bigint not null references todo_items(id) on delete cascade,
    username text not null,
    unique(todo_item_id, username)
);
```

## 将来のアイデア

### 公開コード方式のカレンダー共有（検討中）
各ユーザーが発行する公開コード（例: `X7K9M2`）を入力して共有する方式。`user_settings` に `share_code` カラム追加が必要。

### 共有ブロック機能（検討中）
ブロックされたユーザーは自分の予定を相手に共有できなくなる。`share_blocks` テーブル追加が必要。

## 既知の問題

### iOSホーム画面アイコンが反映されない
WebClipのキャッシュがiOS側で強固に保持されるため。**回避策**: ホーム画面から削除 → Safariの履歴とWebサイトデータを消去 → iPhone再起動 → 再追加。

### 予定チップの重なり
複数日またぎ予定がある場合、チップの後ろにある別のチップの下端が1px程度見えることがある。原因不明（flex + height の計算差が疑われる）。軽微な視覚的バグ。
