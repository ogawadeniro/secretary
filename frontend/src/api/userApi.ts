import type { AuthUser } from "./authApi";

const BASE = "/api/v1/users";
const FETCH_OPTIONS: RequestInit = { credentials: "include" as const };

/** ユーザー名で部分一致検索（共有相手追加用） */
export async function searchUsers(q: string): Promise<AuthUser[]> {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`, FETCH_OPTIONS);
  if (!res.ok) throw new Error("Failed to search users");
  return res.json();
}
