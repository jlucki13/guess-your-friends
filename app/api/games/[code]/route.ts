import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");

  const game = await prisma.game.findUnique({ where: { code } });
  if (!game) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const players = await prisma.player.findMany({ where: { gameId: game.id } });
  const isHost = !!playerId && game.hostId === playerId;

  const base = {
    game: {
      id: game.id,
      code: game.code,
      status: game.status,
      hostId: game.hostId,
      currentSubmissionIdx: game.currentSubmissionIdx,
    },
    players: players.map((p) => ({ id: p.id, nickname: p.nickname, score: p.score })),
    isHost,
  };

  if (game.status === "answering") {
    const prompts = await prisma.prompt.findMany({
      where: { id: { in: game.promptIds } },
    });
    const mySubmissions = playerId
      ? await prisma.submission.findMany({
          where: { gameId: game.id, playerId },
          select: { promptId: true, answer: true },
        })
      : [];

    return NextResponse.json({ ...base, prompts, mySubmissions });
  }

  if (game.status === "guessing" || game.status === "finished") {
    const currentSub = await prisma.submission.findFirst({
      where: { gameId: game.id, guessOrder: game.currentSubmissionIdx },
      include: { prompt: true },
    });

    if (!currentSub && game.status === "guessing") {
      return NextResponse.json(base);
    }

    const totalGuessers = players.length - 1;

    if (!currentSub) {
      return NextResponse.json(base);
    }

    const guesses = await prisma.guess.findMany({
      where: { submissionId: currentSub.id },
    });

    const myGuess = playerId
      ? (guesses.find((g) => g.guesserId === playerId) ?? null)
      : null;

    const currentSubmission = {
      id: currentSub.id,
      answer: currentSub.answer,
      promptText: currentSub.prompt.text,
      totalGuessers,
      guessesIn: guesses.length,
      myGuess: myGuess ? { guessedPlayerId: myGuess.guessedPlayerId } : null,
      isMyAnswer: currentSub.playerId === playerId,
    };

    let roundResults = null;
    if (guesses.length === totalGuessers) {
      const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
      const guessDetails = guesses.map((g) => ({
        guesserNickname: playerMap[g.guesserId]?.nickname ?? "?",
        guessedNickname: playerMap[g.guessedPlayerId]?.nickname ?? "?",
        isCorrect: g.isCorrect,
      }));

      const deltaMap: Record<string, number> = {};
      for (const g of guesses) {
        if (g.isCorrect) {
          deltaMap[g.guesserId] = (deltaMap[g.guesserId] ?? 0) + 2;
        } else {
          deltaMap[currentSub.playerId] = (deltaMap[currentSub.playerId] ?? 0) + 1;
        }
      }
      const scoreDeltas = Object.entries(deltaMap).map(([pid, delta]) => ({
        playerId: pid,
        nickname: playerMap[pid]?.nickname ?? "?",
        delta,
      }));

      roundResults = {
        authorNickname: playerMap[currentSub.playerId]?.nickname ?? "?",
        answer: currentSub.answer,
        promptText: currentSub.prompt.text,
        guessDetails,
        scoreDeltas,
      };
    }

    return NextResponse.json({ ...base, currentSubmission, roundResults });
  }

  return NextResponse.json(base);
}
