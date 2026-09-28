"use client";

import { Map, NavigationControl, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

const TEXAS_BOUNDS: [[number, number], [number, number]] = [
  [-106.65, 25.84],
  [-93.51, 36.5],
];

type Props = {
  selected: GeoJSON.Feature | null;
  parcels: GeoJSON.FeatureCollection | null;
  onSelect: (id: number) => void;
  onBbox: (bbox: string) => void;
};

export function ZoneMap({ selected, parcels, onSelect, onBbox }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const onSelectRef = useRef(onSelect);
  const onBboxRef = useRef(onBbox);
  onSelectRef.current = onSelect;
  onBboxRef.current = onBbox;

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    setWorkerUrl(`${window.location.origin}/maplibre-gl-worker.mjs`);
    const map = new Map({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      bounds: TEXAS_BOUNDS,
      fitBoundsOptions: { padding: 24 },
    });
    map.addControl(new NavigationControl(), "top-right");
    map.on("load", () => {
      map.addSource("parcels", { type: "geojson", data: emptyCollection() });
      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        paint: { "fill-color": "#0e0c21", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "parcels-line",
        type: "line",
        source: "parcels",
        paint: { "line-color": "#0e0c21", "line-width": 1.25 },
      });
      map.addSource("selected", { type: "geojson", data: emptyCollection() });
      map.addLayer({
        id: "selected-fill",
        type: "fill",
        source: "selected",
        paint: { "fill-color": "#0e0c21", "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: "selected-line",
        type: "line",
        source: "selected",
        paint: { "line-color": "#0e0c21", "line-width": 2.5 },
      });
    });
    map.on("moveend", () => {
      if (map.getZoom() < 14) return;
      const bounds = map.getBounds();
      onBboxRef.current(
        [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(","),
      );
    });
    map.on("click", "parcels-fill", (event) => {
      const id = Number(event.features?.[0]?.properties?.id);
      if (Number.isInteger(id) && id > 0) onSelectRef.current(id);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("parcels") as GeoJSONSource | undefined;
      source?.setData(parcels ?? emptyCollection());
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [parcels]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("selected") as GeoJSONSource | undefined;
      const data = selected ? { type: "FeatureCollection" as const, features: [selected] } : emptyCollection();
      source?.setData(data);
      if (!selected) return;
      const bounds = geometryBounds(selected.geometry);
      if (bounds) map.fitBounds(bounds, { padding: 80, maxZoom: 17 });
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [selected]);

  return <div ref={container} className="zone-map" />;
}

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function geometryBounds(geometry: GeoJSON.Geometry): [[number, number], [number, number]] | null {
  const coords: number[][] = [];
  collect(geometry, coords);
  if (coords.length === 0) return null;
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

function collect(geometry: GeoJSON.Geometry, coords: number[][]) {
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) coords.push(...ring);
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) coords.push(...ring);
    }
  }
}
