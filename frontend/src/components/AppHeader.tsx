import type { UserSettings } from "../types/settings";
import UserAccountSection from "./UserAccountSection";

interface AppHeaderProps {
  monthLabel: string;
  settings: UserSettings;
  user: { displayName?: string; username: string } | null;
  onShowSettings: () => void;
  onShowAccount: () => void;
  onLogoutClick: () => void;
}

/** カレンダー画面のヘッダー2行目。左に年月、右にユーザー情報を表示する。 */
export default function AppHeader({
  monthLabel,
  settings,
  user,
  onShowSettings,
  onShowAccount,
  onLogoutClick,
}: AppHeaderProps) {
  return (
    <div className="calendar-header" style={{ paddingBottom: 0, borderBottom: "none" }}>
      <h1>{monthLabel}</h1>
      <UserAccountSection
        settings={settings}
        user={user}
        onShowSettings={onShowSettings}
        onShowAccount={onShowAccount}
        onLogoutClick={onLogoutClick}
      />
    </div>
  );
}
