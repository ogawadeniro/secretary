import { useState, useRef, useEffect } from "react";
import { CircleUser, Settings, LogOut, User } from "lucide-react";
import type { UserSettings } from "../types/settings";

interface UserAccountSectionProps {
  settings: UserSettings;
  user: { displayName?: string; username: string } | null;
  onShowSettings: () => void;
  onShowAccount: () => void;
  onLogoutClick: () => void;
}

/** ユーザー表示名バッジ + アカウントアイコン + ドロップダウンメニュー */
export default function UserAccountSection({
  settings,
  user,
  onShowSettings,
  onShowAccount,
  onLogoutClick,
}: UserAccountSectionProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  return (
    <div className="calendar-header-right">
      <span
        className="header-user"
        style={{
          background: settings.chipBgColor,
          borderRadius: "4px",
          padding: "2px 6px",
          color: "var(--color-text)",
        }}
      >
        {user?.displayName ?? user?.username}
      </span>
      <div className="account-menu-container" ref={menuRef as React.Ref<HTMLDivElement>}>
        <button
          className="account-icon-btn"
          onClick={() => setShowMenu((p) => !p)}
          title="アカウント"
        >
          <CircleUser size={22} />
        </button>
        {showMenu && (
          <div className="account-dropdown">
            <button className="account-dropdown-item" onClick={() => { setShowMenu(false); onShowSettings(); }}>
              <Settings size={16} />
              <span>設定</span>
            </button>
            <button className="account-dropdown-item" onClick={() => { setShowMenu(false); onShowAccount(); }}>
              <User size={16} />
              <span>アカウント</span>
            </button>
            <button className="account-dropdown-item" onClick={() => { setShowMenu(false); onLogoutClick(); }}>
              <LogOut size={16} />
              <span>ログアウト</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
