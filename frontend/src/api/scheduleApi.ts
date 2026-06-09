import { Schedule } from "../types/schedule";
import { get, post, patch, del } from "./client";

const BASE = "/schedules";

/** 全予定を取得 */
export async function fetchSchedules(): Promise<Schedule[]> {
  return get(BASE);
}

/** 予定を新規作成（updateTime はサーバー側で自動設定されるため省略） */
export async function createSchedule(s: Omit<Schedule, "updateTime">): Promise<Schedule> {
  return post(BASE, s);
}

/** 予定を部分更新 */
export async function updateSchedule(id: number, s: Partial<Schedule>): Promise<Schedule> {
  return patch(`${BASE}/${id}`, s);
}

/** 予定を削除 */
export async function deleteSchedule(id: number): Promise<void> {
  return del(`${BASE}/${id}`);
}
