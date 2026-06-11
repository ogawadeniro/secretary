import { getSchedulePosition, shouldShowTitle } from "../utils/dateUtils";
import { ownerColor } from "../utils/colorUtils";
import type { SlotInfo } from "../utils/dateUtils";
import type { Group } from "../types/group";

interface DayCellProps {
  date: Date;
  slotInfos: SlotInfo[];
  overflowCount: number;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  chipBgColor: string;
  currentUsername: string;
  holidayName: string | null;
  onDateClick: (date: Date) => void;
  groups: Group[];
}

/** 1日分のセル（日付番号 + 祝日ラベル + 予定チップ） */
export default function DayCell({
  date,
  slotInfos,
  overflowCount,
  isToday,
  isSelected,
  isCurrentMonth,
  chipBgColor,
  currentUsername,
  holidayName,
  onDateClick,
  groups,
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
      className={`day-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${!isCurrentMonth ? "other-month" : ""}`}
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
          const memberColors = (s.memberUsernames ?? []).map(
            (u) => s.memberChipBgColors?.[u] ?? ownerColor(u)
          );
          const colorStops = memberColors.map((c, i, arr) => {
            const start = (i / arr.length) * 100;
            const end = ((i + 1) / arr.length) * 100;
            return `${c} ${start}% ${end}%`;
          }).join(", ");
          const groupIcon = s.groupIds && s.groupIds.length > 0
            ? groups.find((g) => g.id === s.groupIds![0])?.iconData
            : undefined;
          return (
            <div
              key={s.id}
              className={`schedule-chip schedule-${pos}`}
              style={{
                color: "#e0e0e0",
                backgroundColor: "var(--color-surface2)",
                backgroundImage: `linear-gradient(to right, ${colorStops})`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "0 100%",
                backgroundSize: "100% 2px",
              }}
            >
              {showTitle && groupIcon && (
                <img src={groupIcon} alt="" style={{ width: "12px", height: "12px", borderRadius: "2px", objectFit: "cover", marginRight: "2px", flexShrink: 0 }} />
              )}
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
