import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getGuildConfig, saveGuildConfig, invalidateConfigCache } from "@/lib/config";
import { fetchGuildRoles } from "@/lib/discord-bot";

// GET — liste les rôles du serveur + le rôle endurance actuellement configuré
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getGuildConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Setup non effectué. Passez par /setup au préalable." },
      { status: 400 }
    );
  }

  try {
    const roles = await fetchGuildRoles(config.guildId);
    return NextResponse.json({ roles, enduranceRoleId: config.enduranceRoleId });
  } catch (err) {
    console.error("[admin/endurance-role] Fetch failed:", err);
    return NextResponse.json(
      { error: "Impossible de récupérer les rôles Discord." },
      { status: 500 }
    );
  }
}

// POST — sauvegarde le rôle Discord donnant accès à la section endurance
export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getGuildConfig();
  if (!config) {
    return NextResponse.json({ error: "Configuration introuvable" }, { status: 400 });
  }

  const { enduranceRoleId } = await req.json();
  if (!enduranceRoleId || typeof enduranceRoleId !== "string") {
    return NextResponse.json({ error: "enduranceRoleId manquant" }, { status: 400 });
  }

  await saveGuildConfig({ ...config, enduranceRoleId });
  invalidateConfigCache();

  return NextResponse.json({ ok: true });
}
