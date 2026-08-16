"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function LogoMark() {
  return (
    <svg className="hs-nav__logo-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.2 2.8 11h2.4v9.2h5.2v-6.1h3.2v6.1h5.2V11h2.4L12 3.2Z" />
    </svg>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const current = pathname.startsWith("/calc") ? "calc" : "search";
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let lastY = window.scrollY;
    let lastTime = performance.now();
    let isHidden = false;

    function onScroll() {
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const now = performance.now();
        const velocity = (y - lastY) / (now - lastTime || 1);
        if (velocity > 0.5 && y > 120 && !isHidden) {
          setHidden(true);
          isHidden = true;
        } else if ((velocity < -0.15 || y < 80) && isHidden) {
          setHidden(false);
          isHidden = false;
        }
        lastY = y;
        lastTime = now;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className={`hs-nav-wrap${hidden && !open ? " is-hidden" : ""}`}>
      <nav className={`hs-nav${open ? " is-open" : ""}`} aria-label="Primary">
        <div className="hs-nav__bar">
          <Link href="/" className="hs-nav__logo" aria-label="House Search home">
            <LogoMark />
            <span className="hs-nav__logo-word">House Search</span>
          </Link>
          <div className="hs-nav__links">
            <Link
              href="/"
              className="hs-nav__link"
              aria-current={current === "search" ? "page" : undefined}
            >
              Search
            </Link>
            <Link
              href="/calc"
              className="hs-nav__link"
              aria-current={current === "calc" ? "page" : undefined}
            >
              Sell vs buy
            </Link>
          </div>
          <div className="hs-nav__actions">
            <Link href="/#search" className="hs-btn hs-btn--primary">
              Get started
            </Link>
          </div>
        </div>
        <button
          className="hs-nav__menu-btn"
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="hs-nav__mobile">
          <Link href="/" aria-current={current === "search" ? "page" : undefined}>
            Search
          </Link>
          <Link href="/calc" aria-current={current === "calc" ? "page" : undefined}>
            Sell vs buy
          </Link>
          <Link href="/#search">Get started</Link>
        </div>
      </nav>
    </div>
  );
}
