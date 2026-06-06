import { Schedule } from "../types/schedule";

const BASE = "/api/v1/schedules";
const FETCH_OPTIONS: RequestInit = { credentials: "include" as const };

/** 全予定を取得 */
export async function fetchSchedules(): Promise<Schedule[]> {
  const res = await fetch(BASE, FETCH_OPTIONS);
  if (!res.ok) throw new Error("Failed to fetch schedules");
  return res.json();
}

/** 予定を新規作成（updateTime はサーバー側で自動設定されるため省略） */
export async function createSchedule(s: Omit<Schedule, "updateTime">): Promise<Schedule> {
  const res = await fetch(BASE, {
    ...FETCH_OPTIONS,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
  });
  if (!res.ok) throw new Error("Failed to create schedule");
  return res.json();
}

/** 予定を部分更新 */
export async function updateSchedule(
  id: number,
  s: Partial<Schedule>
): Promise<Schedule> {
  const res = await fetch(`${BASE}/${id}`, {
    ...FETCH_OPTIONS,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
  });
  if (!res.ok) throw new Error("Failed to update schedule");
  return res.json();
}

/** 予定を削除 */
export async function deleteSchedule(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    ...FETCH_OPTIONS,
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete schedule");
}
