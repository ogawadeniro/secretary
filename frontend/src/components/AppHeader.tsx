import { CircleUser, Settings, LogOut, Share2, Users, User } from "lucide-react";
import type { UserSettings } from "../types/settings";

interface AppHeaderProps {
  monthLabel: string;
  settings: UserSettings;
  user: { displayName?: string; username: string } | null;
  showAccountMenu: boolean;
  accountMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleAccountMenu: () => void;
  onShowSettings: () => void;
  onShowAccount: () => void;
  onShowShare: () => void;
  onShowGroup: () => void;
  onLogoutClick: () => void;
}

export default function AppHeader({
  monthLabel,
  settings,
  user,
  showAccountMenu,
  accountMenuRef,
  onToggleAccountMenu,
  onShowSettings,
  onShowAccount,
  onShowShare,
  onShowGroup,
  onLogoutClick,
}: AppHeaderProps) {
  return (
    <div className="calendar-header" style={{ paddingBottom: 0, borderBottom: "none" }}>
      <h1>{monthLabel}</h1>
      <div className="calendar-header-right">
        <span className="header-user" style={{ background: settings.chipBgColor, borderRadius: "4px", padding: "2px 6px", color: "var(--color-text)" }}>
          {user?.displayName ?? user?.username}
        </span>
        <div className="account-menu-container" ref={accountMenuRef as React.Ref<HTMLDivElement>}>
          <button
            className="account-icon-btn"
            onClick={onToggleAccountMenu}
            title="アカウント"
          >
            <CircleUser size={22} />
          </button>
          {showAccountMenu && (
            <div className="account-dropdown">
              <button className="account-dropdown-item" onClick={onShowSettings}>
                <Settings size={16} />
                <span>設定</span>
              </button>
              <button className="account-dropdown-item" onClick={onShowAccount}>
                <User size={16} />
                <span>アカウント</span>
              </button>
              <button className="account-dropdown-item" onClick={onShowShare}>
                <Share2 size={16} />
                <span>シェアメン管理</span>
              </button>
              <button className="account-dropdown-item" onClick={onShowGroup}>
                <Users size={16} />
                <span>共有グループ管理</span>
              </button>
              <button className="account-dropdown-item" onClick={onLogoutClick}>
                <LogOut size={16} />
                <span>ログアウト</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
