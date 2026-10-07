import type { MapPin } from "./types";
export type PinGroup = {
  id: string;
  latitude: number;
  longitude: number;
  pins: MapPin[];
};
// Cluster by visible distance, preserving every original pin for the detail sheet.
export function groupMapPins(
  pins: MapPin[],
  zoom: number,
  distance = 40,
): PinGroup[] {
  const scale = 256 * 2 ** Math.max(0, Math.min(22, zoom));
  const project = (pin: MapPin) => {
    const latitude = Math.max(
      -85.05112878,
      Math.min(85.05112878, pin.latitude),
    );
    const sine = Math.sin((latitude * Math.PI) / 180);
    return {
      x: ((pin.longitude + 180) / 360) * scale,
      y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale,
    };
  };
  const groups: { anchor: { x: number; y: number }; pins: MapPin[] }[] = [];
  for (const pin of [...pins].sort((a, b) => a.id.localeCompare(b.id))) {
    const point = project(pin);
    const group = groups.find((value) => {
      const dx = Math.abs(point.x - value.anchor.x);
      return (
        Math.hypot(Math.min(dx, scale - dx), point.y - value.anchor.y) <=
        distance
      );
    });
    if (group) group.pins.push(pin);
    else groups.push({ anchor: point, pins: [pin] });
  }
  return groups.map((value) => {
    const first = value.pins[0].longitude;
    const longitude =
      value.pins.reduce(
        (sum, pin) =>
          sum + first + (((pin.longitude - first + 540) % 360) - 180),
        0,
      ) / value.pins.length;
    return {
      id: value.pins.map((pin) => pin.id).join("|"),
      latitude:
        value.pins.reduce((sum, pin) => sum + pin.latitude, 0) /
        value.pins.length,
      longitude: ((longitude + 540) % 360) - 180,
      pins: value.pins,
    };
  });
}
