"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");

  const [createNickname, setCreateNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinNickname, setJoinNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: createNickname }),
      });
      const text = await res.text();
      let data: Record<string, string> = {};
      try { data = JSON.parse(text); } catch { /* non-JSON response */ }
      if (!res.ok) {
        setError(data.error ?? `Server error ${res.status}`);
        return;
      }
      localStorage.setItem(`playerId:${data.code}`, data.playerId);
      router.push(`/room/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const code = joinCode.trim().toUpperCase();
    try {
      const res = await fetch(`/api/games/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: joinNickname }),
      });
      const text = await res.text();
      let data: Record<string, string> = {};
      try { data = JSON.parse(text); } catch { /* non-JSON response */ }
      if (!res.ok) {
        setError(data.error ?? `Server error ${res.status}`);
        return;
      }
      localStorage.setItem(`playerId:${code}`, data.playerId);
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-bold text-center mb-2">Guess Your Friends</h1>
        <p className="text-slate-400 text-center mb-8 text-sm">
          Answer prompts. Guess who said what.
        </p>

        <div className="flex rounded-xl overflow-hidden mb-6 border border-slate-700">
          <button
            onClick={() => { setTab("create"); setError(""); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "create"
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => { setTab("join"); setError(""); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "join"
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Join Room
          </button>
        </div>

        {tab === "create" ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Your nickname"
              value={createNickname}
              onChange={(e) => setCreateNickname(e.target.value)}
              maxLength={20}
              required
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
            <button
              type="submit"
              disabled={loading || !createNickname.trim()}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors"
            >
              {loading ? "Creating…" : "Create Room"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 uppercase tracking-widest font-mono focus:outline-none focus:border-violet-500"
            />
            <input
              type="text"
              placeholder="Your nickname"
              value={joinNickname}
              onChange={(e) => setJoinNickname(e.target.value)}
              maxLength={20}
              required
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
            <button
              type="submit"
              disabled={loading || !joinCode.trim() || !joinNickname.trim()}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors"
            >
              {loading ? "Joining…" : "Join Room"}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </main>
  );
}
