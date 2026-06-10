import type { Shareman } from "../types/group";

const BASE = "/api/v1/shares";

/** 自分が招待したシェアメン一覧 */
export async function fetchMySharemen(): Promise<Shareman[]> {
  const res = await fetch(BASE, { credentials: "include" });
  if (!res.ok) throw new Error("シェアメン一覧の取得に失敗しました");
  return res.json();
}

/** 自分が招待されたシェアメン一覧 */
export async function fetchIncomingSharemen(): Promise<Shareman[]> {
  const res = await fetch(`${BASE}/incoming`, { credentials: "include" });
  if (!res.ok) throw new Error("招待一覧の取得に失敗しました");
  return res.json();
}

/** 承諾済みシェアメンのユーザー名一覧 */
export async function fetchAcceptedUsernames(): Promise<string[]> {
  const res = await fetch(`${BASE}/accepted`, { credentials: "include" });
  if (!res.ok) throw new Error("シェアメン一覧の取得に失敗しました");
  return res.json();
}

/** シェアメン招待を作成 */
export async function inviteShareman(username: string): Promise<Shareman> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? "招待に失敗しました");
  }
  return res.json();
}

/** 招待を承諾 */
export async function acceptShareman(id: number): Promise<Shareman> {
  const res = await fetch(`${BASE}/${id}/accept`, {
    method: "PATCH",
    credentials: "include",
  });
  if (!res.ok) throw new Error("承諾に失敗しました");
  return res.json();
}

/** 招待を削除 */
export async function removeShareman(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("削除に失敗しました");
}
