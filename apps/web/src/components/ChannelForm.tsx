import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ChannelType } from "@spidey/shared";

const channelTypes: { value: ChannelType; label: string }[] = [
  { value: "desktop", label: "Desktop (macOS)" },
  { value: "email", label: "Email (SMTP)" },
  { value: "telegram", label: "Telegram" },
  { value: "slack", label: "Slack" },
  { value: "discord", label: "Discord" },
];

interface Props {
  monitorId: number;
  onDone: () => void;
}

export default function ChannelForm({ monitorId, onDone }: Props) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<ChannelType>("desktop");
  const [config, setConfig] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: () =>
      api.channels.create(monitorId, { type, config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors", monitorId] });
      setConfig({});
      onDone();
    },
  });

  function configFields(): { key: string; label: string; placeholder: string }[] {
    switch (type) {
      case "desktop":
        return [];
      case "email":
        return [
          { key: "smtpHost", label: "SMTP Host", placeholder: "smtp.gmail.com" },
          { key: "smtpPort", label: "SMTP Port", placeholder: "587" },
          { key: "smtpUser", label: "SMTP User", placeholder: "you@gmail.com" },
          { key: "smtpPass", label: "SMTP Password", placeholder: "app password" },
          { key: "from", label: "From", placeholder: "spidey@gmail.com" },
          { key: "to", label: "To", placeholder: "you@example.com" },
        ];
      case "telegram":
        return [
          { key: "botToken", label: "Bot Token", placeholder: "123456:ABC-DEF..." },
          { key: "chatId", label: "Chat ID", placeholder: "123456789" },
        ];
      case "slack":
        return [
          { key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/..." },
        ];
      case "discord":
        return [
          { key: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/..." },
        ];
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Channel Type
        </label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as ChannelType);
            setConfig({});
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-indigo-500 transition"
        >
          {channelTypes.map((ct) => (
            <option key={ct.value} value={ct.value}>
              {ct.label}
            </option>
          ))}
        </select>
      </div>

      {configFields().map((field) => (
        <div key={field.key} className="mb-3">
          <label className="block text-sm font-medium text-gray-400 mb-1">
            {field.label}
          </label>
          <input
            type={field.key.toLowerCase().includes("pass") ? "password" : "text"}
            value={config[field.key] ?? ""}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
            }
            placeholder={field.placeholder}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      ))}

      {createMutation.error && (
        <p className="text-red-400 text-sm mb-3">
          {createMutation.error.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {createMutation.isPending ? "Adding..." : "Add Channel"}
        </button>
        <button
          onClick={onDone}
          className="text-gray-400 hover:text-gray-200 text-sm px-3 py-2 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
