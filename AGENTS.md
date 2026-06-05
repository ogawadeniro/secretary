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
| `domain/` | エンティティ、リポジトリポート | `Schedule`, `ScheduleRepository` |
| `application/` | ユースケース（アプリケーションサービス） | `ScheduleUseCase`, `ScheduleService` |
| `infrastructure/` | JPA永続化、RESTエンドポイント | `JpaSchedule`, `SchedulePersistenceAdapter`, `ScheduleController`, `ScheduleDto` |

### フロントエンド（React + Vite + TypeScript）

```
frontend/src/
├── main.tsx                     # エントリーポイント
├── App.tsx                      # ルートコンポーネント
├── index.css                    # ダークテーマCSS
├── types/schedule.ts            # Schedule型定義
├── api/scheduleApi.ts           # REST APIクライアント
├── utils/dateUtils.ts           # 日付ユーティリティ
└── components/
    ├── InfiniteCalendar.tsx     # 無限スクロールカレンダー（IntersectionObserver）
    ├── WeekRow.tsx              # 週単位の行
    ├── DayCell.tsx              # 日付セル
    └── ScheduleDialog.tsx       # 予定CRUDダイアログ
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
- **固定サイズ**: 全日付セルは同一サイズ（高さ固定）。予定の数に関わらずレイアウトが崩れない。

### 予定管理
- **チップ表示**: 各日付セルに予定タイトルが色付きチップで表示。3件超は残り件数を表示。
- **CRUDダイアログ**: 日付セルをクリック → ダイアログで予定の作成・編集・削除。
- **オーナー色分け**: 作成者ごとに異なる色でチップを表示。
- **複数日またぎ**: 開始日〜終了日の範囲で予定を表示。
- **即時反映**: 保存後すぐにカレンダー画面に戻り更新を反映。

### REST API
- 予定のCRUD（GET一覧/個別、POST作成、PATCH更新、DELETE削除）
- 日付形式: `yyyy/MM/dd-HH:mm`（Jackson @JsonFormat）
- `updateTime` はサーバー側で自動設定

## 無限スクロールカレンダー

`InfiniteCalendar.tsx` がコアコンポーネント。

- IntersectionObserver で上下のセンチネル要素を監視
- 端に達したら週を追加（12週ずつ）
- 初期表示は104週（約2年分）で今日を中央に配置
- アクティブ月は画面中央付近に写っている日付の月にする
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

### デプロイ

```bash
export SECRETARY_DB_PASSWORD=your-password
export SSL_KEYSTORE_PASSWORD=$(sudo cat /etc/secretary/keystore-password.txt)
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
```

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
