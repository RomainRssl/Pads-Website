import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types/next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Obligatoire derrière nginx : Auth.js utilise le header Host transmis par le proxy
  trustHost: true,
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization:
        "https://discord.com/api/oauth2/authorize?response_type=code&scope=identify+email+guilds",
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "discord" && profile) {
        const discordProfile = profile as { id: string };
        token.discordId = discordProfile.id;

        try {
          const { fetchMemberAccess } = await import("@/lib/discord-bot");
          const access = await fetchMemberAccess(discordProfile.id);
          token.role = access.role;
          token.enduranceAccess = access.enduranceAccess;
        } catch (error) {
          console.error(
            "[auth] Role fetch failed, defaulting to USER:",
            error
          );
          token.role = "USER";
          token.enduranceAccess = false;
        }

        if (token.sub) {
          await prisma.user.update({
            where: { id: token.sub },
            data: {
              discordId: discordProfile.id,
              role: (token.role as string) ?? "USER",
            },
          });
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = ((token.role as Role) ?? "USER");
        session.user.discordId = (token.discordId as string) ?? "";
        session.user.enduranceAccess = (token.enduranceAccess as boolean) ?? false;
        session.user.id = token.sub!;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
});
