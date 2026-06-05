# secretary — スケジュール管理・リマインダーアプリ

Spring Boot 3.4.3 + Vaadin 24.6.6 + PostgreSQL。

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
- カレンダーは42コマ（6週×7日）の固定グリッド。
- `domain/model/Schedule.java` は pure POJO（JPA/Jacksonアノテーションなし）。JPAエンティティは `infrastructure/persistence/JpaSchedule.java` が別途保持。

## 開発

### 要件

- Java 21
- Maven 3.9+
- PostgreSQL（開発用DBが `localhost:5432/secretary` にあること）
- Lombok（IDEで注釈処理を有効にすること）

### ビルド & 実行

```bash
# ビルド
mvn clean package -Dvaadin.ignoreVersionChecks=true

# 開発プロファイルで起動（DBは localhost:5432/secretary）
export SPRING_PROFILES_ACTIVE=develop
java -jar target/secretary-0.0.1-SNAPSHOT.jar
```

> `npm` が古い環境では `-Dvaadin.ignoreVersionChecks=true` が必要。

### テスト

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

### 注意点

- `src/main/frontend/generated/` は自動生成＋gitignore対象。手動編集禁止。
- 日付フォーマットは `yyyy/MM/dd-HH:mm`（Jacksonの `@JsonFormat`）。REST DTOの `ScheduleDto` にのみ適用。

## CI/CD

`main` ブランチへのpush / PR で `mvn test` が実行される（`.github/workflows/ci.yml`）。

## デプロイ

### 構成

```
開発マシン                        本番サーバ（160.16.206.42）
  │                                 │
  │ mvn package                     │ Dockerコンテナ
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

`setup-server.sh` の内容：
1. Dockerインストール
2. PostgreSQLロール・DB・テーブル作成
3. HTTPS用keystore生成（`/etc/secretary/keystore.p12`）

終わったら `newgrp docker` または再ログインしてDocker権限を反映。

### デプロイ（開発マシンから）

```bash
# JARをビルド（まだなら）
mvn package -DskipTests -Dvaadin.ignoreVersionChecks=true

# デプロイ
export DB_PASSWORD=your-password
bash deploy.sh
```

`deploy.sh` の流れ：
1. JAR + Dockerfile を本番サーバにSCP
2. SSHで本番サーバで `docker build`（JARをコピーするだけ、数秒で完了）
3. 古いコンテナを停止・削除
4. 新しいコンテナを起動（`--network host`、HTTPS有効）
5. ヘルスチェック

### アクセス

`https://160.16.206.42/`

> 初回はプロバイダの管理画面で443番ポートの開放が必要。

## API

ベースURL: `https://160.16.206.42/api/v1/schedules`

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

### curl例

```bash
curl -k https://160.16.206.42/api/v1/schedules
curl -k -X POST https://160.16.206.42/api/v1/schedules \
  -H "Content-Type: application/json" \
  -d '{"title":"test","startDatetime":"2025/03/07-12:30","endDatetime":"2025/03/07-13:30","owner":"rogawa"}'
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
