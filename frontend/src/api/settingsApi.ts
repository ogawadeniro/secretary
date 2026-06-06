import type { UserSettings } from "../types/settings";

const BASE = "/api/v1/settings";
const FETCH_OPTIONS: RequestInit = { credentials: "include" as const };

/** 設定を取得（なければデフォルト値が返る） */
export async function fetchSettings(): Promise<UserSettings> {
  const res = await fetch(BASE, FETCH_OPTIONS);
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

/** 設定を保存 */
export async function saveSettings(s: Partial<UserSettings>): Promise<UserSettings> {
  const res = await fetch(BASE, {
    ...FETCH_OPTIONS,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
  });
  if (!res.ok) throw new Error("Failed to save settings");
  return res.json();
}

/** 設定をリセット（デフォルトに戻す） */
export async function resetSettings(): Promise<UserSettings> {
  const res = await fetch(BASE, {
    ...FETCH_OPTIONS,
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to reset settings");
  return res.json();
}
