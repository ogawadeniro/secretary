import { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import { Schedule } from "../types/schedule";
import { fetchSchedules } from "../api/scheduleApi";
import WeekRow from "./WeekRow";
import ScheduleDialog from "./ScheduleDialog";
import { addDays, getWeekStart, formatDateKey, toEpochDay } from "../utils/dateUtils";
import { getHolidaysInRange } from "../utils/holidayUtils";
import type { HolidayMap } from "../utils/holidayUtils";

/** 初期表示する週数（約2年分） */
const INITIAL_WEEKS = 104;
/** スクロール端到達時に追加読み込みする週数 */
const LOAD_MORE_WEEKS = 12;
/** 週の開始曜日（0=日曜） */
const FIRST_DAY_OF_WEEK = 0;

/** 基準日を中心に指定した週数のグリッドを生成 */
function generateWeeks(centerDate: Date, halfWeeks: number): Date[][] {
  const weekStart = getWeekStart(centerDate, FIRST_DAY_OF_WEEK);
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

/** オーナーごとに色を割り当て */
function generateOwnerColors(schedules: Schedule[]): Map<string, string> {
  const owners = [...new Set(schedules.map((s) => s.owner))];
  const colors = [
    "#4a90d9", "#e05a5a", "#50b86c", "#d4a030",
    "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
    "#14b8a6", "#a855f7",
  ];
  const map = new Map<string, string>();
  owners.forEach((o, i) => map.set(o, colors[i % colors.length]));
  return map;
}

export default function InfiniteCalendar() {
  const [weeks, setWeeks] = useState<Date[][]>(() =>
    generateWeeks(new Date(), INITIAL_WEEKS / 2)
  );
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [ownerColors, setOwnerColors] = useState<Map<string, string>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  /** 予定一覧を再取得 */
  const reloadSchedules = useCallback(async () => {
    const data = await fetchSchedules();
    setSchedules(data);
    setOwnerColors(generateOwnerColors(data));
  }, []);

  // 初回読み込み
  useEffect(() => {
    reloadSchedules();
  }, [reloadSchedules]);

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
    setSelectedDate(date);
  };

  const handleDialogClose = () => {
    setSelectedDate(null);
  };

  // 選択された日付に紐づく予定をフィルタ
  // schedulesForDate と同じ epoch日比較だが、ここでは引数として受け取る schedules に対して直接行う
  const selectedSchedules = selectedDate
    ? schedules.filter((s) => {
        const startMatch = s.startDatetime.match(
          /^(\d{4})\/(\d{2})\/(\d{2})/
        );
        if (!startMatch) return false;
        const startD = new Date(+startMatch[1], +startMatch[2] - 1, +startMatch[3]);

        const endMatch = s.endDatetime.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
        if (!endMatch) return false;
        const endD = new Date(+endMatch[1], +endMatch[2] - 1, +endMatch[3]);

        const day = toEpochDay(selectedDate);
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

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h1>{monthLabel}</h1>
      </div>

      <div className="day-labels">
        {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
          <div
            key={d}
            className="day-label"
            style={{
              color:
                i === 0
                  ? "var(--color-sun)"
                  : i === 6
                    ? "var(--color-sat)"
                    : "inherit",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="scroll-container" ref={scrollRef} onScroll={handleScroll}>
        <div ref={topSentinelRef} className="sentinel" />
        {weeks.map((dates, i) => (
          <WeekRow
            key={formatDateKey(dates[0])}
            dates={dates}
            schedules={schedules}
            currentMonth={currentMonth}
            ownerColors={ownerColors}
            holidays={holidays}
            onDateClick={handleDateClick}
          />
        ))}
        <div ref={bottomSentinelRef} className="sentinel" />
      </div>

      {selectedDate && (
        <ScheduleDialog
          date={selectedDate}
          schedules={selectedSchedules}
          onClose={handleDialogClose}
          onSchedulesChanged={reloadSchedules}
        />
      )}
    </div>
  );
}
