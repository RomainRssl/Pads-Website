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
