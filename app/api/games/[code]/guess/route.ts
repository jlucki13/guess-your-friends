import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const { playerId, submissionId, guessedPlayerId } = body;

  const game = await prisma.game.findUnique({
    where: { code },
    include: { players: true },
  });

  if (!game) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (game.status !== "guessing") {
    return NextResponse.json({ error: "Not in guessing phase" }, { status: 400 });
  }

  const guesser = game.players.find((p) => p.id === playerId);
  if (!guesser) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });
  if (!submission || submission.gameId !== game.id) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (submission.playerId === playerId) {
    return NextResponse.json({ error: "Cannot guess your own answer" }, { status: 400 });
  }

  const guessedPlayer = game.players.find((p) => p.id === guessedPlayerId);
  if (!guessedPlayer) {
    return NextResponse.json({ error: "Guessed player not found" }, { status: 404 });
  }

  const isCorrect = guessedPlayerId === submission.playerId;

  // Idempotency: overwrite existing guess from this player for this submission
  const existing = await prisma.guess.findFirst({
    where: { submissionId, guesserId: playerId },
  });

  if (existing) {
    await prisma.guess.update({
      where: { id: existing.id },
      data: { guessedPlayerId, isCorrect },
    });
  } else {
    await prisma.guess.create({
      data: { gameId: game.id, submissionId, guesserId: playerId, guessedPlayerId, isCorrect },
    });
  }

  // Check if all non-author players have guessed
  const totalGuessers = game.players.length - 1;
  const allGuesses = await prisma.guess.findMany({ where: { submissionId } });

  if (allGuesses.length >= totalGuessers) {
    // Apply score deltas
    const deltaMap: Record<string, number> = {};
    for (const g of allGuesses) {
      if (g.isCorrect) {
        deltaMap[g.guesserId] = (deltaMap[g.guesserId] ?? 0) + 2;
      } else {
        deltaMap[submission.playerId] = (deltaMap[submission.playerId] ?? 0) + 1;
      }
    }

    await prisma.$transaction(
      Object.entries(deltaMap).map(([pid, delta]) =>
        prisma.player.update({
          where: { id: pid },
          data: { score: { increment: delta } },
        })
      )
    );
  }

  return NextResponse.json({ ok: true, isCorrect });
}
