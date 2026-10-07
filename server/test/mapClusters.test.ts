import { test } from "node:test";
import assert from "node:assert/strict";
import { groupMapPins } from "../../mobile/src/mapClusters.js";
const pin = (id: string, latitude: number, longitude: number) => ({
  id,
  latitude,
  longitude,
  title: "Concern " + id,
  description: "Full details " + id,
});
test("overlapping markers preserve every update and its full details", () => {
  const pins = [
    pin("b", 40.73, -73.996),
    pin("a", 40.73, -73.996),
    pin("c", 40.75, -73.98),
  ];
  const groups = groupMapPins(pins, 15);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].pins.length, 2);
  assert.deepEqual(
    groups
      .flatMap((group) => group.pins)
      .map((value) => value.id)
      .sort(),
    ["a", "b", "c"],
  );
  assert.equal(groups[0].pins[0].description, "Full details a");
  assert.deepEqual(groupMapPins([...pins].reverse(), 15), groups);
});
test("zooming separates nearby markers without losing identical-coordinate updates", () => {
  const pins = [
    pin("a", 40.73, -73.996),
    pin("b", 40.73, -73.9958),
    pin("c", 40.73, -73.996),
  ];
  assert.equal(groupMapPins(pins, 15).length, 1);
  assert.equal(groupMapPins(pins, 21).length, 2);
  assert.equal(groupMapPins([], 15).length, 0);
});
test("campuses near the date line cluster at the date line instead of Greenwich", () => {
  const groups = groupMapPins(
    [pin("a", 10, 179.9999), pin("b", 10, -179.9999)],
    15,
  );
  assert.equal(groups.length, 1);
  assert.ok(Math.abs(groups[0].longitude) > 179.99);
  const polar = groupMapPins([pin("a", 90, 0), pin("b", 90, 0)], 15);
  assert.ok(Number.isFinite(polar[0].latitude));
});
