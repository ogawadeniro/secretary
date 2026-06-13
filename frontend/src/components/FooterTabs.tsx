import { Calendar, Users } from "lucide-react";

export type TabId = "calendar" | "management";

interface FooterTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function FooterTabs({ activeTab, onTabChange }: FooterTabsProps) {
  return (
    <div className="app-footer">
      <button
        className={`footer-tab${activeTab === "management" ? " active" : ""}`}
        onClick={() => onTabChange("management")}
      >
        <Users size={20} />
        <span>管理</span>
      </button>
      <button
        className={`footer-tab${activeTab === "calendar" ? " active" : ""}`}
        onClick={() => onTabChange("calendar")}
      >
        <Calendar size={20} />
        <span>カレンダー</span>
      </button>
    </div>
  );
}
