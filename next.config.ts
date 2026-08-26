import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["discord.js", "@discordjs/rest", "zlib-sync"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/avatars/**",
      },
      {
        protocol: "https",
        hostname: "static-cdn.jtvnw.net", // Twitch profile images
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Les affiches sont exposées sous /media/. En production Nginx sert ce
  // préfixe directement depuis MEDIA_DIR ; cette réécriture couvre le dev
  // et sert de repli quand la requête atteint Node.
  async rewrites() {
    return [{ source: "/media/:path*", destination: "/api/media/:path*" }];
  },
};

export default nextConfig;
