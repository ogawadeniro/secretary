import { useState } from "react";
import type { UserSettings } from "../types/settings";
import { saveSettings } from "../api/settingsApi";
import { changePasswordApi } from "../api/authApi";

interface AccountDialogProps {
  settings: UserSettings;
  onClose: () => void;
  onSaved: (settings: UserSettings) => void;
  onNotify: (message: string, type?: "success" | "error") => void;
}

/** アカウント設定ダイアログ（メールアドレス・表示名・パスワード変更） */
export default function AccountDialog({
  settings: initial,
  onClose,
  onSaved,
  onNotify,
}: AccountDialogProps) {
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveSettings({
        displayName: displayName || undefined,
        email: email || undefined,
      });
      onSaved(saved);
      onNotify("設定を保存したよ");
      handleClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 4) {
      onNotify("パスワードは4文字以上にしてね", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      onNotify("新しいパスワードが一致しないよ", "error");
      return;
    }
    setSaving(true);
    try {
      await changePasswordApi(currentPassword, newPassword);
      onNotify("パスワードを変更したよ");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      onNotify("現在のパスワードが違うよ", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`dialog-overlay ${closing ? "closing" : ""}`} onClick={handleClose}>
      <div className={`dialog ${closing ? "closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>アカウント設定</h2>
          <button className="close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>
        <div className="dialog-body">
          <div className="settings-form">

            <section className="settings-section">
              <h3 className="settings-section-title">プロフィール設定</h3>
              <label>
                表示名
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="表示名を入力"
                />
              </label>
              <label>
                メールアドレス
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="パスワードリセット用"
                />
              </label>
            </section>

            <section className="settings-section">
              <h3 className="settings-section-title">パスワード変更</h3>
              <label>
                現在のパスワード
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="現在のパスワード"
                />
              </label>
              <label>
                新しいパスワード
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="4文字以上"
                />
              </label>
              <label>
                新しいパスワード（確認）
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="もう一度入力"
                />
              </label>
              <button
                className="save-btn"
                onClick={handleChangePassword}
                disabled={saving || !currentPassword || !newPassword}
                style={{ marginTop: "8px" }}
              >
                パスワードを変更
              </button>
            </section>
          </div>

          <div className="form-actions">
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </button>
            <button className="cancel-btn" onClick={handleClose}>
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
