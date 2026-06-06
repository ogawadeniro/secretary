import { useMemo } from "react";
import { Schedule } from "../types/schedule";
import {
  formatDateKey,
  isSameDay,
  computeDaySlots,
  buildGlobalMultiDayInfo,
} from "../utils/dateUtils";
import DayCell from "./DayCell";
import type { HolidayMap } from "../utils/holidayUtils";

interface WeekRowProps {
  dates: Date[];
  schedules: Schedule[];
  currentMonth: number;
  ownerColors: Map<string, string>;
  holidays: HolidayMap;
  onDateClick: (date: Date) => void;
}

/** 1週間分（7日）の行を表示 */
export default function WeekRow({
  dates,
  schedules,
  currentMonth,
  ownerColors,
  holidays,
  onDateClick,
}: WeekRowProps) {
  const today = new Date();

  // 週に含まれる複数日またぎ予定のグローバルランクとアクティブ期間を事前計算
  const { globalMultiDaySorted, activeRange } = useMemo(
    () => buildGlobalMultiDayInfo(schedules),
    [schedules],
  );

  // 週の全日についてスロット配置を一括計算
  const weekDaySlots = useMemo(
    () => computeDaySlots(dates, schedules, globalMultiDaySorted, activeRange),
    [dates, schedules, globalMultiDaySorted, activeRange],
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
            holidayName={holidays.get(key) ?? null}
            onDateClick={onDateClick}
          />
        );
      })}
    </div>
  );
}
