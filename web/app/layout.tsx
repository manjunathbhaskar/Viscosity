import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import DealSwitcher from "@/components/deal-switcher";
import NavLinks from "@/components/nav-links";
import SystemRibbon from "@/components/system-ribbon";
import WaterMark from "@/components/water-mark";
import "./globals.css";

const sans = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const heading = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Viscosity — fluid conviction for VCs",
  description:
    "Fluid conviction for VCs. Pulse → Simulation → Diligence → Decision — from first founder signal to a confident check.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${heading.variable}`}>
      <body>
        <header>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
            <Link href="/" className="flex items-center gap-2.5">
              <WaterMark size={17} />
              <span className="serif text-[19px] font-semibold tracking-tight">
                viscosity
              </span>
              <span className="label ml-1 hidden lg:inline">fluid conviction for VCs</span>
            </Link>
            <div className="flex items-center gap-3">
              <SystemRibbon />
              <DealSwitcher />
              <NavLinks />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
        <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 pb-8 pt-4">
          <p className="mono text-[11px] text-[var(--faint)]">v0.2.0 · viscosity stack</p>
          <p className="label">private build · agentic swarm + tavily + elevenlabs</p>
        </footer>
      </body>
    </html>
  );
}
