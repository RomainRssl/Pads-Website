import { REST, Routes } from "discord.js";
import type { Role } from "@/types/next-auth";

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

export async function fetchMemberRole(discordUserId: string): Promise<Role> {
  const guildId = process.env.GUILD_ID!;
  const adminRoleId = process.env.ADMIN_ROLE_ID!;

  const rest = getRestClient();

  const member = (await rest.get(
    Routes.guildMember(guildId, discordUserId)
  )) as GuildMember;

  if (member.roles.includes(adminRoleId)) {
    return "ADMIN";
  }

  return "USER";
}
