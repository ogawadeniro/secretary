# secretary — スケジュール管理・リマインダーアプリ

Spring Boot 3.4.3 (REST API) + React (Vite + TypeScript) + PostgreSQL。

## 機能要件

### カレンダー表示
- **無限スクロールカレンダー**: IntersectionObserver による上下方向の無限スクロール。初期表示は約2年分（104週）。端に到達すると12週ずつ追加読み込み。
- **週7日表示**: 日〜土の7列固定。各行は1週間を表す。
- **アクティブ月表示**: ヘッダーに現在の年/月を表示。画面中央付近に写っている日付の月を自動判定。
- **アクティブ月ハイライト**: アクティブ月の日付テキストは明るく表示され、他の月の日付は薄く表示。
- **当日ハイライト**: 今日の日付セルは背景色で強調表示。
- **固定サイズセル**: 全日付セルは同一サイズ（高さ固定）。予定の数に関わらずレイアウトが崩れない。

### カレンダーナビゲーション
- **今日を中心に初期表示**: アプリ起動時に今日の週を中央に配置。
- **無限過去/未来スクロール**: 上方向にスクロールで過去へ、下方向にスクロールで未来へ。自動的に週を追加。

### 予定管理
- **予定の閲覧**: 各日付セルに予定タイトルがチップ表示。3件以上の予定がある日は残り件数を表示。
- **予定の作成**: 日付セルをクリック → ダイアログ → 予定追加フォーム。タイトル、終日フラグ、開始/終了時刻、作成者、説明を入力。
- **予定の編集**: ダイアログから既存予定を編集。部分更新対応（PATCH）。
- **予定の削除**: ダイアログから予定を削除。
- **複数日またぎ対応**: 開始日〜終了日の範囲で予定を表示。
- **オーナー色分け**: 作成者ごとに異なる色で予定チップを表示。
- **即時反映**: 予定の作成/編集/削除後、カレンダー画面に戻りすぐに反映。

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
├── index.css                    # ダークテーマCSS
├── types/schedule.ts            # Schedule型定義
├── api/scheduleApi.ts           # REST APIクライアント
├── utils/dateUtils.ts           # 日付ユーティリティ
└── components/
    ├── InfiniteCalendar.tsx     # 無限スクロールカレンダー
    ├── WeekRow.tsx              # 週単位の行
    ├── DayCell.tsx              # 日付セル
    └── ScheduleDialog.tsx       # 予定CRUDダイアログ
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
export SECRETARY_DB_PASSWORD=your-password
bash deploy.sh    # JARビルド→転送→Dockerビルド→起動まで自動
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
