import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const { playerId, answers } = body;
  // answers: { promptId: string; answer: string }[]

  const game = await prisma.game.findUnique({
    where: { code },
    include: { players: true },
  });

  if (!game) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (game.status !== "answering") {
    return NextResponse.json({ error: "Not in answering phase" }, { status: 400 });
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (!Array.isArray(answers) || answers.length !== game.promptIds.length) {
    return NextResponse.json(
      { error: `Expected ${game.promptIds.length} answers` },
      { status: 400 }
    );
  }

  for (const a of answers) {
    if (!game.promptIds.includes(a.promptId)) {
      return NextResponse.json({ error: "Invalid prompt id" }, { status: 400 });
    }
    if (!a.answer?.trim()) {
      return NextResponse.json({ error: "All answers must be non-empty" }, { status: 400 });
    }
  }

  // Idempotency: delete existing submissions for this player before re-creating
  await prisma.submission.deleteMany({ where: { gameId: game.id, playerId } });

  await prisma.submission.createMany({
    data: answers.map((a: { promptId: string; answer: string }) => ({
      gameId: game.id,
      playerId,
      promptId: a.promptId,
      answer: a.answer.trim(),
    })),
  });

  // Check if all players have submitted
  const totalExpected = game.players.length * game.promptIds.length;
  const totalSubmitted = await prisma.submission.count({
    where: { gameId: game.id },
  });

  if (totalSubmitted >= totalExpected) {
    // Shuffle all submissions and assign guessOrder
    const allSubmissions = await prisma.submission.findMany({
      where: { gameId: game.id },
    });
    const shuffled = allSubmissions.sort(() => Math.random() - 0.5);

    await prisma.$transaction([
      ...shuffled.map((sub, idx) =>
        prisma.submission.update({
          where: { id: sub.id },
          data: { guessOrder: idx },
        })
      ),
      prisma.game.update({
        where: { id: game.id },
        data: { status: "guessing", currentSubmissionIdx: 0 },
      }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
