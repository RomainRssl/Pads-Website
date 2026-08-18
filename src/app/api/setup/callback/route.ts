import { NextResponse } from "next/server";
import { saveGuildConfig } from "@/lib/config";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  guild?: { id: string; name: string };
  webhook?: { url: string; channel_id: string; guild_id: string };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/setup?error=${error ?? "missing_code"}`, req.url)
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/setup/callback`;

  // Échanger le code contre un token Discord
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.DISCORD_CLIENT_ID}:${process.env.DISCORD_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[setup/callback] Token exchange failed:", err);
    return NextResponse.redirect(new URL("/setup?error=token_exchange", req.url));
  }

  const tokenData = (await tokenRes.json()) as DiscordTokenResponse;

  // Discord retourne guild.id et webhook.url dans la réponse pour ces scopes
  const guildId = tokenData.guild?.id ?? tokenData.webhook?.guild_id;
  const webhookUrl = tokenData.webhook?.url;

  if (!guildId || !webhookUrl) {
    console.error("[setup/callback] Missing guild or webhook in token response:", tokenData);
    return NextResponse.redirect(
      new URL("/setup?error=missing_guild_or_webhook", req.url)
    );
  }

  // Sauvegarde partielle — adminRoleId sera défini à l'étape suivante
  await saveGuildConfig({ guildId, webhookUrl, adminRoleId: null, enduranceRoleId: null });

  return NextResponse.redirect(new URL("/setup/roles", req.url));
}
