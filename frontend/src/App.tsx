import { AuthProvider, useAuth } from "./context/AuthContext";
import InfiniteCalendar from "./components/InfiniteCalendar";
import LoginPage from "./components/LoginPage";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app">
      <InfiniteCalendar />
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
