#!/bin/bash
set -eu

# ============================================================
# secretary — HTTPSでアプリを起動するスクリプト
#
# 使い方:
#   bash run-https.sh
#
# やること:
#   1. keystoreがなければ自動生成
#   2. nftablesに443番ポートの許可ルールを追加
#   3. socatで443→8443のTCP転送を開始
#   4. アプリをHTTPS(8443)で起動
# ============================================================

APP_JAR="target/secretary-0.0.1-SNAPSHOT.jar"
KEYSTORE_DIR="/etc/secretary"
KEYSTORE_FILE="${KEYSTORE_DIR}/keystore.p12"
PASSWORD_FILE="${KEYSTORE_DIR}/keystore-password.txt"
APP_PORT=8443
HTTPS_PORT=443

red()   { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }

check_prerequisites() {
    if [ ! -f "$APP_JAR" ]; then
        red "ERROR: ${APP_JAR} が見つかりません。"
        echo "  mvn package を実行してから再試行してね。"
        exit 1
    fi
}

setup_keystore() {
    if [ ! -f "$KEYSTORE_FILE" ]; then
        echo "=== Generating self-signed keystore ==="
        sudo mkdir -p "$KEYSTORE_DIR"

        local password
        password=$(openssl rand -base64 32)
        echo "$password" | sudo tee "$PASSWORD_FILE" > /dev/null

        sudo keytool -genkeypair \
            -alias secretary \
            -keyalg RSA -keysize 2048 \
            -storetype PKCS12 \
            -keystore "$KEYSTORE_FILE" \
            -storepass "$password" \
            -dname "CN=secretary.local,O=secretary,C=JP" \
            -validity 3650

        green "Keystore generated: ${KEYSTORE_FILE}"
        red "!!! 自己証明書です。ブラウザで警告が出ます。"
    fi

    sudo chown "$(whoami):$(whoami)" "$KEYSTORE_FILE" "$PASSWORD_FILE" 2>/dev/null || true
    chmod 600 "$PASSWORD_FILE" 2>/dev/null || true
    green "Keystore OK: ${KEYSTORE_FILE}"
}

setup_firewall() {
    local handles
    handles=$(sudo nft -a list chain ip filter INPUT 2>/dev/null \
        | grep "tcp dport ${HTTPS_PORT} accept" \
        | grep -oP 'handle \d+' | grep -oP '\d+') || true
    for h in $handles; do
        sudo nft delete rule ip filter INPUT handle "$h" 2>/dev/null || true
    done

    echo "=== Adding nftables rule: allow port ${HTTPS_PORT} ==="
    sudo nft insert rule ip filter INPUT tcp dport ${HTTPS_PORT} accept
    green "nftables rule added."
}

setup_socat() {
    if ! command -v socat &>/dev/null; then
        echo "=== Installing socat ==="
        sudo dnf install -y socat
    fi

    if pgrep -f "socat.*LISTEN:${HTTPS_PORT}" > /dev/null; then
        echo "=== Stopping old socat ==="
        sudo pkill -f "socat.*LISTEN:${HTTPS_PORT}" 2>/dev/null || true
        sleep 1
    fi

    echo "=== Starting socat: ${HTTPS_PORT} → ${APP_PORT} ==="
    sudo nohup socat TCP-LISTEN:${HTTPS_PORT},fork,reuseaddr TCP:localhost:${APP_PORT} > /dev/null 2>&1 &
    echo "socat PID: $!"
    green "socat running."
}

start_app() {
    local password
    password=$(cat "$PASSWORD_FILE")

    if pgrep -f "secretary.*SNAPSHOT" > /dev/null; then
        echo "=== Stopping old process ==="
        pkill -f "secretary.*SNAPSHOT" 2>/dev/null || true
        sleep 2
    fi

    local public_ip
    public_ip=$(curl -s ifconfig.me)

    echo "=== Starting application on port ${APP_PORT} (HTTPS) ==="
    echo "    https://${public_ip}/"

    nohup java -jar "$APP_JAR" \
        --spring.profiles.active=product \
        --server.port=${APP_PORT} \
        --server.ssl.key-store=file:${KEYSTORE_FILE} \
        --server.ssl.key-store-password="${password}" \
        --server.ssl.key-store-type=PKCS12 \
        --server.ssl.key-alias=secretary \
        > app.log 2>&1 &

    echo "PID: $!"
    green "Started! Waiting for ready..."
    sleep 5

    local http_code
    http_code=$(curl -sk -o /dev/null -w "%{http_code}" https://localhost:${APP_PORT}/api/v1/schedules) || true
    if [ "$http_code" = "200" ]; then
        green "Application is running! (HTTP ${http_code})"
        echo ""
        echo "  Access: https://${public_ip}/"
    else
        red "Something went wrong (HTTP ${http_code:-N/A}). Check app.log"
        tail -30 app.log
    fi
}

main() {
    echo "============================================"
    echo " Secretary - HTTPS Startup"
    echo "============================================"
    check_prerequisites
    setup_keystore
    setup_firewall
    setup_socat
    start_app
    echo "============================================"
}

main "$@"
