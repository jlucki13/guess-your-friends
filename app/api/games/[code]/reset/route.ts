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
    return NextResponse.json({ error: "Only the host can reset" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.guess.deleteMany({ where: { gameId: game.id } }),
    prisma.submission.deleteMany({ where: { gameId: game.id } }),
    prisma.player.updateMany({
      where: { gameId: game.id },
      data: { score: 0 },
    }),
    prisma.game.update({
      where: { id: game.id },
      data: {
        status: "lobby",
        promptIds: [],
        currentSubmissionIdx: 0,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
