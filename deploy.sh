#!/bin/bash
set -eu

# ============================================================
# secretary — デプロイスクリプト
#
# 使い方（開発マシンで実行）:
#   export DB_PASSWORD=your-db-password
#   bash deploy.sh
#
# やること:
#   1. JARをビルド
#   2. Docker関連ファイルを本番サーバに転送
#   3. 本番サーバでDockerイメージをビルド
#   4. コンテナを起動
# ============================================================

PROD_HOST="${PROD_HOST:-160.16.206.42}"
PROD_USER="${PROD_USER:-rocky}"
IMAGE_NAME="${IMAGE_NAME:-secretary}"
JAR_FILE="target/secretary-0.0.1-SNAPSHOT.jar"

red()   { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }

load_keystore_password() {
    if [ -n "${SSL_KEYSTORE_PASSWORD:-}" ]; then
        return
    fi
    echo "=== Reading keystore password from server ==="
    SSL_KEYSTORE_PASSWORD=$(ssh "${PROD_USER}@${PROD_HOST}" "cat /etc/secretary/keystore-password.txt 2>/dev/null" 2>/dev/null || true)
    if [ -z "$SSL_KEYSTORE_PASSWORD" ]; then
        echo "  WARNING: keystore password not found. HTTPS will be disabled."
    else
        green "  Keystore password loaded."
    fi
}

check_prerequisites() {
    if [ -z "${DB_PASSWORD:-}" ]; then
        red "ERROR: DB_PASSWORD が設定されていません。"
        echo "  export DB_PASSWORD=your-db-password"
        exit 1
    fi
    if [ ! -f "$JAR_FILE" ]; then
        echo "=== Building JAR ==="
        mvn package -DskipTests -Dvaadin.ignoreVersionChecks=true
    fi
}

transfer_files() {
    echo "=== Transferring files to ${PROD_USER}@${PROD_HOST} ==="
    # JARとDockerfileを本番サーバの ~/secretary/ に送る
    ssh "${PROD_USER}@${PROD_HOST}" "mkdir -p ~/secretary/target"
    scp "$JAR_FILE" "${PROD_USER}@${PROD_HOST}:~/secretary/target/"
    scp Dockerfile .dockerignore "${PROD_USER}@${PROD_HOST}:~/secretary/"
    green "Transfer complete."
}

build_and_run_remote() {
    echo "=== Building image and starting container on remote ==="

    # SSHでリモートサーバ上でDockerビルド＆起動
    ssh "${PROD_USER}@${PROD_HOST}" "DB_PASSWORD='${DB_PASSWORD}' SSL_KEYSTORE_PASSWORD='${SSL_KEYSTORE_PASSWORD:-}' bash -s" << 'REMOTE'
        set -eu
        IMAGE_NAME="secretary"
        CONTAINER_NAME="secretary"

        cd ~/secretary

        # 古いJavaプロセス（直接起動）を停止
        if pgrep -f "secretary.*SNAPSHOT" > /dev/null; then
            echo "=== Stopping old Java process ==="
            pkill -f "secretary.*SNAPSHOT" 2>/dev/null || true
            sleep 2
        fi

        echo "=== Building Docker image ==="
        docker build -t "${IMAGE_NAME}:latest" .
        echo "Image built."

        echo "=== Stopping old container ==="
        docker stop "${CONTAINER_NAME}" 2>/dev/null || true
        docker rm "${CONTAINER_NAME}" 2>/dev/null || true

        # socat（443→8443）がなければ起動
        if ! pgrep -f "socat.*LISTEN:443" > /dev/null; then
            echo "=== Starting socat (443→8443) ==="
            sudo nohup socat TCP-LISTEN:443,fork,reuseaddr TCP:localhost:8443 > /dev/null 2>&1 &
        fi

        echo "=== Starting container ==="
        docker run -d \
            --name "${CONTAINER_NAME}" \
            --restart unless-stopped \
            --network host \
            -e SPRING_PROFILES_ACTIVE=product \
            -e SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/secretary" \
            -e SPRING_DATASOURCE_USERNAME=rogawa \
            -e SPRING_DATASOURCE_PASSWORD="${DB_PASSWORD}" \
            -e SERVER_PORT=8443 \
            -e SERVER_SSL_KEY_STORE=file:/etc/secretary/keystore.p12 \
            -e SERVER_SSL_KEY_STORE_PASSWORD="${SSL_KEYSTORE_PASSWORD:-}" \
            -e SERVER_SSL_KEY_STORE_TYPE=PKCS12 \
            -e SERVER_SSL_KEY_ALIAS=secretary \
            -v /etc/secretary:/etc/secretary:ro \
            "${IMAGE_NAME}:latest"

        echo "=== Container started ==="
        sleep 3

        # ヘルスチェック
        if curl -sk -o /dev/null -w "HTTP %{http_code}" https://localhost:8443/api/v1/schedules; then
            echo ""
            echo "OK: Application is running!"
        else
            echo ""
            echo "WARNING: Health check failed. Check: docker logs ${CONTAINER_NAME}"
        fi
REMOTE
}

main() {
    echo "============================================"
    echo " Secretary - Deploy"
    echo "============================================"
    check_prerequisites
    load_keystore_password
    transfer_files
    build_and_run_remote
    echo "============================================"
    echo " Access: https://${PROD_HOST}/"
    echo "============================================"
}

main "$@"
