import { NextResponse } from "next/server";
import { getGuildConfig, saveGuildConfig, invalidateConfigCache } from "@/lib/config";
import { fetchGuildRoles } from "@/lib/discord-bot";

// GET — liste les rôles du serveur pour le sélecteur
export async function GET() {
  const config = await getGuildConfig();

  if (!config) {
    return NextResponse.json(
      { error: "Setup non commencé. Veuillez d'abord passer par /setup." },
      { status: 400 }
    );
  }

  try {
    const roles = await fetchGuildRoles(config.guildId);
    return NextResponse.json({ roles });
  } catch (err) {
    console.error("[setup/roles] Fetch failed:", err);
    return NextResponse.json(
      { error: "Impossible de récupérer les rôles. Vérifiez que le bot est bien sur le serveur." },
      { status: 500 }
    );
  }
}

// POST — sauvegarde le rôle admin choisi
export async function POST(req: Request) {
  const config = await getGuildConfig();

  if (!config) {
    return NextResponse.json({ error: "Configuration introuvable" }, { status: 400 });
  }

  const { adminRoleId } = await req.json();

  if (!adminRoleId || typeof adminRoleId !== "string") {
    return NextResponse.json({ error: "adminRoleId manquant" }, { status: 400 });
  }

  await saveGuildConfig({ ...config, adminRoleId });
  invalidateConfigCache();

  return NextResponse.json({ ok: true });
}
