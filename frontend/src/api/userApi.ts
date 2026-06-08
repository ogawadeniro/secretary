import type { AuthUser } from "./authApi";

const API_BASE = "/api/v1";

/** ユーザー名または表示名で部分一致検索 */
export async function searchUsers(query: string): Promise<AuthUser[]> {
  const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("ユーザー検索に失敗したよ");
  return res.json();
}
