import type { Metadata } from "next";
import { Rajdhani, Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import SessionProvider from "@/components/SessionProvider";

const rajdhani = Rajdhani({ subsets:["latin"], weight:["400","500","600","700"], variable:"--font-rajdhani" });
const inter    = Inter({ subsets:["latin"], weight:["400","500"], variable:"--font-inter" });

export const metadata: Metadata = {
  title: "Par amour du spin — Sim Racing Community",
  description: "La communauté française dédiée à la simulation de course.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="fr" className={`${rajdhani.variable} ${inter.variable}`}>
      <body className="bg-brand-navy text-brand-text antialiased font-body">
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
