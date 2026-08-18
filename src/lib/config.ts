import { prisma } from "./prisma";

export interface GuildConfig {
  guildId: string;
  webhookUrl: string;
  adminRoleId: string | null;
  enduranceRoleId: string | null;
}

// In-memory cache — invalidated after setup
let cache: GuildConfig | null = null;

export async function getGuildConfig(): Promise<GuildConfig | null> {
  if (cache) return cache;

  const row = await prisma.guildConfig.findUnique({ where: { id: "singleton" } });

  if (row) {
    cache = {
      guildId: row.guildId,
      webhookUrl: row.webhookUrl,
      adminRoleId: row.adminRoleId,
      // Rétro-compatible : une config déjà en place (setup fait avant l'ajout de
      // l'endurance) peut ne pas avoir ce champ en base — on retombe sur l'env.
      enduranceRoleId: row.enduranceRoleId ?? process.env.ENDURANCE_ROLE_ID ?? null,
    };
    return cache;
  }

  // Fallback to environment variables (backward-compatible)
  if (process.env.GUILD_ID) {
    return {
      guildId: process.env.GUILD_ID,
      webhookUrl: process.env.DISCORD_WEBHOOK_URL ?? "",
      adminRoleId: process.env.ADMIN_ROLE_ID ?? null,
      enduranceRoleId: process.env.ENDURANCE_ROLE_ID ?? null,
    };
  }

  return null;
}

export async function saveGuildConfig(data: GuildConfig): Promise<void> {
  await prisma.guildConfig.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  cache = data;
}

export function invalidateConfigCache(): void {
  cache = null;
}

export async function isSetupComplete(): Promise<boolean> {
  const config = await getGuildConfig();
  return config !== null && config.adminRoleId !== null;
}
