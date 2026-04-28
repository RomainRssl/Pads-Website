import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

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

  return NextResponse.json({
    ...race,
    results: JSON.parse(race.rawResults),
  });
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
