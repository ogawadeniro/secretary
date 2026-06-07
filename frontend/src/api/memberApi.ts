import type { ScheduleMember } from "../types/schedule";

const BASE = "/api/v1/schedules";
const FETCH_OPTIONS: RequestInit = { credentials: "include" as const };

export async function getMembers(scheduleId: number): Promise<ScheduleMember[]> {
  const res = await fetch(`${BASE}/${scheduleId}/members`, FETCH_OPTIONS);
  if (!res.ok) throw new Error("Failed to fetch members");
  return res.json();
}

export async function addMember(scheduleId: number, username: string): Promise<ScheduleMember> {
  const res = await fetch(`${BASE}/${scheduleId}/members`, {
    ...FETCH_OPTIONS,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error("Failed to add member");
  return res.json();
}

export async function removeMember(scheduleId: number, username: string): Promise<void> {
  const res = await fetch(`${BASE}/${scheduleId}/members?username=${encodeURIComponent(username)}`, {
    ...FETCH_OPTIONS,
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to remove member");
}
