import type { AuthUser } from "./authApi";
import { get } from "./client";

/** ユーザー名または表示名で部分一致検索 */
export async function searchUsers(query: string): Promise<AuthUser[]> {
  return get(`/users/search?q=${encodeURIComponent(query)}`);
}
