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
    <div style={{ display:"flex", flexDirection:"row", height:"calc(100vh - 164px)", marginTop:"-50px", overflow:"hidden", background:"#0A0A0F" }}>

      {/* GAUCHE */}
      <div style={{ width:"50%", flexShrink:0, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:"0 48px" }}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-sm font-medium" style={{ marginBottom:24 }}>
          <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
          Communauté Sim Racing
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:20 }}>
          <img src="/LOGO.png" alt="PADS" style={{ width:100, height:100, objectFit:"contain", flexShrink:0 }} />
          <h1 className="font-heading" style={{ fontSize:"clamp(2.5rem, 4vw, 3.5rem)", fontWeight:700, color:"white", lineHeight:1.1, margin:0 }}>
            Par amour<br />du{" "}
            <span className="text-brand-orange" style={{ position:"relative" }}>
              spin !
              <span style={{ position:"absolute", bottom:-4, left:0, right:0, height:2, backgroundColor:"#F4A261" }} />
            </span>
          </h1>
        </div>

        <p className="text-brand-muted" style={{ fontSize:"1rem", lineHeight:1.7, marginBottom:28, maxWidth:400 }}>
          La communauté française dédiée à la simulation de course. Rejoignez-nous pour des courses organisées, des championnats et du fun sur circuit.
        </p>

        {!session && (
          <div style={{ display:"flex", alignItems:"center", gap:24 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <form action={async () => { "use server"; await signIn("discord"); }}>
                <button type="submit" className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-brand-discord hover:bg-brand-discord/80 text-white font-semibold transition-colors" style={{ border:"none", cursor:"pointer" }}>
                  <DiscordIcon />
                  Se connecter avec Discord
                </button>
              </form>
              <a href="https://discord.gg/AmMRGSbaV" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-6 py-3 rounded-xl border border-brand-discord/50 hover:border-brand-discord hover:bg-brand-discord/10 text-brand-discord font-semibold transition-colors" style={{ textDecoration:"none" }}>
                <DiscordIcon />
                Rejoindre le serveur Discord
              </a>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{ background:"white", padding:10, borderRadius:12 }}>
                <img src="/IMG/qr-discord.png" alt="QR Code Discord" width={90} height={90} />
              </div>
              <p className="text-brand-muted" style={{ fontSize:"0.7rem", margin:0 }}>Scanner pour rejoindre</p>
            </div>
          </div>
        )}
      </div>

      {/* DROITE */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", overflowY:"auto", padding:"32px 48px" }}>
        <EventList events={events} />
      </div>

    </div>
  );
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 71 55" fill="currentColor">
      <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.4a.2.2 0 0 0-.2.1 40.8 40.8 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.6 37.6 0 0 0 25.4.5a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.6 4.9a.2.2 0 0 0-.1.1C1.5 18.1-1 31 .3 43.6a.2.2 0 0 0 .1.2 58.8 58.8 0 0 0 17.7 8.9.2.2 0 0 0 .3-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4l1.1-.9a.2.2 0 0 1 .2 0c11.6 5.3 24.1 5.3 35.5 0a.2.2 0 0 1 .2 0l1.1.9a.2.2 0 0 1 0 .4 36.1 36.1 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47 47 0 0 0 3.6 5.9.2.2 0 0 0 .3.1 58.6 58.6 0 0 0 17.8-8.9.2.2 0 0 0 .1-.2c1.5-15-2.5-28-10.5-39.6a.2.2 0 0 0-.1-.1ZM23.7 36c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Z" />
    </svg>
  );
}
