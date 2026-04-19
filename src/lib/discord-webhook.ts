import type { Event } from "@prisma/client";
import { getGuildConfig } from "./config";
import type { CalculatedEntry } from "./rewards";

interface DiscordField {
  name: string;
  value: string;
  inline: boolean;
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields: DiscordField[];
  footer: { text: string };
  timestamp: string;
}

interface WebhookPayload {
  username: string;
  embeds: DiscordEmbed[];
}

export async function sendEventNotification(event: Event): Promise<void> {
  const config = await getGuildConfig();
  const webhookUrl = config?.webhookUrl || process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[webhook] No webhook URL configured, skipping notification");
    return;
  }

  const formattedDate = new Date(event.date).toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

  const embed: DiscordEmbed = {
    title: `🏁 Nouvelle course — ${event.title}`,
    description: event.description ?? "Aucune description fournie.",
    color: 0xe63946,
    fields: [
      { name: "🎮 Jeu", value: event.game, inline: true },
      { name: "🏎️ Voiture", value: event.car, inline: true },
      { name: "🗺️ Circuit", value: event.track, inline: true },
      { name: "📅 Date", value: formattedDate, inline: false },
    ],
    footer: { text: "Par amour du spin — Sim Racing Community" },
    timestamp: new Date(event.date).toISOString(),
  };

  const payload: WebhookPayload = {
    username: "Spin Bot",
    embeds: [embed],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Discord webhook failed: ${response.status} ${response.statusText}`
    );
  }
}

export interface RaceResultSummary {
  durationMin: number;
  totalPlayers: number;
  updatedPlayers: number;
  top3: Array<CalculatedEntry & { foundInDb: boolean }>;
  biggestXpGain: CalculatedEntry & { foundInDb: boolean };
}

export async function sendRaceResultsNotification(
  summary: RaceResultSummary
): Promise<void> {
  const config = await getGuildConfig();
  const webhookUrl = config?.webhookUrl || process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[webhook] No webhook URL configured, skipping notification");
    return;
  }

  const MEDALS = ["🥇", "🥈", "🥉"];

  const top3Fields = summary.top3.map((p, i) => ({
    name: `${MEDALS[i] ?? `#${p.position}`} ${p.username}`,
    value: `+${p.xpGained} XP · +${p.moneyGained} 💰${p.isClean ? " · ✨ Propre" : ""}`,
    inline: false,
  }));

  const embed: DiscordEmbed = {
    title: "🏁 Résultats traités !",
    description: `Les statistiques ont été mises à jour pour la course de **${summary.durationMin} minutes**.`,
    color: 0xe63946,
    fields: [
      {
        name: "📊 Résumé",
        value: `**${summary.updatedPlayers}** / ${summary.totalPlayers} joueurs mis à jour`,
        inline: false,
      },
      ...top3Fields,
      {
        name: "⚡ Plus gros gain XP",
        value: `**${summary.biggestXpGain.username}** — +${summary.biggestXpGain.xpGained} XP`,
        inline: false,
      },
    ],
    footer: { text: "Par amour du spin — Sim Racing Community" },
    timestamp: new Date().toISOString(),
  };

  const payload: WebhookPayload = { username: "Spin Bot", embeds: [embed] };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Discord webhook failed: ${response.status} ${response.statusText}`
    );
  }
}
