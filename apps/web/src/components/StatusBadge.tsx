import type { MonitorStatus } from "@spidey/shared";

const styles: Record<string, string> = {
  ok: "bg-green-900/50 text-green-400 border-green-800",
  changed: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  error: "bg-red-900/50 text-red-400 border-red-800",
  pending: "bg-gray-800/50 text-gray-400 border-gray-700",
};

const labels: Record<string, string> = {
  ok: "OK",
  changed: "Changed",
  error: "Error",
  pending: "Pending",
};

export default function StatusBadge({ status }: { status: MonitorStatus | null }) {
  const key = status ?? "pending";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${styles[key]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          key === "ok"
            ? "bg-green-400"
            : key === "changed"
              ? "bg-yellow-400"
              : key === "error"
                ? "bg-red-400"
                : "bg-gray-500"
        }`}
      />
      {labels[key]}
    </span>
  );
}
