import type { Role } from "@/types/next-auth";
import { getGuildConfig } from "./config";

const DISCORD_API = "https://discord.com/api/v10";

function botHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };
}

interface GuildMember {
  roles: string[];
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

export async function fetchMemberRole(discordUserId: string): Promise<Role> {
  const config = await getGuildConfig();
  if (!config?.adminRoleId) return "USER";

  const res = await fetch(
    `${DISCORD_API}/guilds/${config.guildId}/members/${discordUserId}`,
    { headers: botHeaders() }
  );
  if (!res.ok) return "USER";

  const member: GuildMember = await res.json();
  return member.roles.includes(config.adminRoleId) ? "ADMIN" : "USER";
}

export interface MemberAccess {
  role: Role;
  enduranceAccess: boolean;
}

// Un seul appel à l'API Discord pour dériver à la fois le rôle admin et
// l'accès à la section endurance (utilisé au login, dans le callback jwt()).
export async function fetchMemberAccess(discordUserId: string): Promise<MemberAccess> {
  const config = await getGuildConfig();
  if (!config) return { role: "USER", enduranceAccess: false };

  const res = await fetch(
    `${DISCORD_API}/guilds/${config.guildId}/members/${discordUserId}`,
    { headers: botHeaders() }
  );
  if (!res.ok) return { role: "USER", enduranceAccess: false };

  const member: GuildMember = await res.json();
  return {
    role: config.adminRoleId && member.roles.includes(config.adminRoleId) ? "ADMIN" : "USER",
    enduranceAccess: !!config.enduranceRoleId && member.roles.includes(config.enduranceRoleId),
  };
}

// Liste brute des rôles d'un membre — utilisé quand on a besoin de tester
// l'appartenance à un rôle qui n'est ni adminRoleId ni enduranceRoleId.
export async function fetchMemberRoles(discordUserId: string): Promise<string[]> {
  const config = await getGuildConfig();
  if (!config) return [];

  const res = await fetch(
    `${DISCORD_API}/guilds/${config.guildId}/members/${discordUserId}`,
    { headers: botHeaders() }
  );
  if (!res.ok) return [];

  const member: GuildMember = await res.json();
  return member.roles;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// fetch() avec ré-essai automatique sur 429 (rate limit Discord), en
// respectant le délai "retry_after" renvoyé par l'API plutôt qu'un backoff
// arbitraire. Nécessaire dès qu'on envoie plus de quelques requêtes d'affilée
// (ex: DM à tous les membres d'un rôle) — Discord bloque sinon la rafale.
async function discordFetch(url: string, init: RequestInit, maxRetries = 4): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429 || attempt >= maxRetries) return res;

    const body = await res.clone().json().catch(() => ({} as { retry_after?: number }));
    const retryAfterSec = typeof body.retry_after === "number" ? body.retry_after : 1;
    await sleep(retryAfterSec * 1000 + 100);
  }
}

// Ouvre (ou récupère) le canal DM d'un utilisateur puis y envoie un message.
// Échoue silencieusement en renvoyant false (ex: DMs fermés) plutôt que de
// faire échouer l'appelant — utile pour les envois en boucle sur un groupe.
export async function sendDirectMessage(discordUserId: string, content: string): Promise<boolean> {
  try {
    const dmRes = await discordFetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ recipient_id: discordUserId }),
    });
    if (!dmRes.ok) {
      const body = await dmRes.text().catch(() => "");
      console.warn(`[discord-bot] Impossible d'ouvrir le DM avec ${discordUserId}: ${dmRes.status} ${body}`);
      return false;
    }
    const channel: { id: string } = await dmRes.json();

    const msgRes = await discordFetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!msgRes.ok) {
      const body = await msgRes.text().catch(() => "");
      // 403 "no mutual guilds" ou DMs fermés = quasi toujours un souci côté
      // destinataire (paramètres de confidentialité Discord), pas le bot.
      console.warn(`[discord-bot] Échec d'envoi du DM à ${discordUserId}: ${msgRes.status} ${body}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[discord-bot] Erreur DM ${discordUserId}:`, error);
    return false;
  }
}

// Envoie un DM à une liste de destinataires en les espaçant dans le temps —
// contrairement à un Promise.all, ça évite de tous les tirer d'un coup et de
// se prendre le rate limit global de Discord (429) sur la moitié des envois.
export async function sendDirectMessagesPaced(
  discordUserIds: string[],
  content: string,
  delayMs = 350
): Promise<number> {
  let sent = 0;
  for (const id of discordUserIds) {
    if (await sendDirectMessage(id, content)) sent++;
    await sleep(delayMs);
  }
  return sent;
}

interface GuildMemberWithUser {
  user: { id: string };
  roles: string[];
}

// Liste tous les membres du serveur possédant un rôle donné, directement
// depuis Discord (pagination par tranches de 1000) — contrairement à une
// itération sur la table User, ça touche aussi les membres qui n'ont jamais
// mis les pieds sur le site. Nécessite l'intent privilégié "Server Members
// Intent" activé pour le bot (Discord Developer Portal → Bot).
export async function fetchGuildMemberIdsWithRole(roleId: string): Promise<string[]> {
  const config = await getGuildConfig();
  if (!config) return [];

  const ids: string[] = [];
  let after = "0";

  while (true) {
    const res = await discordFetch(
      `${DISCORD_API}/guilds/${config.guildId}/members?limit=1000&after=${after}`,
      { headers: botHeaders() }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // 401/403 ici = très souvent le "Server Members Intent" pas activé
      // pour le bot dans le Discord Developer Portal.
      console.warn(`[discord-bot] Échec de la récupération des membres du serveur: ${res.status} ${body}`);
      break;
    }

    const page: GuildMemberWithUser[] = await res.json();
    if (page.length === 0) break;

    for (const m of page) {
      if (m.roles.includes(roleId)) ids.push(m.user.id);
    }

    if (page.length < 1000) break;
    after = page[page.length - 1].user.id;
  }

  return ids;
}

export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: botHeaders(),
  });
  if (!res.ok) return [];

  const roles: DiscordRole[] = await res.json();
  return roles
    .filter((r) => r.name !== "@everyone")
    .sort((a, b) => b.position - a.position);
}
