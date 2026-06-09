import type { CalendarShare } from "../types/share";
import { get, post, del } from "./client";

const BASE = "/api/v1/shares";

/** 自分が誰と共有しているか一覧 */
export async function fetchMyShares(): Promise<CalendarShare[]> {
  return get(BASE);
}

/** 誰が自分と共有してくれているか一覧 */
export async function fetchIncomingShares(): Promise<CalendarShare[]> {
  return get(`${BASE}/incoming`);
}

/** 共有設定を作成 */
export async function createShare(sharedWithUsername: string): Promise<CalendarShare> {
  return post(BASE, { sharedWithUsername });
}

/** 共有設定を削除 */
export async function deleteShare(id: number): Promise<void> {
  return del(`${BASE}/${id}`);
}
