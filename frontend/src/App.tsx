import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import InfiniteCalendar from "./components/InfiniteCalendar";
import ManagementScreen from "./components/ManagementScreen";
import FooterTabs from "./components/FooterTabs";
import type { TabId } from "./components/FooterTabs";
import LoginPage from "./components/LoginPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import ResetPasswordPage from "./components/ResetPasswordPage";

type Page = "login" | "forgot-password" | "reset-password";

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>("login");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("calendar");
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const toastIdRef = useRef(0);

  const notify = (message: string, type: "success" | "error" = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

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
        <div className="main-content">
          {activeTab === "calendar" && (
            <InfiniteCalendar />
          )}
          {activeTab === "management" && (
            <ManagementScreen
              onNavigateToCalendar={() => setActiveTab("calendar")}
              onNotify={notify}
            />
          )}
        </div>
        <FooterTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {toasts.length > 0 && (
          <div className="toast-container">
            {toasts.map((t) => (
              <div key={t.id} className={`toast${t.type === "error" ? " toast-error" : ""}`}>
                {t.message}
              </div>
            ))}
          </div>
        )}
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
