import type { TodoItem } from "../types/todo";

const BASE = "/api/v1/todos";

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const text = await res.text().catch(() => "エラー");
        throw new Error(text);
    }
    return res.json();
}

export async function fetchTodos(): Promise<TodoItem[]> {
    const res = await fetch(BASE);
    return handleResponse<TodoItem[]>(res);
}

export async function createTodo(data: Partial<TodoItem>): Promise<TodoItem> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse<TodoItem>(res);
}

export async function updateTodo(id: number, data: Partial<TodoItem>): Promise<TodoItem> {
    const res = await fetch(`${BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse<TodoItem>(res);
}

export async function deleteTodo(id: number): Promise<void> {
    const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    if (!res.ok) {
        const text = await res.text().catch(() => "エラー");
        throw new Error(text);
    }
}

export async function addTodoMember(todoId: number, username: string): Promise<TodoItem> {
    const res = await fetch(`${BASE}/${todoId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
    });
    return handleResponse<TodoItem>(res);
}

export async function removeTodoMember(todoId: number, username: string): Promise<TodoItem> {
    const res = await fetch(`${BASE}/${todoId}/members/${username}`, {
        method: "DELETE",
    });
    return handleResponse<TodoItem>(res);
}
