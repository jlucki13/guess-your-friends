"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

type Player = { id: string; nickname: string; score: number };

type CurrentSubmission = {
  id: string;
  answer: string;
  promptText: string;
  totalGuessers: number;
  guessesIn: number;
  myGuess: { guessedPlayerId: string } | null;
  isMyAnswer: boolean;
};

type RoundResult = {
  authorNickname: string;
  answer: string;
  promptText: string;
  guessDetails: { guesserNickname: string; guessedNickname: string; isCorrect: boolean }[];
  scoreDeltas: { playerId: string; nickname: string; delta: number }[];
};

type GameState = {
  game: { id: string; code: string; status: string; hostId: string | null; currentSubmissionIdx: number };
  players: Player[];
  isHost: boolean;
  prompts?: { id: string; text: string }[];
  mySubmissions?: { promptId: string; answer: string }[];
  currentSubmission?: CurrentSubmission;
  roundResults?: RoundResult | null;
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const base = "font-semibold rounded-xl py-3 px-6 transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full";
  const variants = {
    primary: "bg-violet-600 hover:bg-violet-500 text-white",
    ghost: "border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white",
    danger: "bg-red-700 hover:bg-red-600 text-white",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function LobbyScreen({
  state,
  onStart,
}: {
  state: GameState;
  onStart: () => Promise<void>;
}) {
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    setStarting(true);
    await onStart();
    setStarting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-slate-400 text-sm mb-1">Room code</p>
        <p className="text-4xl font-mono font-bold tracking-widest text-violet-400">
          {state.game.code}
        </p>
        <p className="text-slate-500 text-xs mt-2">Share this with your friends</p>
      </div>

      <Card>
        <h2 className="font-semibold text-slate-300 mb-3 text-sm uppercase tracking-wider">
          Players ({state.players.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {state.players.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-white">
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              {p.nickname}
              {p.id === state.game.hostId && (
                <span className="text-xs text-slate-500 ml-1">(host)</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {state.isHost ? (
        <Btn onClick={handleStart} disabled={starting || state.players.length < 2}>
          {starting ? "Starting…" : "Start Game"}
        </Btn>
      ) : (
        <p className="text-center text-slate-400 text-sm">Waiting for the host to start…</p>
      )}
    </div>
  );
}

function AnswerScreen({
  state,
  playerId,
  onSubmit,
}: {
  state: GameState;
  playerId: string;
  onSubmit: (answers: { promptId: string; answer: string }[]) => Promise<void>;
}) {
  const prompts = state.prompts ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const alreadySubmitted = (state.mySubmissions?.length ?? 0) >= prompts.length;

  if (alreadySubmitted) {
    return (
      <Card className="text-center">
        <p className="text-2xl mb-2">✓</p>
        <p className="font-semibold text-lg">Answers submitted!</p>
        <p className="text-slate-400 text-sm mt-1">Waiting for everyone else…</p>
      </Card>
    );
  }

  const current = prompts[step];

  async function handleNext() {
    if (step < prompts.length - 1) {
      setStep(step + 1);
    } else {
      setSubmitting(true);
      const answerArr = prompts.map((p) => ({ promptId: p.id, answer: answers[p.id] ?? "" }));
      await onSubmit(answerArr);
      setSubmitting(false);
    }
  }

  const currentAnswer = answers[current?.id] ?? "";
  const isLast = step === prompts.length - 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {prompts.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-violet-500" : "bg-slate-700"
            }`}
          />
        ))}
      </div>

      <Card>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          Question {step + 1} of {prompts.length}
        </p>
        <p className="text-lg font-semibold leading-snug">{current?.text}</p>
      </Card>

      <textarea
        value={currentAnswer}
        onChange={(e) =>
          setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))
        }
        placeholder="Your answer…"
        rows={4}
        maxLength={200}
        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
      />

      <Btn onClick={handleNext} disabled={!currentAnswer.trim() || submitting}>
        {submitting ? "Submitting…" : isLast ? "Submit Answers" : "Next →"}
      </Btn>
    </div>
  );
}

function GuessScreen({
  state,
  playerId,
  onGuess,
}: {
  state: GameState;
  playerId: string;
  onGuess: (submissionId: string, guessedPlayerId: string) => Promise<void>;
}) {
  const sub = state.currentSubmission;
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!sub) return null;

  if (sub.isMyAnswer) {
    return (
      <Card className="text-center">
        <p className="text-2xl mb-2">🤫</p>
        <p className="font-semibold text-lg">This is your answer!</p>
        <p className="text-slate-400 text-sm mt-1">
          {sub.guessesIn} / {sub.totalGuessers} friends have guessed…
        </p>
      </Card>
    );
  }

  if (sub.myGuess) {
    return (
      <Card className="text-center">
        <p className="text-2xl mb-2">✓</p>
        <p className="font-semibold text-lg">Guess locked in!</p>
        <p className="text-slate-400 text-sm mt-1">
          {sub.guessesIn} / {sub.totalGuessers} guessed
        </p>
      </Card>
    );
  }

  const otherPlayers = state.players.filter((p) => p.id !== playerId);

  async function handleSubmit() {
    if (!selected || !sub) return;
    setSubmitting(true);
    await onGuess(sub.id, selected);
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
          {sub.promptText}
        </p>
        <p className="text-xl font-semibold leading-snug">"{sub.answer}"</p>
      </Card>

      <div>
        <p className="text-sm text-slate-400 mb-3">Who wrote this?</p>
        <div className="flex flex-col gap-2">
          {otherPlayers.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border font-medium transition-colors ${
                selected === p.id
                  ? "border-violet-500 bg-violet-500/20 text-white"
                  : "border-slate-600 hover:border-slate-400 text-slate-300"
              }`}
            >
              {p.nickname}
            </button>
          ))}
        </div>
      </div>

      <Btn onClick={handleSubmit} disabled={!selected || submitting}>
        {submitting ? "Locking in…" : "Submit Guess"}
      </Btn>
    </div>
  );
}

function RoundResultsScreen({
  state,
  onNext,
}: {
  state: GameState;
  onNext: () => Promise<void>;
}) {
  const results = state.roundResults;
  const [advancing, setAdvancing] = useState(false);

  if (!results) return null;

  async function handleNext() {
    setAdvancing(true);
    await onNext();
    setAdvancing(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
          {results.promptText}
        </p>
        <p className="text-lg font-semibold mb-3">"{results.answer}"</p>
        <p className="text-sm text-slate-400">
          Written by <span className="text-violet-400 font-semibold">{results.authorNickname}</span>
        </p>
      </Card>

      <Card>
        <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">Guesses</h3>
        <ul className="flex flex-col gap-2">
          {results.guessDetails.map((g, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">
                <span className="text-white font-medium">{g.guesserNickname}</span> → {g.guessedNickname}
              </span>
              <span className={g.isCorrect ? "text-green-400 font-semibold" : "text-red-400"}>
                {g.isCorrect ? "+2" : "✗"}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {results.scoreDeltas.length > 0 && (
        <Card>
          <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">Points this round</h3>
          <ul className="flex flex-col gap-1">
            {results.scoreDeltas.map((d, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-slate-300">{d.nickname}</span>
                <span className="text-green-400 font-semibold">+{d.delta}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {state.isHost ? (
        <Btn onClick={handleNext} disabled={advancing}>
          {advancing ? "Loading…" : "Next Answer →"}
        </Btn>
      ) : (
        <p className="text-center text-slate-400 text-sm">Waiting for host to continue…</p>
      )}
    </div>
  );
}

function LeaderboardScreen({
  state,
  onPlayAgain,
}: {
  state: GameState;
  onPlayAgain: () => Promise<void>;
}) {
  const [resetting, setResetting] = useState(false);
  const sorted = [...state.players].sort((a, b) => b.score - a.score);

  async function handlePlayAgain() {
    setResetting(true);
    await onPlayAgain();
    setResetting(false);
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-center">Final Scores</h2>

      <div className="flex flex-col gap-3">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center justify-between px-5 py-4 rounded-2xl border ${
              i === 0
                ? "bg-yellow-500/10 border-yellow-500/40"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl w-7">{medals[i] ?? `${i + 1}.`}</span>
              <span className={`font-semibold ${i === 0 ? "text-yellow-300" : "text-white"}`}>
                {p.nickname}
              </span>
            </div>
            <span className="text-2xl font-bold text-violet-400">{p.score}</span>
          </div>
        ))}
      </div>

      {state.isHost ? (
        <Btn onClick={handlePlayAgain} disabled={resetting}>
          {resetting ? "Resetting…" : "Play Again"}
        </Btn>
      ) : (
        <p className="text-center text-slate-400 text-sm">Waiting for host to start a new game…</p>
      )}
    </div>
  );
}

// ─── Main room page ───────────────────────────────────────────────────────────

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load playerId from localStorage on mount
  useEffect(() => {
    const pid = localStorage.getItem(`playerId:${code}`);
    if (!pid) {
      router.replace("/");
      return;
    }
    setPlayerId(pid);
  }, [code, router]);

  // Poll game state
  useEffect(() => {
    if (!playerId) return;

    async function poll() {
      try {
        const res = await fetch(`/api/games/${code}?playerId=${playerId}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Room not found");
          return;
        }
        const data: GameState = await res.json();
        setState(data);
        setError(null);
      } catch {
        // silently retry on network error
      }
    }

    poll();
    intervalRef.current = setInterval(poll, 2500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playerId, code]);

  async function post(path: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/games/${code}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, ...body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <button onClick={() => router.push("/")} className="text-slate-400 underline text-sm">
          Back to home
        </button>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  const { status } = state.game;
  const sub = state.currentSubmission;
  const allGuessedIn = sub && sub.guessesIn >= sub.totalGuessers;

  function renderScreen() {
    if (!state) return null;

    if (status === "lobby") {
      return (
        <LobbyScreen
          state={state}
          onStart={() => post("/start", {})}
        />
      );
    }

    if (status === "answering") {
      return (
        <AnswerScreen
          state={state}
          playerId={playerId!}
          onSubmit={(answers) => post("/submit", { answers })}
        />
      );
    }

    if (status === "guessing") {
      if (allGuessedIn && state.roundResults) {
        return (
          <RoundResultsScreen
            state={state}
            onNext={() => post("/next", {})}
          />
        );
      }
      return (
        <GuessScreen
          state={state}
          playerId={playerId!}
          onGuess={(submissionId, guessedPlayerId) =>
            post("/guess", { submissionId, guessedPlayerId })
          }
        />
      );
    }

    if (status === "finished") {
      return (
        <LeaderboardScreen
          state={state}
          onPlayAgain={() => post("/reset", {})}
        />
      );
    }

    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-6 pt-10">
      <div className="w-full max-w-sm">
        {status !== "lobby" && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">
              {code}
            </p>
            <div className="flex gap-3">
              {state.players.map((p) => (
                <div key={p.id} className="text-center">
                  <p className="text-xs text-slate-400">{p.nickname.split(" ")[0]}</p>
                  <p className="text-sm font-bold text-violet-400">{p.score}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {renderScreen()}
      </div>
    </main>
  );
}
