export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
}

const BASE = "/api/v1/auth";

/** ログイン */
export async function loginApi(username: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("ユーザー名またはパスワードが違います");
    throw new Error("ログインに失敗しました");
  }
  return res.json();
}

/** ユーザー登録 */
export async function registerApi(
  username: string,
  password: string,
  displayName: string,
): Promise<AuthUser> {
  const res = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password, displayName }),
  });
  if (!res.ok) {
    if (res.status === 409) throw new Error("このユーザー名は既に使われています");
    throw new Error("登録に失敗しました");
  }
  return res.json();
}

/** 現在のユーザー情報を取得（ページリロード時など） */
export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${BASE}/me`, { credentials: "include" });
  if (!res.ok) {
    if (res.status === 401) return null;
    throw new Error("認証情報の取得に失敗しました");
  }
  return res.json();
}

/** ログアウト */
export async function logoutApi(): Promise<void> {
  await fetch(`${BASE}/logout`, {
    method: "POST",
    credentials: "include",
  });
}
