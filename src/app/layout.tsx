import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SessionProvider from "@/components/SessionProvider";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Par amour du spin — Sim Racing Community",
  description: "La communauté française de Sim Racing. Calendrier des courses, événements et bien plus.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="fr">
      <body className="min-h-screen bg-brand-dark font-body antialiased">
        <SessionProvider session={session}>
          <Navbar />
          <main className="pt-16">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
