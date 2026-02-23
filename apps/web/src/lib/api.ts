import type {
  Monitor,
  CreateMonitorBody,
  UpdateMonitorBody,
  NotificationChannel,
  CreateChannelBody,
  UpdateChannelBody,
  LogsResponse,
} from "@spidey/shared";

const BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// Monitors
export const api = {
  monitors: {
    list: () => request<Monitor[]>("/monitors"),
    get: (id: number) => request<Monitor>(`/monitors/${id}`),
    create: (body: CreateMonitorBody) =>
      request<Monitor>("/monitors", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: UpdateMonitorBody) =>
      request<Monitor>(`/monitors/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/monitors/${id}`, { method: "DELETE" }),
    trigger: (id: number) =>
      request<{ message: string }>(`/monitors/${id}/trigger`, {
        method: "POST",
      }),
    logs: (id: number, page = 1, pageSize = 20) =>
      request<LogsResponse>(
        `/monitors/${id}/logs?page=${page}&pageSize=${pageSize}`
      ),
  },
  channels: {
    create: (monitorId: number, body: CreateChannelBody) =>
      request<NotificationChannel>(`/monitors/${monitorId}/channels`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (monitorId: number, channelId: number, body: UpdateChannelBody) =>
      request<NotificationChannel>(
        `/monitors/${monitorId}/channels/${channelId}`,
        { method: "PUT", body: JSON.stringify(body) }
      ),
    delete: (monitorId: number, channelId: number) =>
      request<{ success: boolean }>(
        `/monitors/${monitorId}/channels/${channelId}`,
        { method: "DELETE" }
      ),
  },
};
