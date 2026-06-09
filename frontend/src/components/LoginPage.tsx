import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

interface LoginPageProps {
  onShowForgotPassword: () => void;
}

/** ログインページ */
export default function LoginPage({ onShowForgotPassword }: LoginPageProps) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(username, password, displayName, email);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Secretary</h1>
        <p className="login-subtitle">
          {isRegister ? "アカウントを作成" : "ログイン"}
        </p>

        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            ユーザー名
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </label>

          {isRegister && (
            <label>
              表示名
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </label>
          )}

          {isRegister && (
            <label>
              メールアドレス（任意）
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="パスワードリセットに使うよ"
              />
            </label>
          )}

          <label>
            パスワード
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
            />
          </label>

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? "送信中..." : isRegister ? "登録" : "ログイン"}
          </button>
        </form>

        {!isRegister && (
          <button className="link-btn forgot-password-btn" onClick={onShowForgotPassword}>
            パスワードを忘れた
          </button>
        )}

        <p className="login-toggle">
          {isRegister ? (
            <>
              既にアカウントをお持ちですか？{" "}
              <button className="link-btn" onClick={() => setIsRegister(false)}>
                ログイン
              </button>
            </>
          ) : (
            <>
              アカウントがありませんか？{" "}
              <button className="link-btn" onClick={() => setIsRegister(true)}>
                新規登録
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
