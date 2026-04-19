import { REST, Routes } from "discord.js";
import type { Role } from "@/types/next-auth";
import { getGuildConfig } from "./config";

let restClient: REST | null = null;

function getRestClient(): REST {
  if (!restClient) {
    restClient = new REST({ version: "10" }).setToken(
      process.env.DISCORD_BOT_TOKEN!
    );
  }
  return restClient;
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
  if (!config) return "USER";

  const adminRoleId = config.adminRoleId;
  if (!adminRoleId) return "USER";

  const rest = getRestClient();

  const member = (await rest.get(
    Routes.guildMember(config.guildId, discordUserId)
  )) as GuildMember;

  return member.roles.includes(adminRoleId) ? "ADMIN" : "USER";
}

export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const rest = getRestClient();
  const roles = (await rest.get(Routes.guildRoles(guildId))) as DiscordRole[];
  return roles
    .filter((r) => r.name !== "@everyone")
    .sort((a, b) => b.position - a.position);
}
