import { prisma } from "@/lib/prisma";
import EventList from "@/components/events/EventList";
import { auth } from "@/auth";
import { signIn } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-dark">
        {/* Racing grid background */}
        <div
          className="absolute inset-0 bg-racing-grid"
          style={{ backgroundSize: "40px 40px" }}
        />
        {/* Red gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-red/5 via-transparent to-brand-dark" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
              Communauté Sim Racing
            </div>

            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Par amour
              <br />
              du{" "}
              <span className="text-brand-red relative">
                spin
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-red" />
              </span>
            </h1>

            <p className="text-brand-muted text-lg sm:text-xl leading-relaxed mb-8 max-w-xl">
              La communauté française dédiée à la simulation de course. Rejoignez-nous pour des courses organisées, des championnats et du fun sur circuit.
            </p>

            {!session && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Buttons */}
                <div className="flex flex-col gap-3">
                  <form
                    action={async () => {
                      "use server";
                      await signIn("discord");
                    }}
                  >
                    <button
                      type="submit"
                      className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-brand-discord hover:bg-brand-discord/80 text-white font-semibold text-lg transition-colors shadow-lg"
                    >
                      <DiscordIcon />
                      Se connecter avec Discord
                    </button>
                  </form>

                  <a
                    href="https://discord.gg/AmMRGSbaV"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-xl border border-brand-discord/50 hover:border-brand-discord hover:bg-brand-discord/10 text-brand-discord font-semibold text-lg transition-colors"
                  >
                    <DiscordIcon />
                    Rejoindre le serveur Discord
                  </a>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white p-3 rounded-xl shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/qr-discord.png"
                      alt="QR Code Discord"
                      width={120}
                      height={120}
                    />
                  </div>
                  <p className="text-brand-muted text-xs">Scanner pour rejoindre</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <EventList events={events} />
      </section>
    </>
  );
}

function DiscordIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.892 19.892 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
