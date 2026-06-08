export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  chipBgColor?: string;
  email?: string;
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
    if (res.status === 401) throw new Error("ユーザー名またはパスワードが違うよ");
    throw new Error("ログインに失敗したよ");
  }
  return res.json();
}

/** ユーザー登録 */
export async function registerApi(
  username: string,
  password: string,
  displayName: string,
  email: string,
): Promise<AuthUser> {
  const res = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password, displayName, email }),
  });
  if (!res.ok) {
    if (res.status === 409) throw new Error("このユーザー名はもう使われているよ");
    throw new Error("登録に失敗したよ");
  }
  return res.json();
}

/** 現在のユーザー情報を取得（ページリロード時など） */
export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${BASE}/me`, { credentials: "include" });
  if (!res.ok) {
    if (res.status === 401) return null;
    throw new Error("認証情報の取得に失敗したよ");
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

/** パスワード忘れ（リセットメール送信） */
export async function forgotPasswordApi(email: string): Promise<void> {
  const res = await fetch(`${BASE}/forgot-password?email=${encodeURIComponent(email)}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("メールの送信に失敗したよ");
}

/** パスワードリセット（トークン検証＋新しいパスワード設定） */
export async function resetPasswordApi(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${BASE}/reset-password?token=${encodeURIComponent(token)}&newPassword=${encodeURIComponent(newPassword)}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("リセットに失敗したよ。リンクが無効か期限切れだよ");
}

/** パスワード変更（ログイン中） */
export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${BASE}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) throw new Error("パスワードの変更に失敗したよ");
}
