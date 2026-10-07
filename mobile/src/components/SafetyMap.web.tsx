import React, { useEffect, useRef, useCallback } from "react";
import { groupMapPins } from "../mapClusters";
import { C } from "./ui";
import type { MapProps } from "./SafetyMap";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
export default function SafetyMap({
  latitude,
  longitude,
  radius = 1500,
  pins,
  height = 330,
  onSelect,
  onInspect,
  zoom = 15,
  preview = false,
}: MapProps) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layers = useRef<LayerGroup | null>(null);
  const select = useRef(onSelect);
  const inspect = useRef(onInspect);
  const latest = useRef({ latitude, longitude, radius, pins, zoom });
  useEffect(() => {
    select.current = onSelect;
    inspect.current = onInspect;
    latest.current = { latitude, longitude, radius, pins, zoom };
  }, [onSelect, onInspect, latitude, longitude, radius, pins, zoom]);
  const draw = useCallback(
    (L: typeof import("leaflet"), value: typeof latest.current) => {
      const group = layers.current;
      if (!group) return;
      group.clearLayers();
      if (value.radius)
        L.circle([value.latitude, value.longitude], {
          radius: value.radius,
          color: C.blue,
          weight: 1,
          fillOpacity: 0.06,
        }).addTo(group);
      const clusters =
        inspect.current || preview
          ? groupMapPins(value.pins, map.current?.getZoom() ?? value.zoom)
          : value.pins.map((pin) => ({
              id: pin.id,
              latitude: pin.latitude,
              longitude: pin.longitude,
              pins: [pin],
            }));
      for (const cluster of clusters) {
        const p = cluster.pins[0];
        const color = cluster.pins.some((pin) => pin.color === C.red)
          ? C.red
          : cluster.pins.some((pin) => pin.color === C.blue)
            ? C.blue
            : p.color || C.blue;
        const title =
          cluster.pins.length > 1
            ? cluster.pins.length + " nearby updates"
            : p.title;
        const badge = document.createElement("div");
        badge.textContent =
          cluster.pins.length > 1 ? String(cluster.pins.length) : "";
        Object.assign(badge.style, {
          width: preview ? "22px" : "36px",
          height: preview ? "22px" : "36px",
          borderRadius: "50%",
          background: color,
          border: "3px solid white",
          boxSizing: "border-box",
          color: "white",
          font: preview ? "700 10px system-ui" : "700 16px system-ui",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        });
        const marker = L.marker([cluster.latitude, cluster.longitude], {
          title,
          interactive: !preview,
          keyboard: !preview,
          alt: title,
          icon: L.divIcon({
            html: badge,
            className: "safelygo-map-pin",
            iconSize: preview ? [22, 22] : [44, 44],
            iconAnchor: preview ? [11, 11] : [22, 22],
          }),
        });
        if (inspect.current)
          marker.on("click", () => inspect.current?.(cluster.pins));
        else {
          const label = document.createElement("span");
          label.textContent =
            p.title + (p.description ? " — " + p.description : "");
          marker.bindPopup(label);
        }
        marker.on("add", () =>
          marker.getElement()?.setAttribute("aria-label", title),
        );
        marker.addTo(group);
      }
    },
    [preview],
  );

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((L) => {
      if (disposed || !element.current) return;
      const value = latest.current;
      const m = L.map(element.current, {
        zoomControl: !preview,
        dragging: !preview,
        scrollWheelZoom: !preview,
        doubleClickZoom: !preview,
        touchZoom: !preview,
        boxZoom: !preview,
        keyboard: !preview,
      }).setView([value.latitude, value.longitude], value.zoom);
      map.current = m;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(m);
      if (preview)
        m.getContainer()
          .querySelectorAll<HTMLAnchorElement>("a")
          .forEach((link) => {
            link.tabIndex = -1;
          });
      layers.current = L.layerGroup().addTo(m);
      m.on("click", (e) => select.current?.(e.latlng.lat, e.latlng.lng));
      m.on("zoomend", () => draw(L, latest.current));
      draw(L, value);
      requestAnimationFrame(() => {
        if (!disposed) m.invalidateSize();
      });
    });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
      layers.current = null;
    };
  }, [draw, preview]);
  const pinKey = JSON.stringify(pins);
  useEffect(() => {
    void import("leaflet").then((L) => draw(L, latest.current));
  }, [pinKey, radius, latitude, longitude, draw]);
  useEffect(() => {
    map.current?.setView([latitude, longitude], zoom);
  }, [latitude, longitude, zoom]);
  return (
    <>
      <style>{`@import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');.leaflet-container{font-family:system-ui}.leaflet-control-attribution{font-size:10px}.safelygo-map-pin{display:flex!important;align-items:center;justify-content:center}`}</style>
      <div
        ref={element}
        aria-label="Campus safety map"
        style={{ height, width: "100%", borderRadius: 12, zIndex: 0 }}
      />
    </>
  );
}
