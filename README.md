# secretary — スケジュール管理・リマインダーアプリ

Spring Boot 3.4.3 (REST API) + React (Vite + TypeScript) + PostgreSQL。

## 機能要件

### カレンダー表示
- **無限スクロール**: IntersectionObserver による上下方向の無限スクロール。初期表示は約2年分（104週）、端に到達すると12週ずつ追加。スクロール位置は週追加時も自動補正（ジャンプ防止）。
- **週7日表示**: 日〜土の7列固定、各行は1週間。ヘッダーに曜日ラベル（日=赤、土=青）。
- **アクティブ月検出**: 画面中央付近の日付から年月を自動判定しヘッダーに表示。
- **日付ハイライト**: アクティブ月の日付は明るく、他の月は薄く表示。今日のセルは背景色で強調。
- **固定行高**: 各行の高さは110px固定。予定数によらずレイアウト不変。

### 予定表示（チップ・複数日またぎ・オーバーフロー）
- **チップ表示**: 各日付セルに予定タイトルが色付きチップで表示。長いタイトルは `...` で省略。
- **最大表示件数**: `MAX_VISIBLE_SLOTS = 5`。5件超は `+N` で残り件数を表示。
- **複数日またぎの接続表示**:
  - 開始日〜終了日の範囲で、隣接セル間でチップがシームレスにつながって見える。
  - 内部で `start / middle / end` の3ポジションに分類。各ポジションで border-radius と margin を調整し、隣接セル間で背景色が連続する。
  - アクティブ期間（全複数日またぎ予定をカバーする日付範囲）内の各日は固定スロット方式。予定がない曜日には不可視のプレースホルダーを配置し、行位置を保持。
  - プレースホルダーは予定が未開始または過去に終了した場合は表示しない。
- **週境界でのタイトル再表示**: 日曜日（週の初め）に前週から継続中の予定もタイトルを表示。
- **オーナー色分け**: 作成者ごとに10色パレットから決定論的に色を割り当て。
- **チップ高さ**: 1.3em。`display: flex; align-items: center` でテキストが垂直中央に配置。
- **即時反映**: 予定の作成/編集/削除後、カレンダーに即時反映。

### ダイアログ（予定の作成・編集・削除）
- **ボトムシート形式**: 画面下部からスライドアップ（200msアニメーション）。オーバーレイクリックで閉じる。
- **予定一覧**: 選択日付に該当する予定をカード形式で表示。各カードに編集（鉛筆）・削除（ゴミ箱）ボタン。
- **作成フォーム**: タイトル・作成者・終日フラグ・開始日時・終了日時・説明を入力。保存ボタンは保存中は無効化（「保存中...」）。
- **編集**: 既存の値をプリセットしてフォームを開く。PATCHによる部分更新対応。
- **削除**: 確認ダイアログ（「〇〇を削除してもいいですか？」）の二段階操作。
- **日時自動補正**: 開始変更時に終了≦開始なら終了を+1時間に補正。終了変更時も同様。相互発火による無限ループは `adjustingRef` で防止。
- **終日予定**: チェックボックスONで時刻入力が非表示。保存時は `00:00` が設定される。
- **エラー表示**: 保存/削除失敗時に赤いエラーバナーを表示。

### PWA
- **Web App Manifest**: `display: standalone`、テーマ色に合わせた `background_color` / `theme_color`。
- **iOS対応**: `apple-mobile-web-app-capable` でフルスクリーン起動、`apple-touch-icon` でホーム画面アイコン。
- **絵文字ファビコン**: 📅 カレンダー絵文字をSVG data URIでfavicon設定。

### REST API
- **CRUD**: 予定の取得（一覧/個別）、作成、部分更新、削除。
- **日付形式**: `yyyy/MM/dd-HH:mm`（Jackson @JsonFormat）。
- **updateTime自動設定**: 作成・更新時のタイムスタンプはサーバー側で自動設定。

