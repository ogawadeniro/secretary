const API_BASE = "/api/v1";

async function request<T = void>(path: string, options?: {
  method?: string;
  body?: unknown;
}): Promise<T> {
  const { method, body } = options ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** GET リクエスト */
export async function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

/** POST リクエスト（JSON body） */
export async function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body });
}

/** PUT リクエスト（JSON body） */
export async function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body });
}

/** PATCH リクエスト（JSON body） */
export async function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body });
}

/** DELETE リクエスト */
export async function del<T = void>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
