#!/bin/bash
# secretary — Let's Encrypt 証明書セットアップスクリプト（acme.sh 版）
# 使い方: bash setup-letsencrypt.sh
#
# 前提:
#   - Rocky Linux 9.4 で動作確認
#   - ドメインが本番サーバのIPを指していること
#   - ポート80が空いていること
set -euo pipefail

DOMAIN="${1:-tk2-245-32038.vs.sakura.ne.jp}"
KEYSTORE_DIR="/etc/secretary"
KEYSTORE_FILE="${KEYSTORE_DIR}/keystore.p12"
PASSWORD_FILE="${KEYSTORE_DIR}/keystore-password.txt"
ACME_HOME="${HOME}/.acme.sh"

echo "============================================"
echo " Let's Encrypt 証明書セットアップ（acme.sh）"
echo " ドメイン: ${DOMAIN}"
echo "============================================"

# ---------- acme.sh インストール ----------
install_acme() {
    if command -v ~/.acme.sh/acme.sh &>/dev/null; then
        echo "=== acme.sh already installed ==="
        return
    fi
    echo "=== Installing acme.sh ==="
    curl -fsSL https://get.acme.sh | sh
    echo "=== acme.sh installed ==="
}

# ---------- 証明書取得 ----------
get_certificate() {
    if [ -d "${ACME_HOME}/${DOMAIN}" ]; then
        echo "=== Certificate already exists for ${DOMAIN} ==="
        return
    fi

    echo "=== Obtaining certificate for ${DOMAIN} ==="

    # Let's Encrypt を明示的に指定（デフォルトはZeroSSLで登録が必要なため）
    ~/.acme.sh/acme.sh --set-default-ca --server letsencrypt

    # nftables でポート80を許可（なければ追加）
    if ! sudo nft list chain ip filter INPUT 2>/dev/null | grep -q "tcp dport 80"; then
        sudo nft insert rule ip filter INPUT ip protocol tcp tcp dport 80 counter accept
    fi

    # socat で 80 → 8888 をフォワード（権限の問題でstandaloneが直接80を使えない場合の対策）
    sudo nohup socat TCP-LISTEN:80,fork,reuseaddr TCP:localhost:8888 > /dev/null 2>&1 &
    SOCAT_PID=$!
    # 起動を待つ
    sleep 1

    # acme.sh standalone をポート8888で起動
    ~/.acme.sh/acme.sh --issue --standalone --httpport 8888 -d "${DOMAIN}"

    # socat を停止
    kill "$SOCAT_PID" 2>/dev/null || true

    echo "=== Certificate obtained ==="
}

# ---------- PKCS12 に変換 ----------
convert_to_pkcs12() {
    echo "=== Converting to PKCS12 ==="
    local cert_dir="${ACME_HOME}/${DOMAIN}"
    local password
    password=$(openssl rand -base64 32)
    echo "$password" | sudo tee "${PASSWORD_FILE}" > /dev/null
    sudo chmod 600 "${PASSWORD_FILE}"

    sudo mkdir -p "${KEYSTORE_DIR}"

    # acme.sh → PKCS12 に変換
    sudo openssl pkcs12 -export \
        -in "${cert_dir}/fullchain.cer" \
        -inkey "${cert_dir}/${DOMAIN}.key" \
        -out "${KEYSTORE_FILE}" \
        -name secretary \
        -password "pass:${password}"

    sudo chmod 600 "${KEYSTORE_FILE}"
    echo "=== PKCS12 keystore generated: ${KEYSTORE_FILE} ==="
}

# ---------- 自動更新設定 ----------
setup_auto_renew() {
    echo "=== Setting up auto-renewal ==="

    # 更新後のフックスクリプトを作成
    sudo mkdir -p "${KEYSTORE_DIR}"
    local hook="/etc/secretary/renew-hook.sh"
    sudo tee "${hook}" > /dev/null <<EOF
#!/bin/bash
# acme.sh 証明書更新後 → PKCS12変換 → Docker再起動
set -euo pipefail

KEYSTORE_FILE="${KEYSTORE_FILE}"
PASSWORD_FILE="${PASSWORD_FILE}"
DOMAIN="${DOMAIN}"
CERT_DIR="${ACME_HOME}/\${DOMAIN}"

PASSWORD=\$(openssl rand -base64 32)
echo "\$PASSWORD" | sudo tee "\$PASSWORD_FILE" > /dev/null
sudo chmod 600 "\$PASSWORD_FILE"

sudo openssl pkcs12 -export \
    -in "\${CERT_DIR}/fullchain.cer" \
    -inkey "\${CERT_DIR}/\${DOMAIN}.key" \
    -out "\$KEYSTORE_FILE" \
    -name secretary \
    -password "pass:\$PASSWORD"

sudo chmod 600 "\$KEYSTORE_FILE"

# Dockerコンテナ再起動
docker restart secretary 2>/dev/null || true
EOF
    sudo chmod +x "${hook}"

    # acme.sh に更新フックを登録
    ~/.acme.sh/acme.sh --set-default-ca --server letsencrypt
    ~/.acme.sh/acme.sh --install-cert -d "${DOMAIN}" \
        --renew-hook "sudo bash ${hook}"

    echo "=== Auto-renewal configured ==="
    echo "    証明書の自動更新: acme.sh (cron: daily)"
    echo "    更新後フック:     renew-hook.sh → Docker再起動"
}

# ---------- ポート80 の後片付け ----------
cleanup_ports() {
    echo "=== Cleaning up ==="
    local handle
    handle=$(sudo nft -a list chain ip filter INPUT 2>/dev/null \
        | grep 'tcp dport 80' | grep -o 'handle [0-9]*' | cut -d' ' -f2 || true)
    if [ -n "$handle" ]; then
        sudo nft delete rule ip filter INPUT handle "$handle" 2>/dev/null || true
    fi
    echo "=== Port 80 rule removed ==="
}

# ---------- 完了メッセージ ----------
print_summary() {
    echo ""
    echo "============================================"
    echo " Let's Encrypt セットアップ完了！"
    echo "============================================"
    echo ""
    echo " 証明書: ${DOMAIN}"
    echo " 有効期限: 90日（cronで自動更新）"
    echo " キーストア: ${KEYSTORE_FILE}"
    echo ""
    echo " ブラウザで https://${DOMAIN}/ にアクセス！"
    echo "（デプロイ後に反映されるよ）"
    echo ""
    echo " 手動で更新したいとき:"
    echo "   ~/.acme.sh/acme.sh --renew -d ${DOMAIN}"
    echo ""
}

# ---------- メイン ----------
main() {
    install_acme
    get_certificate
    convert_to_pkcs12
    setup_auto_renew
    cleanup_ports
    print_summary
}

main "$@"