## アーキテクチャ

### 全体構成

```
frontend/ (React + Vite) → REST API ← backend/ (Spring Boot)
                                  ↕
                            PostgreSQL
```

### バックエンド（クリーンアーキテクチャ）

```
domain/ → application/ → infrastructure/
```

依存関係は外側→内側。内側（domain）はどのフレームワークにも依存しない。

| レイヤー | 役割 | キーファイル |
|----------|------|-------------|
| `domain/` | エンティティ、リポジトリポート | `Schedule.java`, `ScheduleRepository.java` |
| `application/` | ユースケース | `ScheduleUseCase.java`, `ScheduleService.java` |
| `infrastructure/` | JPA永続化、RESTエンドポイント | `JpaSchedule.java`, `ScheduleController.java`, `ScheduleDto.java` |

### フロントエンド

```
frontend/src/
├── main.tsx                     # エントリーポイント
├── App.tsx                      # ルートコンポーネント
├── index.css                    # ダークテーマCSS（--color-surface, --row-height等）
├── types/schedule.ts            # Schedule型定義
├── api/scheduleApi.ts           # REST APIクライアント
├── utils/
│   ├── dateUtils.ts             # 日付ユーティリティ（スロット計算、アクティブ期間、ポジション判定）
│   └── dateUtils.test.ts        # 45テスト（スロット、オーバーフロー、プレースホルダー等）
└── components/
    ├── InfiniteCalendar.tsx     # 無限スクロールカレンダー（IntersectionObserver）
    ├── WeekRow.tsx              # 週単位の行（useMemoでスロット計算をキャッシュ）
    ├── DayCell.tsx              # 日付セル（チップ・プレースホルダー・+Nレンダリング）
    └── ScheduleDialog.tsx       # 予定CRUDダイアログ（ボトムシート、日時自動補正）
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

`dev.sh` は Ctrl+C で両方のサーバーを一括停止できる。
Vite は `/api` へのリクエストを Spring Boot（8080）にプロキシする。

`build.sh` が必要なケース:

| 状況 | 使うスクリプト | 説明 |
|------|--------------|------|
| フロントエンド開発中 | `dev.sh` or `npm run dev` | Viteがホットリロードで即時反映 |
| バックエンド開発中 | `mvn spring-boot:run` or IDE | フロントエンドはViteからAPI叩く |
| デプロイ前 | `bash build.sh` | JARにフロントエンドを含めるために必要 |
| `java -jar` で単体起動 | `bash build.sh` してから | 同上。Spring Bootが静的ファイルを配信 |
| 本番Dockerデプロイ | `deploy.sh` が内部で実行 | 自動でビルド&転送される

### テスト

```bash
# 全テスト実行
mvn test

# テストのみ（フロントエンドビルド不要）
mvn test
```

| テストクラス | 種別 | フレームワーク |
|------------|------|--------------|
| `ScheduleTest` | 単体テスト | JUnit 5 |
| `OwnerColorUtilTest` | 単体テスト | JUnit 5 |
| `ScheduleServiceTest` | サービス | JUnit 5 + Mockito |
| `ScheduleControllerTest` | RESTコントローラ | Spring MockMvc + Mockito |
| `JpaScheduleRepositoryTest` | JPA永続化 | Spring DataJpaTest + H2 |

- テスト用DBは **H2インメモリ**、プロファイル `test` を自動適用。
- テスト実行時にPostgreSQLは不要。

### 注意点

- `src/main/resources/static/` は `build.sh` で自動生成。手動編集しても次回ビルドで上書きされる。
- 日付フォーマットは `yyyy/MM/dd-HH:mm`（Jacksonの `@JsonFormat`）。REST DTOの `ScheduleDto` にのみ適用。
- `updateTime` はサーバー側（`ScheduleService`）で自動設定。フロントエンドから送信しないこと。

## CI/CD

`main` ブランチへのpush / PR で `mvn test` + Dockerイメージビルドが実行される（`.github/workflows/ci.yml`）。
Node.js 20 で React フロントエンドをビルドし、Spring Boot JAR に統合する。

## デプロイ

### 構成

```
開発マシン                        本番サーバ（tk2-245-32038.vs.sakura.ne.jp）
  │                                 │
  │ bash build.sh                   │ Dockerコンテナ
  │ deploy.sh で転送＆ビルド ─────→ │   secretary:latest
  │                                 │   --network host
  │                                 │   8443: Spring Boot (HTTPS)
  │                                 │   443 → socat → 8443
  │                                 │   localhost:5432 (PostgreSQL)
