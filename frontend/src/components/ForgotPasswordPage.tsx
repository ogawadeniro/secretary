import { useState, type FormEvent } from "react";
import { forgotPasswordApi } from "../api/authApi";

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

/** パスワード忘れページ */
export default function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPasswordApi(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生したよ");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">Secretary</h1>
          <p className="login-subtitle">メールを送信したよ</p>
          <p className="forgot-password-hint">
            登録されているメールアドレスにパスワードリセット用のリンクを送信したよ。
            30分以内に新しいパスワードを設定してね。
          </p>
          <button className="login-btn" onClick={onBackToLogin}>
            ログインに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Secretary</h1>
        <p className="login-subtitle">パスワードをリセット</p>

        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            登録したメールアドレス
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="info.secretary.ryokotu@gmail.com"
            />
          </label>

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? "送信中..." : "リセットリンクを送信"}
          </button>
        </form>

        <button className="link-btn forgot-password-btn" onClick={onBackToLogin}>
          ログインに戻る
        </button>
      </div>
    </div>
  );
}
