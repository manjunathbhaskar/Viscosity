import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import DealSwitcher from "@/components/deal-switcher";
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

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "The VC Brain",
  description:
    "Sourcing → Screening → Diligence → Decision. First founder signal to a confident $100K check decision in 24 hours.",
};

const NAV = [
  { href: "/dashboard", label: "decision-ready queue" },
  { href: "/dashboard/source", label: "sourcing" },
  { href: "/dashboard/memory", label: "memory" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body>
        <header>
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="h-[15px] w-[15px] rounded-full bg-[var(--charcoal)]" />
              <span className="text-[18px] font-semibold tracking-tight">
                the vc brain
              </span>
              <span className="label ml-1 hidden sm:inline">
                sourcing → screening → diligence → decision
              </span>
            </Link>
            <nav className="flex items-center gap-6">
              <DealSwitcher />
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="group flex items-center gap-1.5 text-[13px]">
                  <span className="text-[var(--accent)]">→</span>
                  <span className="text-[var(--ink)] transition-opacity group-hover:opacity-60">
                    {n.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
        <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 pb-8 pt-4">
          <p className="mono text-[11px] text-[var(--faint)]">v0.1.0 · VCBRAIN_MOCK ready</p>
          <p className="label">maschmeyer group track — hack-nation global ai hackathon</p>
        </footer>
      </body>
    </html>
  );
}
