import { Schedule } from "../types/schedule";
import { schedulesForDate, formatDateKey, isSameDay } from "../utils/dateUtils";
import DayCell from "./DayCell";

interface WeekRowProps {
  dates: Date[];
  schedules: Schedule[];
  currentMonth: number;
  ownerColors: Map<string, string>;
  onDateClick: (date: Date) => void;
}

/**
 * 複数日またぎ予定が常に同じスロット位置になるようにソートする
 * （同じ週内でつながって見えるようにするため）
 */
function sortSchedules(daySchedules: Schedule[]): Schedule[] {
  return [...daySchedules].sort((a, b) => {
    const aEndDay = a.endDatetime.slice(0, 10);
    const aStartDay = a.startDatetime.slice(0, 10);
    const bEndDay = b.endDatetime.slice(0, 10);
    const bStartDay = b.startDatetime.slice(0, 10);
    const aIsMulti = aStartDay !== aEndDay;
    const bIsMulti = bStartDay !== bEndDay;
    if (aIsMulti && !bIsMulti) return -1;
    if (!aIsMulti && bIsMulti) return 1;
    return a.startDatetime.localeCompare(b.startDatetime);
  });
}

/** 1週間分（7日）の行を表示 */
export default function WeekRow({
  dates,
  schedules,
  currentMonth,
  ownerColors,
  onDateClick,
}: WeekRowProps) {
  const today = new Date();

  return (
    <div className="week-row">
      {dates.map((date, i) => {
        const key = formatDateKey(date);
        const daySchedules = sortSchedules(schedulesForDate(schedules, date));
        return (
          <DayCell
            key={key}
            date={date}
            schedules={daySchedules}
            isToday={isSameDay(date, today)}
            isCurrentMonth={date.getMonth() === currentMonth}
            ownerColors={ownerColors}
            onDateClick={onDateClick}
          />
        );
      })}
    </div>
  );
}
