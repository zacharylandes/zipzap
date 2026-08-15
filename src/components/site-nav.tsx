"use client";

import Link from "next/link";

type SiteNavProps = {
  current: "search" | "calc";
};

export function SiteNav({ current }: SiteNavProps) {
  return (
    <nav className="hs-site-nav" aria-label="Primary">
      <Link href="/" aria-current={current === "search" ? "page" : undefined}>
        Search
      </Link>
      <Link href="/calc" aria-current={current === "calc" ? "page" : undefined}>
        Sell vs buy
      </Link>
    </nav>
  );
}
