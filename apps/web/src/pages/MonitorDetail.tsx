import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ChannelType, NotificationChannel } from "@spidey/shared";
import ChannelForm from "../components/ChannelForm";

const statusLabels: Record<string, { text: string; color: string }> = {
  ok: { text: "OK", color: "text-green-400" },
  changed: { text: "Changed", color: "text-amber-400" },
  error: { text: "Error", color: "text-red-400" },
  pending: { text: "Pending", color: "text-gray-400" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

export default function MonitorDetail() {
  const { id } = useParams();
  const monitorId = Number(id);
  const queryClient = useQueryClient();
  const [logsPage, setLogsPage] = useState(1);
  const [showChannelForm, setShowChannelForm] = useState(false);

  const { data: monitor, isLoading } = useQuery({
    queryKey: ["monitors", monitorId],
    queryFn: () => api.monitors.get(monitorId),
  });

  const { data: logsData } = useQuery({
    queryKey: ["logs", monitorId, logsPage],
    queryFn: () => api.monitors.logs(monitorId, logsPage),
    enabled: !!monitor,
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.monitors.trigger(monitorId),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["monitors", monitorId] });
        queryClient.invalidateQueries({ queryKey: ["logs", monitorId] });
      }, 3000);
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: (channelId: number) =>
      api.channels.delete(monitorId, channelId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["monitors", monitorId] }),
  });

  const toggleChannelMutation = useMutation({
    mutationFn: ({
      channelId,
      enabled,
    }: {
      channelId: number;
      enabled: boolean;
    }) => api.channels.update(monitorId, channelId, { enabled }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["monitors", monitorId] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-gray-500">Loading...</div>
    );
  }

  if (!monitor) {
    return (
      <div className="text-center py-20 text-gray-500">Monitor not found</div>
    );
  }

  const status = statusLabels[monitor.lastStatus ?? "pending"];
  const totalPages = logsData ? Math.ceil(logsData.total / logsData.pageSize) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {monitor.name}
            <span className={`text-sm font-normal ${status.color}`}>
              {status.text}
            </span>
          </h1>
          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-indigo-400 transition"
          >
            {monitor.url} ↗
          </a>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition"
          >
            {triggerMutation.isPending ? "Checking..." : "Check Now"}
          </button>
          <Link
            to={`/monitors/${monitorId}/edit`}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Interval", value: `${monitor.intervalMinutes}m` },
          { label: "Mode", value: monitor.checkMode },
          { label: "Active", value: monitor.isActive ? "Yes" : "Paused" },
          { label: "Last Check", value: formatDate(monitor.lastCheckedAt) },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-gray-900 border border-gray-800 rounded-lg p-3"
          >
            <div className="text-xs text-gray-500 mb-1">{item.label}</div>
            <div className="font-medium text-sm">{item.value}</div>
          </div>
        ))}
      </div>

      {monitor.keywords && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Keywords</div>
          <div className="flex flex-wrap gap-2">
            {monitor.keywords.split(",").map((kw) => (
              <span
                key={kw}
                className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded"
              >
                {kw.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notification Channels */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Notification Channels</h2>
          <button
            onClick={() => setShowChannelForm(!showChannelForm)}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition"
          >
            {showChannelForm ? "Cancel" : "+ Add Channel"}
          </button>
        </div>

        {showChannelForm && (
          <ChannelForm
            monitorId={monitorId}
            onDone={() => setShowChannelForm(false)}
          />
        )}

        {!monitor.channels?.length && !showChannelForm ? (
          <p className="text-sm text-gray-600">
            No notification channels configured.
          </p>
        ) : (
          <div className="space-y-2">
            {monitor.channels?.map((ch: NotificationChannel) => (
              <div
                key={ch.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded uppercase font-mono">
                    {ch.type}
                  </span>
                  <span className="text-sm text-gray-400">
                    {channelSummary(ch)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      toggleChannelMutation.mutate({
                        channelId: ch.id,
                        enabled: !ch.enabled,
                      })
                    }
                    className={`text-xs px-2 py-1 rounded transition ${
                      ch.enabled
                        ? "bg-green-900/40 text-green-400"
                        : "bg-gray-800 text-gray-600"
                    }`}
                  >
                    {ch.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this channel?")) {
                        deleteChannelMutation.mutate(ch.id);
                      }
                    }}
                    className="text-gray-600 hover:text-red-400 transition text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Check History */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Check History</h2>

        {!logsData?.logs.length ? (
          <p className="text-sm text-gray-600">No checks yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-2 pr-4 font-medium">Time</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Changed</th>
                    <th className="pb-2 pr-4 font-medium">Keywords</th>
                    <th className="pb-2 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logsData.logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-800/50 hover:bg-gray-900/50"
                    >
                      <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">
                        {formatDate(log.checkedAt)}
                      </td>
                      <td className="py-2 pr-4">
                        {log.statusCode ? (
                          <span
                            className={
                              log.statusCode < 400
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {log.statusCode}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {log.changed ? (
                          <span className="text-amber-400">Yes</span>
                        ) : (
                          <span className="text-gray-600">No</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {log.keywordsMatched?.length ? (
                          <span className="text-amber-400">
                            {log.keywordsMatched.join(", ")}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-2 text-red-400 text-xs max-w-[200px] truncate">
                        {log.error ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  disabled={logsPage <= 1}
                  onClick={() => setLogsPage((p) => p - 1)}
                  className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30 transition"
                >
                  ← Prev
                </button>
                <span className="text-xs text-gray-600">
                  Page {logsPage} of {totalPages}
                </span>
                <button
                  disabled={logsPage >= totalPages}
                  onClick={() => setLogsPage((p) => p + 1)}
                  className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30 transition"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function channelSummary(ch: NotificationChannel): string {
  const c = ch.config;
  switch (ch.type as ChannelType) {
    case "desktop":
      return "macOS native";
    case "email":
      return c.to ? `→ ${c.to}` : "Email";
    case "telegram":
      return c.chatId ? `Chat ${c.chatId}` : "Telegram";
    case "slack":
    case "discord":
      return c.webhookUrl ? "Webhook configured" : ch.type;
    default:
      return "";
  }
}
