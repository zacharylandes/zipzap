"use client";

import { useEffect, useState, type ReactNode } from "react";

type PageHeroProps = {
  title: string;
  sub: string;
  compact?: boolean;
  actions?: ReactNode;
};

function splitTitle(title: string) {
  return title.split(/\s+/).map((word, index, words) => (
    <span key={`${word}-${index}`}>
      <span className="word" aria-hidden="true">
        <span style={{ ["--delay" as string]: `${index * 0.07}s` }}>{word}</span>
      </span>
      {index < words.length - 1 ? " " : null}
    </span>
  ));
}

export function PageHero({ title, sub, compact, actions }: PageHeroProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      setReady(true);
      return;
    }
    const id = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(id);
  }, [title]);

  return (
    <section className={`hs-hero${compact ? " hs-hero--compact" : ""}${ready ? " is-ready" : ""}`}>
      <div className="hs-hero__media" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.jpg" alt="" />
        <div className="hs-hero__overlay" />
      </div>
      <div className="hs-hero__inner">
        <h1 className="hs-hero__title" aria-label={title}>
          {splitTitle(title)}
        </h1>
        <p className="hs-hero__sub">{sub}</p>
        {actions ? <div className="hs-hero__actions">{actions}</div> : null}
      </div>
    </section>
  );
}
