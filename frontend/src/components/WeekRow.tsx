import { useMemo } from "react";
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

const MAX_VISIBLE = 3;

/** 複数日またぎかどうか */
function isMultiDay(s: Schedule): boolean {
  return s.startDatetime.slice(0, 10) !== s.endDatetime.slice(0, 10);
}

export interface SlotInfo {
  schedule?: Schedule; // undefined = 空きスロット（プレースホルダー）
  slotIndex: number;   // グリッド内の行位置（0始まり）
}

/**
 * 週に出現する全複数日またぎ予定に固定ランクを割り振り、
 * 各日の表示スロットを計算する。
 *
 * 複数日またぎ予定 → 週単位の固定ランク（0,1,2,...）
 * 単日予定        → 複数日またぎスロットの後ろに詰める
 * 空きスロット    → プレースホルダーで埋める（可視位置を維持）
 */
function computeWeekDaySlots(
  dates: Date[],
  allSchedules: Schedule[],
): Map<string, { slots: SlotInfo[]; overflowCount: number }> {
  // 今週に出現する全複数日またぎ予定（重複排除・開始日順）
  const multiDayMap = new Map<number, Schedule>();
  dates.forEach((date) => {
    schedulesForDate(allSchedules, date).forEach((s) => {
      if (isMultiDay(s) && s.id !== null) {
        multiDayMap.set(s.id, s);
      }
    });
  });
  const multiDaySorted = Array.from(multiDayMap.values()).sort((a, b) =>
    a.startDatetime.localeCompare(b.startDatetime),
  );
  const multiDayCount = multiDaySorted.length;

  const result = new Map<
    string,
    { slots: SlotInfo[]; overflowCount: number }
  >();

  dates.forEach((date) => {
    const key = formatDateKey(date);
    const daySchedules = schedulesForDate(allSchedules, date);

    // 当日の複数日またぎ予定と単日予定に分ける
    const dayMultiMap = new Map<number, Schedule>();
    const daySingle: Schedule[] = [];
    daySchedules.forEach((s) => {
      if (isMultiDay(s) && s.id !== null) {
        dayMultiMap.set(s.id, s);
      } else {
        daySingle.push(s);
      }
    });
    daySingle.sort((a, b) =>
      a.startDatetime.localeCompare(b.startDatetime),
    );

    // スロットを構築（複数日またぎ → 単日 の順）
    const slots: SlotInfo[] = [];

    // 複数日またぎスロット（空きはプレースホルダー）
    for (let i = 0; i < multiDayCount && slots.length < MAX_VISIBLE; i++) {
      const s = dayMultiMap.get(multiDaySorted[i].id!);
      slots.push(s ? { schedule: s, slotIndex: i } : { slotIndex: i });
    }

    // 単日予定を残りスロットに
    for (const s of daySingle) {
      if (slots.length >= MAX_VISIBLE) break;
      slots.push({ schedule: s, slotIndex: slots.length });
    }

    // overflow: 当日の全予定 - スロット中のプレースホルダーでないもの
    const totalOnDay = dayMultiMap.size + daySingle.length;
    const nonPlaceholder = slots.filter((sl) => sl.schedule).length;
    const overflowCount = Math.max(0, totalOnDay - nonPlaceholder);

    result.set(key, { slots, overflowCount });
  });

  return result;
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
  const weekDaySlots = useMemo(
    () => computeWeekDaySlots(dates, schedules),
    [dates, schedules],
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
