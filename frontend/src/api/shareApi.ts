import type { CalendarShare } from "../types/share";

const BASE = "/api/v1/shares";
const FETCH_OPTIONS: RequestInit = { credentials: "include" as const };

/** 自分が誰と共有しているか一覧 */
export async function fetchMyShares(): Promise<CalendarShare[]> {
  const res = await fetch(BASE, FETCH_OPTIONS);
  if (!res.ok) throw new Error("Failed to fetch shares");
  return res.json();
}

/** 誰が自分と共有してくれているか一覧 */
export async function fetchIncomingShares(): Promise<CalendarShare[]> {
  const res = await fetch(`${BASE}/incoming`, FETCH_OPTIONS);
  if (!res.ok) throw new Error("Failed to fetch incoming shares");
  return res.json();
}

/** 共有設定を作成 */
export async function createShare(sharedWithUsername: string): Promise<CalendarShare> {
  const res = await fetch(BASE, {
    ...FETCH_OPTIONS,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sharedWithUsername }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create share");
  }
  return res.json();
}

/** 共有設定を削除 */
export async function deleteShare(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    ...FETCH_OPTIONS,
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete share");
}
