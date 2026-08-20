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

// Ouvre (ou récupère) le canal DM d'un utilisateur puis y envoie un message.
// Échoue silencieusement en renvoyant false (ex: DMs fermés) plutôt que de
// faire échouer l'appelant — utile pour les envois en boucle sur un groupe.
export async function sendDirectMessage(discordUserId: string, content: string): Promise<boolean> {
  try {
    const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ recipient_id: discordUserId }),
    });
    if (!dmRes.ok) {
      console.warn(`[discord-bot] Impossible d'ouvrir le DM avec ${discordUserId}: ${dmRes.status}`);
      return false;
    }
    const channel: { id: string } = await dmRes.json();

    const msgRes = await fetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!msgRes.ok) {
      console.warn(`[discord-bot] Échec d'envoi du DM à ${discordUserId}: ${msgRes.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[discord-bot] Erreur DM ${discordUserId}:`, error);
    return false;
  }
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
    const res = await fetch(
      `${DISCORD_API}/guilds/${config.guildId}/members?limit=1000&after=${after}`,
      { headers: botHeaders() }
    );
    if (!res.ok) {
      console.warn(`[discord-bot] Échec de la récupération des membres du serveur: ${res.status}`);
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
