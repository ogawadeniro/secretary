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
