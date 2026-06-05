# secretary — スケジュール管理・リマインダーアプリ

Spring Boot 3.4.3 + Vaadin 24.6.6 + PostgreSQL。

## ビルド & 実行

```bash
mvn clean package -Dvaadin.ignoreVersionChecks=true
java -jar target/secretary-0.0.1-SNAPSHOT.jar
```

プロファイルは環境変数 `SPRING_PROFILES_ACTIVE` で選択:
- 開発: `export SPRING_PROFILES_ACTIVE=develop`
- 本番: Dockerコンテナ起動時は `deploy.sh` が自動設定
- テスト: JUnit実行時は自動検出

`npm` が古い環境では `-Dvaadin.ignoreVersionChecks=true` が必要。

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

### 主要エントリーポイント

| 役割 | ファイル |
|------|----------|
| アプリ起動 | `Application.java` |
| REST API | `infrastructure/rest/ScheduleController.java` |
| JPAエンティティ | `infrastructure/persistence/JpaSchedule.java`（テーブル: `schedules`） |
| ドメインモデル | `domain/model/Schedule.java` |
| アプリケーションサービス | `application/service/ScheduleService.java` |
| Vaadinルート画面 | `interface_adapter/vaadin/MainView.java` |
| 予定CRUDフォーム | `interface_adapter/vaadin/ScheduleForm.java`（Dialog） |
| 日付クリック詳細 | `interface_adapter/vaadin/calendar/ScheduleEditor.java`（Dialog） |

## プロファイル戦略

| プロファイル | 設定ファイル | 使いどころ |
|------------|-------------|-----------|
| `develop` | `application-develop.properties` | ローカル開発（IDEやCLIで起動） |
| `product` | `application-product.properties` | 本番Dockerコンテナ（`deploy.sh` が設定） |
| `test` | テストリソース内に内蔵 | JUnit自動検出 |

`application.properties` にはデフォルトプロファイルの指定がない。
必ず `SPRING_PROFILES_ACTIVE` で明示的に指定すること。

## HTTPS対応

本番サーバでは自己署名証明書によるHTTPSが使える。
初回セットアップ時に `setup-server.sh` が `/etc/secretary/keystore.p12` を生成し、
パスワードは `/etc/secretary/keystore-password.txt` に保存される。

`deploy.sh` に `SSL_KEYSTORE_PASSWORD` を渡すと、
自動的にHTTPS（デフォルト8443）で起動する。

```bash
export SSL_KEYSTORE_PASSWORD=$(sudo cat /etc/secretary/keystore-password.txt)
export SSL_PORT=8443
bash deploy.sh
```

本番用の正式な証明書を使いたい場合は、
`/etc/secretary/keystore.p12` を差し替えてからコンテナを再起動すればOK。

## 開発の注意点

- **Java 21必須**。Vaadin Maven Pluginがフロントエンドを自動生成する（`prepare-frontend` + `build-frontend`）。
- `src/main/frontend/generated/` は自動生成＋gitignore対象。手動編集禁止。
- 日付フォーマットは `yyyy/MM/dd-HH:mm`（Jacksonの `@JsonFormat`）。REST DTOの `ScheduleDto` にのみ適用。
- Lombok（`@Data`）使用。IDEで注釈処理を有効にすること。
- テストは JUnit 5 + Mockito + H2。`mvn test -Dvaadin.ignoreVersionChecks=true` で実行（テスト用プロファイル `test` を自動適用）。
- CI/CDは GitHub Actions（`.github/workflows/ci.yml`）。mainブランチにpushで自動テスト→Dockerイメージを `ghcr.io/ogawadeniro/secretary:latest` にpush。
- Dockerデプロイは `Dockerfile` + `deploy.sh` を参照。Rocky Linux 9.4 で動作確認。

## APIテスト

```bash
curl -X GET http://localhost:8080/api/v1/schedules
curl -X POST http://localhost:8080/api/v1/schedules \
  -H "Content-Type:application/json" \
  -d '{"title":"test","datetime":"2025/03/07-12:30","owner":"rogawa","description":"test schedule"}'
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
