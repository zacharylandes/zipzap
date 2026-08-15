import type { SourceStatus } from "@/search/schema";

export function SourceStatusList({ sources }: { sources: SourceStatus[] }) {
  if (sources.length === 0) return null;

  return (
    <ul className="hs-sources" aria-label="Source status">
      {sources.map((source) => (
        <li key={source.sourceId} className={`hs-sources__item is-${source.status}`}>
          <strong>{source.sourceName}</strong>
          <span>
            {source.status}
            {source.count ? ` · ${source.count}` : ""}
            {source.message ? ` — ${source.message}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