```

### 初回セットアップ（本番サーバで一度だけ）

```bash
git clone https://github.com/ogawadeniro/secretary.git
cd secretary
bash setup-server.sh
```

### デプロイ（開発マシンから）

```bash
bash deploy.sh    # パスワードを対話式で入力（または export SECRETARY_DB_PASSWORD=...）
```

## API

ベースURL: `https://tk2-245-32038.vs.sakura.ne.jp/api/v1/schedules`

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| GET | /schedules | 全予定を取得 |
| GET | /schedules/{id} | 指定IDの予定を取得 |
| POST | /schedules | 予定を新規登録 |
| PATCH | /schedules/{id} | 予定を部分更新 |
| DELETE | /schedules/{id} | 予定を削除 |

### リクエスト/レスポンス形式

```json
{
    "id": 1,
    "title": "ミーティング",
    "isAllDay": false,
    "startDatetime": "2025/03/07-12:30",
    "endDatetime": "2025/03/07-13:30",
    "owner": "rogawa",
    "description": "test schedule",
    "updateTime": "2025/03/07-12:30:00"
}
```

### curl例

```bash
curl -X GET http://localhost:8080/api/v1/schedules
curl -X POST http://localhost:8080/api/v1/schedules \
  -H "Content-Type:application/json" \
  -d '{"title":"test","isAllDay":false,"startDatetime":"2026/06/05-12:30","endDatetime":"2026/06/05-13:30","owner":"rogawa","description":"test schedule"}'
curl -X PATCH http://localhost:8080/api/v1/schedules/1 \
  -H "Content-Type:application/json" \
  -d '{"title":"test2"}'
curl -X DELETE http://localhost:8080/api/v1/schedules/2
```

## DB

### テーブル定義

テーブル名: `schedules`

| カラム | 型 | 制約 | 説明 |
|--------|------|------|-------------|
| id | serial | PK | 一意ID |
| title | text | NOT NULL | 予定タイトル |
| is_all_day | boolean | NOT NULL | 終日予定フラグ |
| start_datetime | timestamptz | NOT NULL | 開始日時 |
| end_datetime | timestamptz | NOT NULL | 終了日時 |
| owner | text | NOT NULL | 所有者 |
| description | text | | 説明 |
| update_time | timestamptz | NOT NULL | 更新日時 |

## 将来のアイデア

### 公開コード方式のカレンダー共有（検討中）

現在の共有方法はユーザー名直接入力方式だが、セキュリティ向上のため
各ユーザーが発行する公開コード（share_code）を入力して共有する方式も検討中。

- コードはランダムな英数字（例: `X7K9M2`）
- 設定画面でコード表示 + 再生成可能
- コードを知っている人だけが共有リクエスト可能
- 実装には `user_settings` テーブルに `share_code` カラム追加が必要

## 既知の問題

### ホーム画面アイコンが反映されない（iOS）
iOSで「ホーム画面に追加」したときのアイコンが、サーバー側を更新しても変わらない場合がある。
WebClip（ホーム画面アイコン）のキャッシュがiOS側で強固に保持されるため。
**回避策**: ホーム画面から削除 → Safariの履歴とWebサイトデータを消去 → iPhone再起動 → 再追加
