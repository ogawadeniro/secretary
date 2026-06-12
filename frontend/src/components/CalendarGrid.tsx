import { formatDateKey } from "../utils/dateUtils";
import type { HolidayMap } from "../utils/holidayUtils";
import type { Schedule } from "../types/schedule";
import type { Group } from "../types/group";
import WeekRow from "./WeekRow";

interface CalendarGridProps {
  weeks: Date[][];
  filteredSchedules: Schedule[];
  currentMonth: number;
  chipBgColor: string;
  currentUsername: string;
  holidays: HolidayMap;
  highlightDate: Date | null;
  groups: Group[];
  firstDayOfWeek: number;
  onDateClick: (date: Date) => void;
  onScroll: React.UIEventHandler<HTMLDivElement>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  topSentinelRef: React.RefObject<HTMLDivElement | null>;
  bottomSentinelRef: React.RefObject<HTMLDivElement | null>;
}

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarGrid({
  weeks,
  filteredSchedules,
  currentMonth,
  chipBgColor,
  currentUsername,
  holidays,
  highlightDate,
  groups,
  firstDayOfWeek,
  onDateClick,
  onScroll,
  scrollRef,
  topSentinelRef,
  bottomSentinelRef,
}: CalendarGridProps) {
  return (
    <>
      <div className="day-labels">
        {Array.from({ length: 7 }, (_, i) => {
          const dayIndex = (firstDayOfWeek + i) % 7;
          return (
            <div
              key={DAY_LABELS[dayIndex]}
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
              {DAY_LABELS[dayIndex]}
            </div>
          );
        })}
      </div>

      <div className="scroll-container" ref={scrollRef as React.Ref<HTMLDivElement>} onScroll={onScroll}>
        <div ref={topSentinelRef as React.Ref<HTMLDivElement>} className="sentinel" />
        {weeks.map((dates) => (
          <WeekRow
            key={formatDateKey(dates[0])}
            dates={dates}
            schedules={filteredSchedules}
            currentMonth={currentMonth}
            chipBgColor={chipBgColor}
            currentUsername={currentUsername}
            holidays={holidays}
            onDateClick={onDateClick}
            selectedDate={highlightDate}
            groups={groups}
          />
        ))}
        <div ref={bottomSentinelRef as React.Ref<HTMLDivElement>} className="sentinel" />
      </div>
    </>
  );
}
