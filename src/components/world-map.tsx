"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useLocale, useNow, useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { formatWhen } from "@/lib/format";
import type { MapEvent } from "@/lib/public-data";
import type { MapEventKind } from "@/db/schema";

/*
 * Zoomable globe of recent events, in newsprint colours. Same map library and
 * free tiles as 360Atlas: MapLibre GL + OpenFreeMap (no key, no fees).
 * The library (about 1 MB) is only downloaded when the map scrolls into view.
 */

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const PAPER = "#f6f1e7";
const INK = "#1b1a17";
const SERIOUS = 4; // severity 4–5 is shown in red

// Zoom at which the globe is about `px` pixels across.
const zoomForDiameter = (px: number) => Math.max(0.2, Math.log2((px * Math.PI) / 512));

function paintNewsprint(map: MapLibreMap, locale: string) {
  const set = (id: string, prop: string, value: unknown) => {
    if (map.getLayer(id)) map.setPaintProperty(id, prop as never, value as never);
  };
  set("background", "background-color", PAPER);
  set("water", "fill-color", "#d9d1bd");
  for (const id of ["park", "landcover_wood", "landuse_residential"]) set(id, "fill-color", "#ece3d0");
  for (const id of ["landcover_ice_shelf", "landcover_glacier"]) set(id, "fill-color", "#fbf8f1");
  set("building", "fill-color", "#e3d8c2");
  set("boundary_2", "line-color", INK);
  set("boundary_2", "line-opacity", 0.6);
  set("boundary_3", "line-color", "#9a907c");
  set("boundary_disputed", "line-color", INK);

  for (const layer of map.getStyle().layers) {
    const source = "source-layer" in layer ? layer["source-layer"] : undefined;
    if (layer.type === "symbol") {
      set(layer.id, "text-color", "#3a352d");
      set(layer.id, "text-halo-color", PAPER);
      // Urdu readers get place names in Urdu where the map has them.
      if (locale === "ur" && source !== "transportation_name") {
        map.setLayoutProperty(layer.id, "text-field", [
          "coalesce",
          ["get", "name:ur"],
          ["get", "name:fa"],
          ["get", "name:ar"],
          ["get", "name_en"],
          ["get", "name"],
        ] as never);
      }
    } else if (layer.type === "line" && source === "transportation") {
      set(layer.id, "line-color", "#d6c9ae");
    } else if (layer.type === "line" && source === "waterway") {
      set(layer.id, "line-color", "#cfc6b1");
    }
  }
}

