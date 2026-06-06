import { useMemo } from "react";
import { Schedule } from "../types/schedule";
import {
  schedulesForDate,
  formatDateKey,
  isSameDay,
  filterMultiDayInRange,
  computeDaySlots,
} from "../utils/dateUtils";
import DayCell from "./DayCell";

interface WeekRowProps {
  dates: Date[];
  schedules: Schedule[];
  currentMonth: number;
  ownerColors: Map<string, string>;
  onDateClick: (date: Date) => void;
  calendarStart: Date;
  calendarEnd: Date;
}

/** 1週間分（7日）の行を表示 */
export default function WeekRow({
  dates,
  schedules,
  currentMonth,
  ownerColors,
  onDateClick,
  calendarStart,
  calendarEnd,
}: WeekRowProps) {
  const today = new Date();

  const globalMultiDaySorted = useMemo(
    () => filterMultiDayInRange(schedules, calendarStart, calendarEnd),
    [schedules, calendarStart, calendarEnd],
  );

  const weekDaySlots = useMemo(
    () => computeDaySlots(dates, schedules, globalMultiDaySorted),
    [dates, schedules, globalMultiDaySorted],
  );

  return (
    <div className="week-row">
      {dates.map((date) => {
        const key = formatDateKey(date);
        const { slots, overflowCount } = weekDaySlots.get(key)!;
        return (
          <DayCell
            key={key}
            date={date}
            slotInfos={slots}
            overflowCount={overflowCount}
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
