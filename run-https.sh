#!/bin/bash
set -eu

# ============================================================
# secretary — HTTPSでアプリを起動するスクリプト
#
# 使い方（初回のみ setup-server.sh を先に実行）:
#   bash run-https.sh
#
# やること:
#   1. keystoreがなければ自動生成
#   2. iptables 443→8443 転送ルール（なければ追加）
#   3. 古いプロセスを停止
#   4. アプリをHTTPS(8443)で起動
# ============================================================

APP_JAR="target/secretary-0.0.1-SNAPSHOT.jar"
KEYSTORE_DIR="/etc/secretary"
KEYSTORE_FILE="${KEYSTORE_DIR}/keystore.p12"
PASSWORD_FILE="${KEYSTORE_DIR}/keystore-password.txt"
REDIRECT_PORT=8443

# ---------- 色表示 ----------
red()   { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }

# ---------- 前提チェック ----------
check_prerequisites() {
    if [ ! -f "$APP_JAR" ]; then
        red "ERROR: ${APP_JAR} が見つかりません。"
        echo "  mvn package を実行してから再試行してね。"
        exit 1
    fi
}

# ---------- keystore生成 ----------
setup_keystore() {
    if [ -f "$KEYSTORE_FILE" ]; then
        green "Keystore OK: ${KEYSTORE_FILE}"
        return
    fi

    echo "=== Generating self-signed keystore ==="
    sudo mkdir -p "$KEYSTORE_DIR"

    local password
    password=$(openssl rand -base64 32)
    echo "$password" | sudo tee "$PASSWORD_FILE" > /dev/null
    sudo chown "$(whoami):$(whoami)" "$PASSWORD_FILE"
    chmod 600 "$PASSWORD_FILE"

    sudo keytool -genkeypair \
        -alias secretary \
        -keyalg RSA -keysize 2048 \
        -storetype PKCS12 \
        -keystore "$KEYSTORE_FILE" \
        -storepass "$password" \
        -dname "CN=secretary.local,O=secretary,C=JP" \
        -validity 3650

    sudo chown "$(whoami):$(whoami)" "$KEYSTORE_FILE"
    green "Keystore generated: ${KEYSTORE_FILE}"
    red "!!! 自己証明書です。ブラウザで警告が出ます。"
}

# ---------- iptables転送ルール ----------
setup_iptables() {
    # 443→8443 の転送ルールがあればスキップ
    if sudo iptables -t nat -C PREROUTING -p tcp --dport 443 -j REDIRECT --to-port ${REDIRECT_PORT} 2>/dev/null; then
        green "iptables rule OK: 443 → ${REDIRECT_PORT}"
        return
    fi

    echo "=== Adding iptables rule: 443 → ${REDIRECT_PORT} ==="
    sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port ${REDIRECT_PORT}

    # iptables-services がなければインストールして永続化
    if ! systemctl is-enabled iptables 2>/dev/null | grep -q enabled; then
        sudo dnf install -y iptables-services
        sudo systemctl enable --now iptables
    fi
    sudo service iptables save
    green "iptables rule saved."
}

# ---------- アプリ起動 ----------
start_app() {
    local password
    password=$(cat "$PASSWORD_FILE")

    # 古いプロセスを停止
    if pgrep -f "secretary.*SNAPSHOT" > /dev/null; then
        echo "=== Stopping old process ==="
        pkill -f "secretary.*SNAPSHOT" 2>/dev/null || true
        sleep 2
    fi

    echo "=== Starting application on port ${REDIRECT_PORT} (HTTPS) ==="
    echo "    https://$(curl -s ifconfig.me)/"

    nohup java -jar "$APP_JAR" \
        --spring.profiles.active=product \
        --server.port=${REDIRECT_PORT} \
        --server.ssl.key-store=file:${KEYSTORE_FILE} \
        --server.ssl.key-store-password="${password}" \
        --server.ssl.key-store-type=PKCS12 \
        --server.ssl.key-alias=secretary \
        > app.log 2>&1 &

    echo "PID: $!"
    green "Started! Waiting for ready..."
    sleep 5

    # ヘルスチェック
    if curl -sk -o /dev/null -w "HTTP %{http_code}\n" https://localhost:${REDIRECT_PORT}/api/v1/schedules; then
        green "Application is running!"
    else
        red "Something went wrong. Check app.log"
        tail -30 app.log
    fi
}

# ---------- メイン ----------
main() {
    echo "============================================"
    echo " Secretary - HTTPS Startup"
    echo "============================================"
    check_prerequisites
    setup_keystore
    setup_iptables
    start_app
    echo "============================================"
    echo " Access: https://$(curl -s ifconfig.me)/"
    echo "============================================"
}

main "$@"
