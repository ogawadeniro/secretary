import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import InfiniteCalendar from "./components/InfiniteCalendar";
import LoginPage from "./components/LoginPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import ResetPasswordPage from "./components/ResetPasswordPage";

type Page = "login" | "forgot-password" | "reset-password";

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>("login");
  const [resetToken, setResetToken] = useState<string | null>(null);

  // URLのクエリパラメータからリセットトークンを取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setResetToken(token);
      setPage("reset-password");
    }
  }, []);

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">読み込み中...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="app">
        <InfiniteCalendar />
      </div>
    );
  }

  if (page === "forgot-password") {
    return (
      <div className="app">
        <ForgotPasswordPage onBackToLogin={() => setPage("login")} />
      </div>
    );
  }

  if (page === "reset-password" && resetToken) {
    return (
      <div className="app">
        <ResetPasswordPage
          token={resetToken}
          onComplete={() => {
            setPage("login");
            setResetToken(null);
            // URLからトークンを削除
            window.history.replaceState({}, "", "/");
          }}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <LoginPage onShowForgotPassword={() => setPage("forgot-password")} />
    </div>
  );
}

/** ルートコンポーネント */
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
