import type { Metadata } from "next";
import { SellVsBuyCalc } from "@/components/sell-vs-buy-calc";

export const metadata: Metadata = {
  title: "Sell vs buy · House Search",
  description: "Compare keeping your current home versus selling and buying a rental over 25 years.",
};

export default function CalcPage() {
  return (
    <main>
      <SellVsBuyCalc />
    </main>
  );
}
