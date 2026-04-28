import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const raceHistory = await prisma.raceHistory.findMany({
    orderBy: { date: "desc" },
    select: {
      id: true,
      title: true,
      date: true,
      track: true,
      image: true,
      createdAt: true,
    },
  });
  return NextResponse.json(raceHistory);
}
