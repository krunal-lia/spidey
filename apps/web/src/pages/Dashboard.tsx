import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Monitor } from "@spidey/shared";

const statusColors: Record<string, string> = {
  ok: "bg-green-500",
  changed: "bg-amber-500",
  error: "bg-red-500",
  pending: "bg-gray-500",
};

function StatusDot({ status }: { status: string | null }) {
  const color = statusColors[status ?? "pending"] ?? "bg-gray-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: monitors, isLoading } = useQuery({
    queryKey: ["monitors"],
    queryFn: api.monitors.list,
  });

  const deleteMutation = useMutation({
    mutationFn: api.monitors.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
  });

  const triggerMutation = useMutation({
    mutationFn: api.monitors.trigger,
    onSuccess: () => {
      setTimeout(
        () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
        3000
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.monitors.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monitors"] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-gray-500">Loading...</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Monitors</h1>
        <Link
          to="/monitors/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + Add Monitor
        </Link>
      </div>

      {!monitors?.length ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No monitors yet</p>
          <p className="text-sm">
            Add your first monitor to start watching a website.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {monitors.map((m: Monitor) => (
            <Link
              key={m.id}
              to={`/monitors/${m.id}`}
              className="flex bg-gray-900 border border-gray-800 rounded-xl p-4 items-center gap-4 hover:border-gray-700 transition"
            >
              <StatusDot status={m.lastStatus} />

              <div className="flex-1 min-w-0">
                <span className="font-semibold hover:text-indigo-400 transition">
                  {m.name}
                </span>
                <p className="text-sm text-gray-500 truncate">{m.url}</p>
              </div>

              <div className="hidden sm:flex flex-col items-end text-xs text-gray-500 shrink-0">
                <span>Every {m.intervalMinutes}m</span>
                <span>{timeAgo(m.lastCheckedAt)}</span>
              </div>

              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div className="flex items-center gap-2 shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <button
                  onClick={() => triggerMutation.mutate(m.id)}
                  disabled={triggerMutation.isPending}
                  title="Trigger check now"
                  className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition"
                >
                  ▶
                </button>
                <button
                  onClick={() =>
                    toggleMutation.mutate({
                      id: m.id,
                      isActive: !m.isActive,
                    })
                  }
                  title={m.isActive ? "Pause" : "Resume"}
                  className={`p-2 rounded-lg transition ${
                    m.isActive
                      ? "text-green-400 hover:bg-gray-800"
                      : "text-gray-600 hover:bg-gray-800"
                  }`}
                >
                  {m.isActive ? "⏸" : "⏵"}
                </button>
                <button
                  onClick={() => navigate(`/monitors/${m.id}/edit`)}
                  className="p-2 text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${m.name}"?`)) {
                      deleteMutation.mutate(m.id);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
