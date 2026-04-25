import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
    username,
    discordUsername,
    discordId,
    teamId,
    reputation,
    xp,
    money,
    licensePoints,
    totalRaces,
    finishedRaces,
    cleanRaces,
  } = body;

  // Username uniqueness check
  if (username !== undefined) {
    const trimmed = username.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Le pseudo ne peut pas être vide." }, { status: 400 });
    }
    const existing = await prisma.player.findUnique({ where: { username: trimmed } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: `Le pseudo "${trimmed}" est déjà utilisé.` }, { status: 409 });
    }
  }

  // Validate numeric stats
  const safeInt = (val: unknown, min = 0, max = Infinity): number | undefined => {
    if (val === undefined || val === null) return undefined;
    const n = Math.round(Number(val));
    if (isNaN(n)) return undefined;
    return Math.max(min, Math.min(max, n));
  };

  const player = await prisma.player.update({
    where: { id },
    data: {
      ...(username !== undefined        && { username: username.trim() }),
      ...(discordUsername !== undefined && { discordUsername: discordUsername?.trim() || null }),
      discordId: discordId?.trim() || null,
      teamId: teamId || null,
      ...(reputation   !== undefined && { reputation:   safeInt(reputation,   0, 100) }),
      ...(xp           !== undefined && { xp:           safeInt(xp,           0) }),
      ...(money        !== undefined && { money:        safeInt(money,        0) }),
      ...(licensePoints !== undefined && { licensePoints: safeInt(licensePoints, 0) }),
      ...(totalRaces   !== undefined && { totalRaces:   safeInt(totalRaces,   0) }),
      ...(finishedRaces !== undefined && { finishedRaces: safeInt(finishedRaces, 0) }),
      ...(cleanRaces   !== undefined && { cleanRaces:   safeInt(cleanRaces,   0) }),
    },
    include: { team: { select: { id: true, name: true } } },
  });

  return NextResponse.json(player);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.player.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
