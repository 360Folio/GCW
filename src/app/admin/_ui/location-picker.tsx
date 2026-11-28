"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { input } from "./ui";

/*
 * Click the map (or type the numbers) to set a place. Fills the `lat` and
 * `lng` fields of the surrounding form. Same free map tiles as the public site.
 */
export function LocationPicker({ lat, lng, optional = false }: { lat: number | null; lng: number | null; optional?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [pos, setPos] = useState({ lat: lat?.toString() ?? "", lng: lng?.toString() ?? "" });
  const [mapError, setMapError] = useState(false);

  const place = (la: number, ln: number, fly = false) => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.setLngLat([ln, la]).addTo(map);
    if (fly) map.flyTo({ center: [ln, la], zoom: Math.max(map.getZoom(), 4) });
  };
  const placeRef = useRef(place);
  useEffect(() => {
    placeRef.current = place;
  });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let map: MapLibreMap | null = null;
    let cancelled = false;
    (async () => {
      try {
        const ml = await import("maplibre-gl");
        if (cancelled) return;
        ml.setWorkerUrl("/maplibre-gl-worker.mjs");
        map = new ml.Map({
          container: el,
          style: "https://tiles.openfreemap.org/styles/positron",
          center: lng !== null && lat !== null ? [lng, lat] : [25, 20],
          zoom: lat !== null ? 4 : 1,
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;
        markerRef.current = new ml.Marker({ color: "#a8261b" });
        if (lat !== null && lng !== null) markerRef.current.setLngLat([lng, lat]).addTo(map);
        map.on("click", (e) => {
          const la = Math.round(e.lngLat.lat * 10_000) / 10_000;
          const ln = Math.round(e.lngLat.wrap().lng * 10_000) / 10_000;
          setPos({ lat: String(la), lng: String(ln) });
          placeRef.current(la, ln);
        });
        map.on("error", () => setMapError(true));
      } catch {
        setMapError(true);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // The map is created once; later changes come from clicks and typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typed = (key: "lat" | "lng", value: string) => {
    const next = { ...pos, [key]: value };
    setPos(next);
    const la = Number(next.lat);
    const ln = Number(next.lng);
    if (next.lat && next.lng && Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) place(la, ln, true);
  };

  return (
    <div className="mt-1">
      <div ref={box} className="h-72 w-full overflow-hidden rounded-md border border-neutral-300 bg-neutral-100" aria-label="Map: click to choose the place" role="application" />
      {mapError ? <p className="mt-1 text-xs text-red-700">The map didn’t load fully. You can still type the numbers.</p> : null}
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="block text-sm">
          Latitude
          <input name="lat" inputMode="decimal" required={!optional} value={pos.lat} onChange={(e) => typed("lat", e.target.value)} className={input} placeholder="15.5" />
        </label>
        <label className="block text-sm">
          Longitude
          <input name="lng" inputMode="decimal" required={!optional} value={pos.lng} onChange={(e) => typed("lng", e.target.value)} className={input} placeholder="32.5" />
        </label>
      </div>
      <p className="mt-1 text-xs text-neutral-500">Click the map to set the place, or type the numbers.</p>
    </div>
  );
}
