import { Schedule } from "../types/schedule";
import DayCell from "./DayCell";
import { schedulesForDate, formatDateKey, isSameDay } from "../utils/dateUtils";

interface WeekRowProps {
  dates: Date[];
  schedules: Schedule[];
  currentMonth: number;
  ownerColors: Map<string, string>;
  onDateClick: (date: Date) => void;
}

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
        const daySchedules = schedulesForDate(schedules, date);
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
