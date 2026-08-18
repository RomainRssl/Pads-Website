import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || (!session.user.enduranceAccess && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const endurances = await prisma.endurance.findMany({
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(endurances);
}