export function WorldMap({ events }: { events: MapEvent[] }) {
  const t = useTranslations("Map");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const locale = useLocale();
  const rtl = locale === "ur";

  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<HTMLButtonElement[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [kind, setKind] = useState<MapEventKind | "all">("all");
  const [status, setStatus] = useState<"waiting" | "ready" | "error">("waiting");

  const kinds = useMemo(() => [...new Set(events.map((e) => e.kind))], [events]);
  const worldView = () => {
    const el = box.current;
    const size = el ? Math.min(el.offsetWidth, el.offsetHeight) : 500;
    return { center: [25, 20] as [number, number], zoom: zoomForDiameter(size * 0.92) };
  };

  const choose = (i: number) => {
    setSelected(i);
    const e = events[i];
    mapRef.current?.flyTo({ center: [e.lng, e.lat], zoom: 6, speed: 1.1, essential: true });
  };
  // Markers are created once; this ref lets them call the latest `choose`.
  const chooseRef = useRef(choose);
  useEffect(() => {
    chooseRef.current = choose;
  });

  // Create the map when it first scrolls near the screen.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let map: MapLibreMap | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        const ml = await import("maplibre-gl");
        if (cancelled) return;
        // The bundler can't resolve MapLibre's worker, so it's served from public/.
        ml.setWorkerUrl("/maplibre-gl-worker.mjs");
        const help = {
          "CooperativeGesturesHandler.WindowsHelpText": t("helpWindows"),
          "CooperativeGesturesHandler.MacHelpText": t("helpMac"),
          "CooperativeGesturesHandler.MobileHelpText": t("helpMobile"),
          "NavigationControl.ZoomIn": t("zoomIn"),
          "NavigationControl.ZoomOut": t("zoomOut"),
          "NavigationControl.ResetBearing": t("resetBearing"),
          "FullscreenControl.Enter": t("fullscreen"),
          "FullscreenControl.Exit": t("exitFullscreen"),
        };
        map = new ml.Map({
          container: el,
          style: STYLE_URL,
          ...worldView(),
          // The page keeps scrolling normally; Ctrl+scroll or two fingers zoom the map.
          cooperativeGestures: true,
          attributionControl: { compact: true },
          locale: help,
        });
        mapRef.current = map;
        const corner = rtl ? "top-left" : "top-right";
        map.addControl(new ml.NavigationControl({ visualizePitch: true }), corner);
        map.addControl(new ml.FullscreenControl(), corner);
        map.on("style.load", () => {
          if (!map) return;
          map.setProjection({ type: "globe" });
          map.setSky({
            "sky-color": PAPER,
            "horizon-color": "#e4d9c2",
            "fog-color": PAPER,
            "sky-horizon-blend": 0.5,
            "horizon-fog-blend": 0.5,
            "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.7, 4, 0.3, 6, 0] as never,
          });
          paintNewsprint(map, locale);
        });
        map.on("load", () => setStatus("ready"));
        map.on("error", (ev) => console.error("Map error:", ev.error));

        markers.current = events.map((e, i) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "map-marker";
          button.textContent = format.number(i + 1);
          button.dataset.serious = String(e.severity >= SERIOUS);
          button.setAttribute("aria-label", `${i + 1}: ${e.title}`);
          button.setAttribute("aria-pressed", "false");
          button.addEventListener("click", (ev) => {
            ev.stopPropagation();
            chooseRef.current(i);
          });
          new ml.Marker({ element: button }).setLngLat([e.lng, e.lat]).addTo(map!);
          return button;
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus("error");
      }
    };

    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((x) => x.isIntersecting)) {
          watcher.disconnect();
          void start();
        }
      },
      { rootMargin: "300px" },
    );
    watcher.observe(el);

    return () => {
      cancelled = true;
      watcher.disconnect();
      map?.remove();
      mapRef.current = null;
      markers.current = [];
    };
    // The map is built once; filters and selection update the markers below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep markers in step with the filter and the selection.
  useEffect(() => {
    markers.current.forEach((m, i) => {
      m.hidden = kind !== "all" && events[i].kind !== kind;
      m.setAttribute("aria-pressed", String(i === selected));
    });
  }, [kind, selected, events, status]);

  const current = selected !== null ? events[selected] : null;
  const visible = (e: MapEvent) => kind === "all" || e.kind === kind;

  return (
    <div>
      {kinds.length > 1 && (
        <div role="group" aria-label={t("filterLabel")} className="kicker mb-3 flex flex-wrap gap-x-4 gap-y-1 !text-muted">
          {(["all", ...kinds] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className="cursor-pointer border-b-2 border-transparent py-1 hover:text-ink aria-pressed:border-red aria-pressed:text-ink"
            >
              {k === "all" ? t("all") : t(`kinds.${k}`)}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_290px]">
        <figure>
          <div className="relative border border-ink bg-paper">
            <div
              ref={box}
              role="region"
              aria-label={t("regionLabel")}
              className="gcw-map h-[clamp(320px,62vh,560px)] w-full"
            />
            {status !== "ready" && (
              <p className="meta pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
                {status === "error" ? t("error") : t("loading")}
              </p>
            )}
          </div>
          <figcaption className="meta mt-2 flex flex-wrap items-center justify-between gap-2">
            <span>{events.length ? t("seriousNote") : t("empty")}</span>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                mapRef.current?.flyTo({ ...worldView(), pitch: 0, bearing: 0, essential: true });
              }}
              className="cursor-pointer border border-ink px-2.5 py-1 font-semibold tracking-[0.08em] text-ink uppercase hover:bg-paper-2"
            >
              {t("worldView")}
            </button>
          </figcaption>
          <div aria-live="polite" className="mt-4 min-h-[3.5rem] border-s-[3px] border-red bg-paper-2 px-4 py-3">
            {current ? (
              <>
                <p className="kicker">
                  {format.number(selected! + 1)} · {current.conflictName ?? t(`kinds.${current.kind}`)} · {t(`kinds.${current.kind}`)}
                </p>
                <p className="mt-1">
                  <b>{current.title}</b>{" "}
                  <span className="text-muted italic">{formatWhen(format, current.occurredAt, now)}</span>
                </p>
                {current.storySlug && (
                  <Link href={`/stories/${current.storySlug}`} className="meta mt-1 inline-block font-semibold !text-red">
                    {t("readStory")} {rtl ? "←" : "→"}
                  </Link>
                )}
              </>
            ) : (
              <p className="text-ink-2">{events.length ? t("selectPrompt") : t("empty")}</p>
            )}
          </div>
        </figure>

        {events.length > 0 && (
          <div>
            <h3 className="section-label">{t("key")}</h3>
            <ol className="max-h-[560px] overflow-y-auto">
              {events.map((e, i) =>
                visible(e) ? (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => choose(i)}
                      aria-pressed={selected === i}
                      className="grid w-full cursor-pointer grid-cols-[28px_1fr] gap-2 border-b border-rule py-2 text-start hover:bg-paper-2 aria-pressed:bg-paper-2"
                    >
                      <span
                        className={`mt-0.5 h-[22px] w-[22px] rounded-full text-center font-sans text-[11px] leading-[22px] font-bold text-paper ${e.severity >= SERIOUS ? "bg-red" : "bg-ink"}`}
                      >
                        {format.number(i + 1)}
                      </span>
                      <span>
                        <span className="block text-[0.95rem] leading-snug">{e.title}</span>
                        <span className="meta">
                          {t(`kinds.${e.kind}`)} · {formatWhen(format, e.occurredAt, now)}
                        </span>
                      </span>
                    </button>
                  </li>
                ) : null,
              )}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
