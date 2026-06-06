import { Schedule } from "../types/schedule";
import { getSchedulePosition, shouldShowTitle } from "../utils/dateUtils";
import type { SlotInfo } from "../utils/dateUtils";

interface DayCellProps {
  date: Date;
  slotInfos: SlotInfo[];
  overflowCount: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  ownerColors: Map<string, string>;
  onDateClick: (date: Date) => void;
}

/** 1日分のセル（日付番号 + 予定チップ） */
export default function DayCell({
  date,
  slotInfos,
  overflowCount,
  isToday,
  isCurrentMonth,
  ownerColors,
  onDateClick,
}: DayCellProps) {
  const dayOfWeek = date.getDay();
  const dateColor =
    dayOfWeek === 0
      ? "var(--color-sun)"
      : dayOfWeek === 6
        ? "var(--color-sat)"
        : "inherit";

  return (
    <div
      className={`day-cell ${isToday ? "today" : ""} ${!isCurrentMonth ? "other-month" : ""}`}
      onClick={() => onDateClick(date)}
    >
      <span className="day-number" style={{ color: dateColor }}>
        {date.getDate()}
      </span>
      <div className="day-schedules">
        {slotInfos.map((si) => {
          const s = si.schedule!;
          const pos = getSchedulePosition(s, date);
          const showTitle = shouldShowTitle(s, date);
          return (
            <div
              key={s.id}
              className={`schedule-chip schedule-${pos}`}
              style={{
                backgroundColor: ownerColors.get(s.owner) ?? "#888",
              }}
            >
              {showTitle ? s.title : ""}
            </div>
          );
        })}
        {overflowCount > 0 && (
          <div className="schedule-more">+{overflowCount}</div>
        )}
      </div>
    </div>
  );
}
