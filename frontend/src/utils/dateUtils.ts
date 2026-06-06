import { Schedule } from "../types/schedule";

/**
 * REST APIの日時文字列 (yyyy/MM/dd-HH:mm) をパース
 * @returns 日付、時、分 または null
 */
export function parseScheduleDate(
  str: string
): { date: Date; hour: number; minute: number } | null {
  const m = str.match(
    /^(\d{4})\/(\d{2})\/(\d{2})-(\d{2}):(\d{2})$/
  );
  if (!m) return null;
  return {
    date: new Date(+m[1], +m[2] - 1, +m[3]),
    hour: +m[4],
    minute: +m[5],
  };
}

/** 2つの日付が同じ日か判定 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 日付に日数を加算（マイナス可） */
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** 指定した日付を含む週の開始日を取得 */
export function getWeekStart(d: Date, firstDay: number = 0): Date {
  const day = d.getDay();
  const diff = (day - firstDay + 7) % 7;
  return addDays(d, -diff);
}

/** 日付をキー文字列 (yyyy-MM-dd) に変換 */
export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 日付の時刻をリセット（ローカルタイム基準で00:00:00に） */
export function normalizeDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Date → "yyyy-MM-dd" */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Date → "HH:mm" */
function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * 開始を変更したとき、終了 ≦ 開始 なら終了を開始+1時間に補正する
 */
export function adjustEndByStart(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
): { endDate: string; endTime: string } {
  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);

  if (end > start) {
    return { endDate, endTime };
  }

  const corrected = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    endDate: formatDate(corrected),
    endTime: formatTime(corrected),
  };
}

/**
 * 終了を変更したとき、終了 ≦ 開始 なら開始を終了-1時間に補正する
 */
export function adjustStartByEnd(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
): { startDate: string; startTime: string } {
  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);

  if (end > start) {
    return { startDate, startTime };
  }

  const corrected = new Date(end.getTime() - 60 * 60 * 1000);
  return {
    startDate: formatDate(corrected),
    startTime: formatTime(corrected),
  };
}

/** 日付をエポック日（ローカルタイム基準）に変換、時刻の影響を排除 */
export function toEpochDay(d: Date): number {
  return Math.floor(normalizeDate(d).getTime() / 86400000);
}

/**
 * スケジュールが指定日の範囲内か判定し、位置情報を返す
 * - 'single': その日のみ
 * - 'start':  複数日またぎの初日
 * - 'middle': 複数日またぎの中間日
 * - 'end':    複数日またぎの最終日
 */
export type SchedulePosition = "single" | "start" | "middle" | "end";

export function getSchedulePosition(schedule: Schedule, date: Date): SchedulePosition {
  const start = parseScheduleDate(schedule.startDatetime);
  const end = parseScheduleDate(schedule.endDatetime);
  if (!start || !end) return "single";

  const day = toEpochDay(date);
  const startDay = toEpochDay(start.date);
  const endDay = toEpochDay(end.date);

  if (startDay === endDay) return "single";
  if (day === startDay) return "start";
  if (day === endDay) return "end";
  return "middle";
}

/**
 * 複数日またぎ予定のタイトルを表示するか判定する
 * - その日が予定の開始日 → 表示
 * - その日が日曜（週の初め）で、予定が前週から継続中 → 表示
 * - 上記以外かつsingle以外 → 非表示
 */
export function shouldShowTitle(schedule: Schedule, date: Date): boolean {
  const start = parseScheduleDate(schedule.startDatetime);
  const end = parseScheduleDate(schedule.endDatetime);
  if (!start || !end) return true;

  const day = toEpochDay(date);
  const startDay = toEpochDay(start.date);
  const endDay = toEpochDay(end.date);

  // 同日のみの予定: 常に表示
  if (startDay === endDay) return true;

  // 予定の開始日: 表示
  if (day === startDay) return true;

  // 日曜（週の初め）で、予定が前週から継続中: 表示
  if (date.getDay() === 0 && day > startDay && day <= endDay) return true;

  return false;
}

