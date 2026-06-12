import { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import { CircleUser, Settings, LogOut, Share2, Users, User, Filter, Check } from "lucide-react";
import type { UserSettings } from "../types/settings";
import type { Schedule } from "../types/schedule";
import type { Group } from "../types/group";
import { fetchSchedules } from "../api/scheduleApi";
import { fetchSettings } from "../api/settingsApi";
import { fetchGroups } from "../api/groupApi";
import WeekRow from "./WeekRow";
import ScheduleDialog from "./ScheduleDialog";
import SettingsDialog from "./SettingsDialog";
import AccountDialog from "./AccountDialog";
import ShareDialog from "./ShareDialog";
import GroupDialog from "./GroupDialog";
import { addDays, getWeekStart, formatDateKey, toEpochDay } from "../utils/dateUtils";
import { getHolidaysInRange } from "../utils/holidayUtils";
import type { HolidayMap } from "../utils/holidayUtils";
import { useAuth } from "../context/AuthContext";

/** 初期表示する週数（約2年分） */
const INITIAL_WEEKS = 104;
/** スクロール端到達時に追加読み込みする週数 */
const LOAD_MORE_WEEKS = 12;

/** 基準日を中心に指定した週数のグリッドを生成 */
function generateWeeks(centerDate: Date, halfWeeks: number, firstDayOfWeek: number): Date[][] {
  const weekStart = getWeekStart(centerDate, firstDayOfWeek);
  const start = addDays(weekStart, -halfWeeks * 7);
  const weeks: Date[][] = [];
  for (let i = 0; i < halfWeeks * 2; i++) {
    const row: Date[] = [];
    for (let j = 0; j < 7; j++) {
      row.push(addDays(start, i * 7 + j));
    }
    weeks.push(row);
  }
  return weeks;
}

/** デフォルト設定 */
const DEFAULT_SETTINGS: UserSettings = {
  chipBgColor: "#2255aa",
  firstDayOfWeek: 0,
  timeInterval: 5,
};

export default function InfiniteCalendar() {
  const { user, logout, updateUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [weeks, setWeeks] = useState<Date[][]>(() =>
    generateWeeks(new Date(), INITIAL_WEEKS / 2, DEFAULT_SETTINGS.firstDayOfWeek)
  );
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [highlightDate, setHighlightDate] = useState<Date | null>(null);
  const [dialogDate, setDialogDate] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [scheduleFilter, setScheduleFilter] = useState<Set<string | number>>(() => {
    try {
      const saved = localStorage.getItem("calendar_filter");
      if (saved) return new Set(JSON.parse(saved));
    } catch { /* ignore */ }
    return new Set(["personal"]);
  });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const toastId = useRef(0);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  /** 設定を読み込んで適用 */
  const reloadSettings = useCallback(async () => {
    try {
      const s = await fetchSettings();
      setSettings(s);
    } catch {
      // デフォルト設定を使い続ける
    }
  }, []);

  /** 予定一覧を再取得 */
  const reloadSchedules = useCallback(async () => {
    try {
      const [data, groupsData] = await Promise.all([
        fetchSchedules(),
        fetchGroups(),
      ]);
      setSchedules(data);
      setGroups(groupsData);
    } catch (e) {
      console.error("reloadSchedules error:", e);
    }
  }, []);

  // 初回読み込み
  useEffect(() => {
    reloadSettings();
    reloadSchedules();
  }, [reloadSettings, reloadSchedules]);

  // firstDayOfWeek が変わったら週を再生成
  useEffect(() => {
    setWeeks(generateWeeks(new Date(), INITIAL_WEEKS / 2, settings.firstDayOfWeek));
  }, [settings.firstDayOfWeek]);

  // フィルターを localStorage に保存
  useEffect(() => {
    localStorage.setItem("calendar_filter", JSON.stringify([...scheduleFilter]));
  }, [scheduleFilter]);

  // チップ色を CSS 変数に反映
  useEffect(() => {
    document.documentElement.style.setProperty("--color-chip-bg", settings.chipBgColor);
  }, [settings.chipBgColor]);

  // アカウントメニューの外側クリックで閉じる
  useEffect(() => {
    if (!showAccountMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAccountMenu]);

  // フィルタードロップダウンの外側クリックで閉じる
  useEffect(() => {
    if (!showFilterDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilterDropdown]);

  // IntersectionObserver による無限スクロール
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          // 上端到達 → 過去方向に週を追加
          if (entry.target === topSentinelRef.current) {
            const prevScrollHeight = el.scrollHeight;
            setWeeks((prev) => {
              const firstDate = prev[0][0];
              const newWeeks: Date[][] = [];
              for (let i = LOAD_MORE_WEEKS; i > 0; i--) {
                const row: Date[] = [];
                for (let j = 0; j < 7; j++) {
                  row.push(addDays(firstDate, -i * 7 + j));
                }
                newWeeks.push(row);
              }
              return [...newWeeks, ...prev];
            });
            // 追加後にスクロール位置を維持
            requestAnimationFrame(() => {
              el.scrollTop = el.scrollHeight - prevScrollHeight;
            });
          }

          // 下端到達 → 未来方向に週を追加
          if (entry.target === bottomSentinelRef.current) {
            setWeeks((prev) => {
              const lastDate = prev[prev.length - 1][6];
              const newWeeks: Date[][] = [];
              for (let i = 1; i <= LOAD_MORE_WEEKS; i++) {
                const row: Date[] = [];
                for (let j = 0; j < 7; j++) {
                  row.push(addDays(lastDate, (i - 1) * 7 + j + 1));
                }
                newWeeks.push(row);
              }
              return [...prev, ...newWeeks];
            });
          }
        }
      },
      { root: el, rootMargin: "400px" }
    );

    const top = topSentinelRef.current;
    const bottom = bottomSentinelRef.current;
    if (top) observer.observe(top);
    if (bottom) observer.observe(bottom);

    return () => observer.disconnect();
  }, []);

  // 初期表示を今日の週を中心にスクロール（レイアウト確定後にRAFで確実に）
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || weeks.length === 0) return;
    if (el.scrollTop !== 0) return; // すでにスクロール済みならスキップ
    const centerIndex = Math.floor(INITIAL_WEEKS / 2);
    const ROW_HEIGHT = 110;
    requestAnimationFrame(() => {
      el.scrollTop =
        centerIndex * ROW_HEIGHT - el.clientHeight / 2 + ROW_HEIGHT / 2;
    });
  }, [weeks]);

  /**
   * スクロール位置からアクティブ月を決定。
   * 画面中央付近に写っている日付の月を選ぶ。
   */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || weeks.length === 0) return;
    const ROW_HEIGHT = 110;
    // 画面中央のピクセル位置 → 対応する行を計算
    const centerPx = el.scrollTop + el.clientHeight / 2;
    const rowIndex = Math.max(
      0,
      Math.min(weeks.length - 1, Math.floor(centerPx / ROW_HEIGHT))
    );
    // 行の中央列（インデックス3）の日付の年と月をアクティブ月に
    const centerDate = weeks[rowIndex][3];
    setCurrentYear(centerDate.getFullYear());
    setCurrentMonth(centerDate.getMonth());
  }, [weeks]);

  const handleDateClick = (date: Date) => {
    setHighlightDate(date);
    setDialogDate(date);
  };

  const handleDialogClose = () => {
    setDialogDate(null);
  };

  const handleSettingsSaved = (s: UserSettings) => {
    setSettings(s);
    if (s.displayName && s.displayName !== user?.displayName) {
      updateUser({ displayName: s.displayName });
    }
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
    setShowAccountMenu(false);
    await logout();
  };

  /** フィルタ済み予定 */
  const filteredSchedules = useMemo(() => {
    if (scheduleFilter.size === 0) return [];
    return schedules.filter((s) => {
      if (scheduleFilter.has("personal") && s.owner === user?.username && (!s.groupIds || s.groupIds.length === 0)) return true;
      if (s.groupIds?.some((gid) => scheduleFilter.has(gid))) return true;
      return false;
    });
  }, [schedules, scheduleFilter, user?.username]);

  /** フィルター選択肢 */
  const filterOptions = useMemo(() => {
    const options: { value: "personal" | number; label: string }[] = [
      { value: "personal", label: "プライベート" },
    ];
    groups.forEach((g) => options.push({ value: g.id, label: g.name }));
    return options;
  }, [groups]);

  // 選択された日付に紐づく予定をフィルタ
  const selectedSchedules = dialogDate
    ? filteredSchedules.filter((s) => {
        const startMatch = s.startDatetime.match(
          /^(\d{4})\/(\d{2})\/(\d{2})/
        );
        if (!startMatch) return false;
        const startD = new Date(+startMatch[1], +startMatch[2] - 1, +startMatch[3]);

        const endMatch = s.endDatetime.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
        if (!endMatch) return false;
        const endD = new Date(+endMatch[1], +endMatch[2] - 1, +endMatch[3]);

        const day = toEpochDay(dialogDate!);
        return day >= toEpochDay(startD) && day <= toEpochDay(endD);
      })
    : [];

  /** 可視範囲の祝日を計算 */
  const holidays: HolidayMap = useMemo(() => {
    if (weeks.length === 0) return new Map();
    const firstDate = weeks[0][0];
    const lastDate = weeks[weeks.length - 1][6];
    return getHolidaysInRange(firstDate, lastDate);
  }, [weeks]);

  const monthLabel = `${currentYear}年 ${currentMonth + 1}月`;

  const selectedGroupIds = [...scheduleFilter].filter((v) => v !== "personal") as number[];

  return (
    <div className="calendar-container">
      {/* 1行目: 月表示 + アカウント */}
      <div className="calendar-header" style={{ paddingBottom: 0 }}>
        <h1>{monthLabel}</h1>
        <div className="calendar-header-right">
          <span className="header-user" style={{ background: settings.chipBgColor, borderRadius: "4px", padding: "2px 6px", color: "var(--color-text)" }}>{user?.displayName ?? user?.username}</span>
          <div className="account-menu-container" ref={accountMenuRef}>
            <button
              className="account-icon-btn"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              title="アカウント"
            >
              <CircleUser size={22} />
            </button>
            {showAccountMenu && (
              <div className="account-dropdown">
                <button
                  className="account-dropdown-item"
                  onClick={() => {
                    setShowAccountMenu(false);
                    setShowSettings(true);
                  }}
                >
                  <Settings size={16} />
                  <span>設定</span>
                </button>
                <button
                  className="account-dropdown-item"
                  onClick={() => {
                    setShowAccountMenu(false);
                    setShowAccount(true);
                  }}
                >
                  <User size={16} />
                  <span>アカウント</span>
                </button>
                <button
                  className="account-dropdown-item"
                  onClick={() => {
                    setShowAccountMenu(false);
                    setShowShare(true);
                  }}
                >
                  <Share2 size={16} />
                  <span>シェアメン管理</span>
                </button>
                <button
                  className="account-dropdown-item"
                  onClick={() => {
                    setShowAccountMenu(false);
                    setShowGroup(true);
                  }}
                >
                  <Users size={16} />
                  <span>共有グループ管理</span>
                </button>
                <button
                  className="account-dropdown-item"
                  onClick={() => setShowLogoutConfirm(true)}
                >
                  <LogOut size={16} />
                  <span>ログアウト</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2行目: フィルターバッジ + フィルターアイコン */}
      <div className="calendar-header" style={{
        display: "flex", alignItems: "center", gap: "8px",
        paddingTop: "4px", paddingBottom: "8px",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", flex: 1 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "2px 8px", background: "var(--color-surface2)",
            borderRadius: "999px", fontSize: "0.8rem",
          }}>
            プライベート
          </span>
          {selectedGroupIds.map((gid) => {
            const g = groups.find((gr) => gr.id === gid);
            return (
              <span key={gid} style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "2px 8px", background: "var(--color-surface2)",
                borderRadius: "999px", fontSize: "0.8rem",
              }}>
                {g?.iconData && <img src={g.iconData} alt="" style={{ width: "16px", height: "16px", borderRadius: "3px", objectFit: "cover" }} />}
                {g?.name ?? gid}
              </span>
            );
          })}
        </div>

        <div style={{ position: "relative" }} ref={filterDropdownRef}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowFilterDropdown((p) => !p)}
            title="フィルター"
            style={{ display: "flex", padding: "4px", borderRadius: "6px", cursor: "pointer", border: "none", background: "var(--color-surface2)", color: "var(--color-text)" }}
          >
            <Filter size={18} />
          </button>
          {showFilterDropdown && (
            <div style={{
              position: "absolute", right: 0, top: "100%", zIndex: 100,
              background: "var(--color-surface2)", border: "1px solid var(--color-border)",
              borderRadius: "6px", marginTop: "4px", minWidth: "180px",
              overflow: "hidden",
            }}>
              {filterOptions.filter((o) => o.value !== "personal").length === 0 ? (
                <div style={{ padding: "12px", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                  参加している共有グループはありません
                </div>
              ) : (
                filterOptions.filter((o) => o.value !== "personal").map((opt) => {
                const isActive = scheduleFilter.has(opt.value);
                return (
                  <div key={String(opt.value)} style={{
                    padding: "8px 12px", cursor: "pointer", fontSize: "0.85rem",
                    background: isActive ? "var(--color-hover)" : "transparent",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex", alignItems: "center", gap: "8px",
                  }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const next = new Set(scheduleFilter);
                      if (isActive) {
                        next.delete(opt.value);
                      } else {
                        next.add(opt.value);
                      }
                      setScheduleFilter(next);
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isActive ? "var(--color-hover)" : "transparent"; }}
                  >
                    <div style={{
                      width: "14px", height: "14px", borderRadius: "3px",
                      border: "2px solid var(--color-border)",
                      background: isActive ? "var(--color-accent)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {isActive && <Check size={10} style={{ color: "#fff" }} />}
                    </div>
                    {opt.label}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>

      <div className="day-labels">
        {Array.from({ length: 7 }, (_, i) => {
          const dayIndex = (settings.firstDayOfWeek + i) % 7;
          const labels = ["日", "月", "火", "水", "木", "金", "土"];
          return (
            <div
              key={labels[dayIndex]}
              className="day-label"
              style={{
                color:
                  dayIndex === 0
                    ? "var(--color-sun)"
                    : dayIndex === 6
                      ? "var(--color-sat)"
                      : "inherit",
              }}
            >
              {labels[dayIndex]}
            </div>
          );
        })}
      </div>

      <div className="scroll-container" ref={scrollRef} onScroll={handleScroll}>
        <div ref={topSentinelRef} className="sentinel" />
        {weeks.map((dates, i) => (
          <WeekRow
            key={formatDateKey(dates[0])}
            dates={dates}
            schedules={filteredSchedules}
            currentMonth={currentMonth}
            chipBgColor={settings.chipBgColor}
            currentUsername={user?.username ?? ""}
            holidays={holidays}
            onDateClick={handleDateClick}
            selectedDate={highlightDate}
            groups={groups}
          />
        ))}
        <div ref={bottomSentinelRef} className="sentinel" />
      </div>

      {showSettings && (
        <SettingsDialog
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={handleSettingsSaved}
          onNotify={notify}
        />
      )}

      {showAccount && (
        <AccountDialog
          settings={settings}
          onClose={() => setShowAccount(false)}
          onSaved={handleSettingsSaved}
          onNotify={notify}
        />
      )}

      {showLogoutConfirm && (
        <div className="dialog-overlay dialog-overlay-center" onClick={() => setShowLogoutConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>ログアウトする？</p>
            <div className="confirm-actions">
              <button className="confirm-btn-yes" onClick={handleLogoutConfirm}>うん</button>
              <button className="confirm-btn-no" onClick={() => setShowLogoutConfirm(false)}>やめる</button>
            </div>
          </div>
        </div>
      )}

      {showShare && (
        <ShareDialog onClose={() => setShowShare(false)} onNotify={notify} />
      )}

      {showGroup && (
        <GroupDialog onClose={() => setShowGroup(false)} onNotify={notify} />
      )}

      {dialogDate && (
        <ScheduleDialog
          date={dialogDate}
          schedules={selectedSchedules}
          holidayName={holidays.get(formatDateKey(dialogDate)) ?? null}
          onClose={handleDialogClose}
          onSchedulesChanged={reloadSchedules}
          currentUsername={user?.username ?? ""}
          chipBgColor={settings.chipBgColor}
          timeInterval={settings.timeInterval}
          onNotify={notify}
        />
      )}

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
