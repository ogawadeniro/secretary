import type { UserSettings } from "../types/settings";
import { get, put, del } from "./client";

const BASE = "/api/v1/settings";

/** 設定を取得（なければデフォルト値が返る） */
export async function fetchSettings(): Promise<UserSettings> {
  return get(BASE);
}

/** 設定を保存 */
export async function saveSettings(s: Partial<UserSettings>): Promise<UserSettings> {
  return put(BASE, s);
}

/** 設定をリセット（デフォルトに戻す） */
export async function resetSettings(): Promise<UserSettings> {
  return del<UserSettings>(BASE);
}
