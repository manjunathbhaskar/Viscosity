"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "deals", group: "pipeline" },
  { href: "/dashboard/source", label: "source", group: "pipeline" },
  { href: "/dashboard/discover", label: "discover", group: "intel" },
  { href: "/dashboard/digest", label: "digest", group: "intel" },
  { href: "/dashboard/memory", label: "memory", group: "system" },
  { href: "/dashboard/validate", label: "models", group: "system" },
];

function NavGroup({ items, pathname }: { items: typeof NAV; pathname: string }) {
  return (
    <>
      {items.map((n) => {
        const isActive = pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded-md px-2.5 py-1 text-[12.5px] transition-all hover:bg-[var(--card)] ${
              isActive
                ? "bg-[var(--card)] font-medium text-[var(--ink)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </>
  );
}

export default function NavLinks() {
  const pathname = usePathname();

  const pipeline = NAV.filter((n) => n.group === "pipeline");
  const intel = NAV.filter((n) => n.group === "intel");
  const system = NAV.filter((n) => n.group === "system");

  return (
    <nav className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
      <NavGroup items={pipeline} pathname={pathname} />
      <span className="mx-1.5 h-4 w-px bg-[var(--faint)] opacity-50" />
      <NavGroup items={intel} pathname={pathname} />
      <span className="mx-1.5 h-4 w-px bg-[var(--faint)] opacity-50" />
      <NavGroup items={system} pathname={pathname} />
    </nav>
  );
}
