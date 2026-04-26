import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types/next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Force l'URL de callback même derrière un proxy / IP — évite "redirect_uri OAuth2 non valide"
  ...(process.env.NEXTAUTH_URL
    ? { redirectProxyUrl: `${process.env.NEXTAUTH_URL}/api/auth` }
    : {}),
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
          const { fetchMemberRole } = await import("@/lib/discord-bot");
          token.role = await fetchMemberRole(discordProfile.id);
        } catch (error) {
          console.error(
            "[auth] Role fetch failed, defaulting to USER:",
            error
          );
          token.role = "USER";
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
