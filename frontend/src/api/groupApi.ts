import type { Group, GroupMember } from "../types/group";

const BASE = "/api/v1/groups";

/** 自分のグループ一覧 */
export async function fetchGroups(): Promise<Group[]> {
  const res = await fetch(BASE, { credentials: "include" });
  if (!res.ok) throw new Error("グループ一覧の取得に失敗しました");
  return res.json();
}

/** グループ作成 */
export async function createGroup(name: string, iconData: string): Promise<Group> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, iconData }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? "グループの作成に失敗しました");
  }
  return res.json();
}

/** グループ更新 */
export async function updateGroup(id: number, name: string, iconData?: string): Promise<Group> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, iconData }),
  });
  if (!res.ok) throw new Error("グループの更新に失敗しました");
  return res.json();
}

/** グループ削除 */
export async function deleteGroup(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("グループの削除に失敗しました");
}

/** グループメンバー一覧 */
export async function fetchGroupMembers(groupId: number): Promise<GroupMember[]> {
  const res = await fetch(`${BASE}/${groupId}/members`, { credentials: "include" });
  if (!res.ok) throw new Error("メンバー一覧の取得に失敗しました");
  return res.json();
}

/** グループ招待一覧 */
export async function fetchGroupInvitations(): Promise<Group[]> {
  const res = await fetch(`${BASE}/invitations`, { credentials: "include" });
  if (!res.ok) throw new Error("招待一覧の取得に失敗しました");
  return res.json();
}

/** グループ招待を承諾 */
export async function acceptGroupInvitation(groupId: number): Promise<GroupMember> {
  const res = await fetch(`${BASE}/${groupId}/accept`, {
    method: "PATCH",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? "招待の承諾に失敗しました");
  }
  return res.json();
}

/** グループメンバー追加 */
export async function addGroupMember(groupId: number, username: string): Promise<GroupMember> {
  const res = await fetch(`${BASE}/${groupId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? "メンバーの追加に失敗しました");
  }
  return res.json();
}

/** グループメンバー削除 */
export async function removeGroupMember(groupId: number, username: string): Promise<void> {
  const res = await fetch(`${BASE}/${groupId}/members?username=${encodeURIComponent(username)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("メンバーの削除に失敗しました");
}
