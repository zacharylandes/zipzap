import type { MarketRow } from "@/markets/rank";

export type MarketsFile = {
  generatedAt: string;
  sources: {
    zhvi: string;
    zori: string;
    crime: string;
  };
  nationalCrimeRate: number;
  markets: MarketRow[];
};
