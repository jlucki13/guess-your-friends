import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const { playerId } = body;

  const game = await prisma.game.findUnique({
    where: { code },
    include: { players: true },
  });

  if (!game) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (game.hostId !== playerId) {
    return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
  }
  if (game.status !== "lobby") {
    return NextResponse.json({ error: "Game already started" }, { status: 400 });
  }
  if (game.players.length < 2) {
    return NextResponse.json({ error: "Need at least 2 players" }, { status: 400 });
  }

  const allPrompts = await prisma.prompt.findMany();
  if (allPrompts.length < 3) {
    return NextResponse.json({ error: "Not enough prompts in the database" }, { status: 500 });
  }

  const shuffled = allPrompts.sort(() => Math.random() - 0.5).slice(0, 3);

  await prisma.game.update({
    where: { id: game.id },
    data: { status: "answering", promptIds: shuffled.map((p) => p.id) },
  });

  return NextResponse.json({ ok: true });
}
