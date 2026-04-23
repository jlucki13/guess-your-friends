import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await req.json();
  const nickname = body?.nickname?.trim();

  if (!nickname) {
    return NextResponse.json({ error: "Nickname is required" }, { status: 400 });
  }

  const game = await prisma.game.findUnique({
    where: { code },
    include: { players: true },
  });

  if (!game) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (game.status !== "lobby") {
    return NextResponse.json({ error: "Game already started" }, { status: 400 });
  }

  const taken = game.players.some(
    (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
  );
  if (taken) {
    return NextResponse.json({ error: "Nickname already taken" }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: { gameId: game.id, nickname },
  });

  return NextResponse.json({ playerId: player.id });
}
