import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CheckMode } from "@spidey/shared";

export default function MonitorForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [keywords, setKeywords] = useState("");
  const [checkMode, setCheckMode] = useState<CheckMode>("change");

  const { data: monitor } = useQuery({
    queryKey: ["monitors", Number(id)],
    queryFn: () => api.monitors.get(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (monitor) {
      setName(monitor.name);
      setUrl(monitor.url);
      setIntervalMinutes(monitor.intervalMinutes);
      setKeywords(monitor.keywords ?? "");
      setCheckMode(monitor.checkMode);
    }
  }, [monitor]);

  const createMutation = useMutation({
    mutationFn: api.monitors.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      navigate("/");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof api.monitors.update>[1]) =>
      api.monitors.update(Number(id), body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      navigate("/");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = { name, url, intervalMinutes, keywords: keywords || undefined, checkMode };
    if (isEdit) {
      updateMutation.mutate(body);
    } else {
      createMutation.mutate(body);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? "Edit Monitor" : "Add Monitor"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Arsenal Tickets"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            URL
          </label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tickets.arsenal.com/..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Check every (minutes)
          </label>
          <input
            type="number"
            min={1}
            required
            value={intervalMinutes}
            onChange={(e) => setIntervalMinutes(Number(e.target.value))}
            className="w-32 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Check mode
          </label>
          <select
            value={checkMode}
            onChange={(e) => setCheckMode(e.target.value as CheckMode)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="change">Content change detection</option>
            <option value="keyword">Keyword detection</option>
            <option value="both">Both</option>
          </select>
        </div>

        {(checkMode === "keyword" || checkMode === "both") && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="available, buy now, book"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm">{error.message}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg transition"
          >
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Monitor"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-200 px-4 py-2 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
