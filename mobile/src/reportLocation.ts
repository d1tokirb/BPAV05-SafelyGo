type Point = { latitude: number; longitude: number };
export function isNearCampus(point: Point, campus: Point & { radius_m: number }) {
  if (![point.latitude, point.longitude, campus.latitude, campus.longitude, campus.radius_m].every(Number.isFinite)
    || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180 || campus.radius_m < 0) return false;
  const rad = Math.PI / 180;
  const h = Math.sin((point.latitude - campus.latitude) * rad / 2) ** 2
    + Math.cos(point.latitude * rad) * Math.cos(campus.latitude * rad)
    * Math.sin((point.longitude - campus.longitude) * rad / 2) ** 2;
  const bounded = Math.min(1, Math.max(0, h));
  const meters = 6371000 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded));
  // Match the API policy: campus boundary plus a 1 km surrounding area.
  return meters <= campus.radius_m + 1000;
}
