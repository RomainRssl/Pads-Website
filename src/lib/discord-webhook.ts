import type { Event } from "@prisma/client";

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
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[webhook] DISCORD_WEBHOOK_URL not set, skipping notification");
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
