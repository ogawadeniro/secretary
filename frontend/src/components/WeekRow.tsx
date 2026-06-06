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
 * 各日の表示スロットを計算する。
 *
 * 複数日またぎ予定 → 全データでのグローバルランク（0,1,2,...）を割り当て
 * 単日予定        → 複数日またぎスロットの後ろに詰める
 * 空きスロット    → プレースホルダーで埋める（可視位置を維持）
 */
function computeDaySlots(
  dates: Date[],
  allSchedules: Schedule[],
  globalMultiDaySorted: Schedule[],
): Map<string, { slots: SlotInfo[]; overflowCount: number }> {
  const multiDayCount = globalMultiDaySorted.length;

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
      const s = dayMultiMap.get(globalMultiDaySorted[i].id!);
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

  // 全スケジュールから複数日またぎ予定を開始日順に並べたグローバルリスト
  const globalMultiDaySorted = useMemo(() => {
    const map = new Map<number, Schedule>();
    schedules.forEach((s) => {
      if (isMultiDay(s) && s.id !== null) {
        map.set(s.id, s);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.startDatetime.localeCompare(b.startDatetime),
    );
  }, [schedules]);

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
