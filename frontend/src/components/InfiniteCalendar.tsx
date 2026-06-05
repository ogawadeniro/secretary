import { useState, useEffect, useRef, useCallback } from "react";
import { Schedule } from "../types/schedule";
import { fetchSchedules } from "../api/scheduleApi";
import WeekRow from "./WeekRow";
import ScheduleDialog from "./ScheduleDialog";
import {
  addDays,
  getWeekStart,
  formatDateKey,
} from "../utils/dateUtils";

const INITIAL_WEEKS = 104;
const LOAD_MORE_WEEKS = 12;
const FIRST_DAY_OF_WEEK = 0;

function generateWeeks(
  centerDate: Date,
  halfWeeks: number
): Date[][] {
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
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const reloadSchedules = useCallback(async () => {
    const data = await fetchSchedules();
    setSchedules(data);
    setOwnerColors(generateOwnerColors(data));
  }, []);

  useEffect(() => {
    reloadSchedules();
  }, [reloadSchedules]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
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
            requestAnimationFrame(() => {
              el.scrollTop = el.scrollHeight - prevScrollHeight;
            });
          }
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

  // Centering on today
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || weeks.length === 0) return;
    const centerIndex = Math.floor(INITIAL_WEEKS / 2);
    const rowHeight = 120;
    el.scrollTop = centerIndex * rowHeight - el.clientHeight / 2 + rowHeight / 2;
  }, []);

  // Update current month based on scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || weeks.length === 0) return;
    const rowHeight = 120;
    const centerScrollTop = el.scrollTop + el.clientHeight / 2;
    const rowIndex = Math.floor(centerScrollTop / rowHeight);
    const idx = Math.max(0, Math.min(rowIndex, weeks.length - 1));
    setCurrentMonth(weeks[idx][0].getMonth());
  }, [weeks]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleDialogClose = () => {
    setSelectedDate(null);
  };

  const selectedSchedules = selectedDate
    ? schedules.filter((s) => {
        const startMatch = s.startDatetime.match(
          /^(\d{4})\/(\d{2})\/(\d{2})/
        );
        if (!startMatch) return false;
        const sy = +startMatch[1],
          sm = +startMatch[2],
          sd = +startMatch[3];
        const startD = new Date(sy, sm - 1, sd);

        const endMatch = s.endDatetime.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
        if (!endMatch) return false;
        const ey = +endMatch[1],
          em = +endMatch[2],
          ed = +endMatch[3];
        const endD = new Date(ey, em - 1, ed);

        return selectedDate >= startD && selectedDate <= endD;
      })
    : [];

  const monthLabel = `${weeks[0]?.[0]?.getFullYear() ?? ""}年 ${currentMonth + 1}月`;

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
              color: i === 0 ? "var(--color-sun)" : i === 6 ? "var(--color-sat)" : "inherit",
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
