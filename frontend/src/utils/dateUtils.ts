import { Schedule } from "../types/schedule";

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

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function getWeekStart(d: Date, firstDay: number = 0): Date {
  const day = d.getDay();
  const diff = (day - firstDay + 7) % 7;
  return addDays(d, -diff);
}

export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function schedulesForDate(
  schedules: Schedule[],
  date: Date
): Schedule[] {
  return schedules.filter((s) => {
    const start = parseScheduleDate(s.startDatetime);
    const end = parseScheduleDate(s.endDatetime);
    if (!start || !end) return false;
    const d = new Date(date);
    const startD = start.date;
    const endD = end.date;
    return d >= startD && d <= endD;
  });
}
