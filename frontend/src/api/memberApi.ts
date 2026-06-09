import type { ScheduleMember } from "../types/schedule";
import { get, post, del } from "./client";

const BASE = "/schedules";

/** 予定のメンバー一覧を取得 */
export async function getMembers(scheduleId: number): Promise<ScheduleMember[]> {
  return get(`${BASE}/${scheduleId}/members`);
}

/** メンバーを追加 */
export async function addMember(scheduleId: number, username: string): Promise<ScheduleMember> {
  return post(`${BASE}/${scheduleId}/members`, { username });
}

/** メンバーを削除 */
export async function removeMember(scheduleId: number, username: string): Promise<void> {
  return del(`${BASE}/${scheduleId}/members?username=${encodeURIComponent(username)}`);
}