/** 指定した日付に該当する予定をフィルタ（複数日またぎ対応） */
export function schedulesForDate(
  schedules: Schedule[],
  date: Date
): Schedule[] {
  const day = toEpochDay(date);
  return schedules.filter((s) => {
    const start = parseScheduleDate(s.startDatetime);
    const end = parseScheduleDate(s.endDatetime);
    if (!start || !end) return false;
    return day >= toEpochDay(start.date) && day <= toEpochDay(end.date);
  });
}

// ─── スロット計算（連続する複数日またぎ表示用） ───

/** 複数日またぎかどうか（開始日と終了日が異なる） */
export function isMultiDay(s: Schedule): boolean {
  return s.startDatetime.slice(0, 10) !== s.endDatetime.slice(0, 10);
}

export interface SlotInfo {
  schedule?: Schedule; // undefined = 空きスロット（プレースホルダー）
  slotIndex: number;   // グリッド内の行位置（0始まり）
}

export interface DaySlotResult {
  slots: SlotInfo[];
  overflowCount: number;
}

/** 2つの日付範囲が重なるか判定 */
export function rangesOverlap(
  start1: number, end1: number,
  start2: number, end2: number,
): boolean {
  return start1 <= end2 && end1 >= start2;
}

/** 最大表示スロット数 */
export const MAX_VISIBLE_SLOTS = 3;

/**
 * カレンダー表示範囲に登場する複数日またぎ予定のみを抽出し、開始日順に並べる
 */
export function filterMultiDayInRange(
  schedules: Schedule[],
  calendarStart: Date,
  calendarEnd: Date,
): Schedule[] {
  const calStartDay = toEpochDay(calendarStart);
  const calEndDay = toEpochDay(calendarEnd);
  const map = new Map<number, Schedule>();
  schedules.forEach((s) => {
    if (!isMultiDay(s) || s.id === null) return;
    const start = parseScheduleDate(s.startDatetime);
    const end = parseScheduleDate(s.endDatetime);
    if (!start || !end) return;
    const startDay = toEpochDay(start.date);
    const endDay = toEpochDay(end.date);
    if (rangesOverlap(startDay, endDay, calStartDay, calEndDay)) {
      map.set(s.id, s);
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    a.startDatetime.localeCompare(b.startDatetime),
  );
}

/**
 * 各日の表示スロットを計算する。
 *
 * 複数日またぎ予定 → グローバルランク（0,1,2,...）の固定スロット
 * 単日予定        → 複数日またぎスロットの後ろに詰める
 * 空きスロット    → プレースホルダーで埋める（可視位置を維持）
 */
export function computeDaySlots(
  dates: Date[],
  allSchedules: Schedule[],
  globalMultiDaySorted: Schedule[],
): Map<string, DaySlotResult> {
  const multiDayCount = globalMultiDaySorted.length;

  const result = new Map<string, DaySlotResult>();

  dates.forEach((date) => {
    const key = formatDateKey(date);
    const daySchedules = schedulesForDate(allSchedules, date);

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

    const slots: SlotInfo[] = [];

    // 複数日またぎスロット（空きはプレースホルダー）
    for (let i = 0; i < multiDayCount && slots.length < MAX_VISIBLE_SLOTS; i++) {
      const s = dayMultiMap.get(globalMultiDaySorted[i].id!);
      slots.push(s ? { schedule: s, slotIndex: i } : { slotIndex: i });
    }

    // 単日予定を残りスロットに
    for (const s of daySingle) {
      if (slots.length >= MAX_VISIBLE_SLOTS) break;
      slots.push({ schedule: s, slotIndex: slots.length });
    }

    const totalOnDay = dayMultiMap.size + daySingle.length;
    const nonPlaceholder = slots.filter((sl) => sl.schedule).length;
    const overflowCount = Math.max(0, totalOnDay - nonPlaceholder);

    result.set(key, { slots, overflowCount });
  });

  return result;
}
