import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getClassXpTier, tiersFromDb } from "@/lib/class-tiers";

interface RouteParams {
  id: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { id } = await params;
  const race = await prisma.raceHistory.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      date: true,
      track: true,
      image: true,
      rawResults: true,
      createdAt: true,
    },
  });

  if (!race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  const parsed: Array<{ username?: string; carClass?: string }> = JSON.parse(race.rawResults);

  const licenseConfigs = await prisma.licenseConfig.findMany({ orderBy: { order: "asc" } });
  const classXpTiers = tiersFromDb(licenseConfigs);

  const usernames = parsed.map((r) => r.username).filter(Boolean) as string[];
  const classStats = await prisma.playerClassStats.findMany({
    where: { player: { username: { in: usernames } } },
    include: { player: { select: { username: true } } },
  });

  const tierMap = new Map<string, { name: string; color: string }>();
  for (const stat of classStats) {
    const tier = getClassXpTier(stat.classXp, classXpTiers);
    tierMap.set(`${stat.player.username.toLowerCase()}::${stat.carClass}`, { name: tier.name, color: tier.color });
  }

  const results = parsed.map((r) => ({
    ...r,
    classXpTier: r.username && r.carClass
      ? (tierMap.get(`${r.username.toLowerCase()}::${r.carClass}`) ?? null)
      : null,
  }));

  return NextResponse.json({ ...race, results });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.raceHistory.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
