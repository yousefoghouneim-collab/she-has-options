"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const LINKS = [
  { href: "/", label: "Wardrobe" },
  { href: "/add", label: "Add" },
  { href: "/outfits", label: "Outfits" },
  { href: "/match", label: "Match Check" },
  { href: "/pack", label: "Pack" },
];

export default function Nav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b-2 border-ink bg-ecru/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4">
        <Link href={user ? "/" : "/login"} className="flex items-center gap-3">
          <span className="clip-corner-sm relative h-10 w-10 flex-shrink-0 overflow-hidden border-2 border-ink bg-crimson-soft">
            <Image src="/logo-mark.png" alt="" fill className="object-cover" priority />
          </span>
          <span className="font-display text-2xl leading-none text-ink">She Has Options</span>
        </Link>
        {user && (
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`border-b-2 pb-0.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
                    active
                      ? "border-crimson text-crimson"
                      : "border-transparent text-ink-soft hover:border-ink hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <span className="ml-2 text-xs text-ink-soft">@{user.username}</span>
            <button
              onClick={logout}
              className="border-b-2 border-transparent pb-0.5 text-xs font-semibold uppercase tracking-widest text-ink-soft hover:border-ink hover:text-ink"
            >
              Sign Out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
