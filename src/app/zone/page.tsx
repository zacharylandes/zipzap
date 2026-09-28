import type { Metadata } from "next";
import { ZoneApp } from "@/components/zone-app";

export const metadata: Metadata = {
  title: "Zone · House Search",
  description: "Search loaded Texas parcels by address or parcel ID.",
};

export default function ZonePage() {
  return (
    <main>
      <ZoneApp />
    </main>
  );
}
