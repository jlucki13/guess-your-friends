import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRoomCode } from "@/lib/roomCode";

export async function POST(req: Request) {
  const body = await req.json();
  const nickname = body?.nickname?.trim();

  if (!nickname) {
    return NextResponse.json({ error: "Nickname is required" }, { status: 400 });
  }

  let code = generateRoomCode();
  for (let i = 0; i < 10; i++) {
    const existing = await prisma.game.findUnique({ where: { code } });
    if (!existing) break;
    code = generateRoomCode();
  }

  const game = await prisma.game.create({ data: { code, promptIds: [] } });
  const player = await prisma.player.create({
    data: { gameId: game.id, nickname },
  });
  await prisma.game.update({
    where: { id: game.id },
    data: { hostId: player.id },
  });

  return NextResponse.json({ code: game.code, playerId: player.id });
}
