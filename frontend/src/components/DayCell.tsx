import { Schedule } from "../types/schedule";
import { getSchedulePosition, shouldShowTitle } from "../utils/dateUtils";
import { textColorFromBg, ownerColor } from "../utils/colorUtils";
import type { SlotInfo } from "../utils/dateUtils";

interface DayCellProps {
  date: Date;
  slotInfos: SlotInfo[];
  overflowCount: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  chipBgColor: string;
  currentUsername: string;
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
  chipBgColor,
  currentUsername,
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
      className={`day-cell ${isToday ? "today" : ""} ${!isCurrentMonth ? "other-month" : ""}`}
      onClick={() => onDateClick(date)}
    >
      <span className="day-number" style={{ color: dateColor }}>
        {date.getDate()}
      </span>
      <div className="day-schedules">
        {slotInfos.map((si) => {
          const s = si.schedule;
          // プレースホルダー（空きスロット）
          if (!s) {
            return <div key={`ph-${si.slotIndex}`} className="schedule-placeholder" />;
          }
          const pos = getSchedulePosition(s, date);
          const showTitle = shouldShowTitle(s, date);
          // 自分の予定は chipBgColor、共有予定はオーナーの設定色（なければ fallback）
          const bgColor = s.owner === currentUsername
            ? chipBgColor
            : (s.ownerChipBgColor ?? ownerColor(s.owner));
          return (
            <div
              key={s.id}
              className={`schedule-chip schedule-${pos}`}
              style={{
                backgroundColor: bgColor,
                color: textColorFromBg(bgColor),
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
