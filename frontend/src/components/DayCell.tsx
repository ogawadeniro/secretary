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
  holidayName: string | null;
  onDateClick: (date: Date) => void;
}

/** 1日分のセル（日付番号 + 祝日ラベル + 予定チップ） */
export default function DayCell({
  date,
  slotInfos,
  overflowCount,
  isToday,
  isCurrentMonth,
  ownerColors,
  holidayName,
  onDateClick,
}: DayCellProps) {
  const dayOfWeek = date.getDay();
  // 日曜=ピンク、祝日=赤（祝日が優先）
  const dateColor = holidayName
    ? "var(--color-holiday)"
    : dayOfWeek === 0
      ? "var(--color-sun)"
      : dayOfWeek === 6
        ? "var(--color-sat)"
        : "inherit";

  return (
    <div
      className={`day-cell ${isToday ? "today" : ""} ${!isCurrentMonth ? "other-month" : ""} ${holidayName ? "holiday" : ""}`}
      onClick={() => onDateClick(date)}
    >
      <span className="day-number" style={{ color: dateColor }}>
        {date.getDate()}
      </span>
      {holidayName && (
        <span className="holiday-label">{holidayName}</span>
      )}
      <div className="day-schedules">
        {slotInfos.map((si) => {
          const s = si.schedule;
          // プレースホルダー（空きスロット）
          if (!s) {
            return <div key={`ph-${si.slotIndex}`} className="schedule-placeholder" />;
          }
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
