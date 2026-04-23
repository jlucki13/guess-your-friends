import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const { playerId } = body;

  const game = await prisma.game.findUnique({ where: { code } });

  if (!game) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (game.hostId !== playerId) {
    return NextResponse.json({ error: "Only the host can advance" }, { status: 403 });
  }
  if (game.status !== "guessing") {
    return NextResponse.json({ error: "Not in guessing phase" }, { status: 400 });
  }

  const totalSubmissions = await prisma.submission.count({
    where: { gameId: game.id },
  });

  const nextIdx = game.currentSubmissionIdx + 1;
  const isLast = nextIdx >= totalSubmissions;

  await prisma.game.update({
    where: { id: game.id },
    data: {
      currentSubmissionIdx: nextIdx,
      status: isLast ? "finished" : "guessing",
    },
  });

  return NextResponse.json({ ok: true, finished: isLast });
}
