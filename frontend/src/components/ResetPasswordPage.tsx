import { useState, type FormEvent } from "react";
import { resetPasswordApi } from "../api/authApi";

interface ResetPasswordPageProps {
  token: string;
  onComplete: () => void;
}

/** パスワードリセットページ（トークン付きURLから遷移） */
export default function ResetPasswordPage({ token, onComplete }: ResetPasswordPageProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 4) {
      setError("パスワードは4文字以上にしてね");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("パスワードが一致しないよ");
      return;
    }

    setSubmitting(true);
    try {
      await resetPasswordApi(token, newPassword);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生したよ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Secretary</h1>
        <p className="login-subtitle">新しいパスワードを設定</p>

        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            新しいパスワード
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={4}
              autoFocus
            />
          </label>

          <label>
            新しいパスワード（確認）
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={4}
            />
          </label>

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? "保存中..." : "パスワードを変更"}
          </button>
        </form>
      </div>
    </div>
  );
}
