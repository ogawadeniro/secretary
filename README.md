# secretary — スケジュール管理・リマインダーアプリ

Spring Boot 3.4.3 + Vaadin 24.6.6 + PostgreSQL で構成されたWebアプリ。
予定の登録・編集・削除を Vaadin Flow の WebUI と REST API の両方で行える。

## 要件

- WebUIで予定を登録、閲覧、編集、削除
- 登録した予定をLINEでリマインド（cron定期実行）

## アーキテクチャ（クリーンアーキテクチャ）

```
domain/ → application/ → infrastructure/ ← interface_adapter/
```

依存関係は外側→内側。内側（domain）はどのフレームワークにも依存しない。

| レイヤー | 役割 | キーファイル |
|----------|------|-------------|
| `domain/` | エンティティ、リポジトリポート | `Schedule`, `ScheduleRepository` |
| `application/` | ユースケース（アプリケーションサービス） | `ScheduleUseCase`, `ScheduleService` |
| `infrastructure/` | JPA永続化、RESTエンドポイント | `JpaSchedule`, `SchedulePersistenceAdapter`, `ScheduleController`, `ScheduleDto` |
| `interface_adapter/` | Vaadin UI、色生成ユーティリティ | `MainView`, `ScheduleForm`, `Calender`, `OwnerColorUtil` |

### 補足

- Vaadin Flow によるJavaベースWeb UI（`/` ルート）と REST API（`/api/v1/schedules`）の二面性。
- カレンダーは42コマ（6週×7日）の固定グリッド。各日付は `DateCard` コンポーネント。
- `domain/model/Schedule.java` は pure POJO（JPA/Jacksonアノテーションなし）。JPAエンティティは `infrastructure/persistence/JpaSchedule.java` が別途保持。

### 処理流れ

1. WebUIまたはREST APIで入力を受け付ける
2. ApplicationServiceがドメインロジックを実行する
3. RepositoryがDB（PostgreSQL）へ永続化する

## ビルド & 実行

```bash
mvn clean package -Dvaadin.ignoreVersionChecks=true
java -jar target/secretary-0.0.1-SNAPSHOT.jar
```

プロファイルは環境変数 `SPRING_PROFILES_ACTIVE` で選択:
- 開発: `export SPRING_PROFILES_ACTIVE=develop`
- 本番: `deploy.sh` が自動設定
- テスト: JUnit実行時は自動検出

`npm` が古い環境では `-Dvaadin.ignoreVersionChecks=true` が必要。

## テスト

```bash
mvn test -Dvaadin.ignoreVersionChecks=true
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

## CI/CD（GitHub Actions）

`.github/workflows/ci.yml`

| トリガー | 動作 |
|---------|------|
| mainブランチへのpush / PR | `mvn test` 実行 |

## デプロイ（本番サーバー）

### アーキテクチャ

```
開発マシン                         本番サーバ（160.16.206.42）
  │                                  │
  │ mvn package → JAR                │ Dockerコンテナ
  │ docker build → イメージ作る      │   secretary:latest
  │ scpでJAR+ Dockerfile送信 ──────→ │   --network host
  │ sshで remote build & run ──────→ │   8443: Spring Boot (HTTPS)
  │                                  │   443 → socat → 8443
  │                                  │   localhost:5432 (PostgreSQL)
```

### サーバー要件

| 項目 | 要件 |
|------|------|
| OS | Rocky Linux 9.4 |
| ランタイム | Docker（インストール手順は `setup-server.sh` 参照） |
| DB | PostgreSQL（同一サーバー、`localhost:5432`） |

### 初回セットアップ

本番サーバーで一度だけ実行:

```bash
# リポジトリをクローン
git clone https://github.com/ogawadeniro/secretary.git
cd secretary

# Docker + DBのセットアップ（初回のみ）
bash setup-server.sh
```

`setup-server.sh` は以下を自動実行する：
1. Dockerのインストール（dnf）
2. PostgreSQLのロール・DB・テーブル作成
3. HTTPS用の自己署名証明書（keystore）を `/etc/secretary/` に生成

### デプロイ（開発マシンから実行）

```bash
# 1. JARをビルド（まだなら）
mvn package -DskipTests -Dvaadin.ignoreVersionChecks=true

# 2. デプロイ実行
export DB_PASSWORD=your-db-password
bash deploy.sh
```

`deploy.sh` が自動で以下を行う：
1. JAR + Dockerfile を本番サーバーに転送
2. SSHで本番サーバーにログイン
3. `docker build -t secretary:latest`（JARをコピーするだけ、数秒）
4. 古いコンテナを停止・削除
5. 新しいコンテナを起動（`--network host`、HTTPS有効）
6. ヘルスチェック（HTTP 200 を確認）

## 開発の注意点

- **Java 21必須**。Vaadin Maven Pluginがフロントエンドを自動生成する（`prepare-frontend` + `build-frontend`）。
- `src/main/frontend/generated/` は自動生成＋gitignore対象。手動編集禁止。
- 日付フォーマットは `yyyy/MM/dd-HH:mm`（Jacksonの `@JsonFormat`）。REST DTOの `ScheduleDto` にのみ適用。
- Lombok（`@Data`）使用。IDEで注釈処理を有効にすること。

## テーブル定義

テーブル名: `schedules`

| カラム | 型 | 制約 | 説明 |
|--------|------|------|-------------|
| id | serial | PK | 一意ID |
| title | text | NOT NULL | 予定タイトル |
| is_all_day | boolean | NOT NULL | 終日予定フラグ |
| start_datetime | timestamptz | NOT NULL | 予定の開始日時 |
| end_datetime | timestamptz | NOT NULL | 予定の終了日時 |
| owner | text | NOT NULL | 予定の所有者 |
| description | text | | 予定の説明 |
| update_time | timestamptz | NOT NULL | 更新日時 |

## DBセットアップ

```bash
psql -U postgres -d postgres
create role rogawa with login createdb;
\q
psql -U rogawa -d postgres
create database secretary;
\q
psql -U rogawa -d secretary;
```

```sql
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

## API

ベースURL: `https://localhost:8443/api/v1/schedules`

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| GET | /schedules | 全予定を取得 |
| GET | /schedules/{id} | 指定IDの予定を取得 |
| POST | /schedules | 予定を新規登録 |
| PATCH | /schedules/{id} | 予定を部分更新（nullの項目は変更しない） |
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

## ライセンス

MIT
