import { z } from "zod";
import { pool } from "./db.js";
import { hashToken, HttpError } from "./security.js";

// Public Nominatim is opt-in. The limit and cache are shared by all API replicas.
export async function searchPlaces(query: string) {
  const provider = process.env.GEOCODER_SEARCH_URL;
  if (!provider)
    throw new HttpError(
      503,
      "Search is unavailable. Choose your campus on the map or use your location while on campus.",
    );
  const url = new URL(provider);
  const key = hashToken(url.toString() + "\n" + query.toLowerCase());
  const cached = await pool.query(
    "SELECT results FROM geocoder_cache WHERE key=$1 AND expires_at>now()",
    [key],
  );
  if (cached.rowCount) return cached.rows[0].results;
  // Reserve the next slot atomically. A fast retry cannot exceed the global limit,
  // even after a restart or when multiple replicas receive requests together.
  const slot = await pool.query(`INSERT INTO rate_limits(key,hits,reset_at)
    VALUES('geocoder-global',1,now()+interval '1100 milliseconds')
    ON CONFLICT(key) DO UPDATE SET reset_at=excluded.reset_at
    WHERE rate_limits.reset_at<=now() RETURNING key`);
  if (!slot.rowCount)
    throw new HttpError(
      429,
      "Campus search is busy. Wait a moment, then tap Search again.",
    );
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "SafelyGo/1.0 (https://github.com/d1tokirb/BPAV05-SafelyGo)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new HttpError(
      503,
      "Campus search could not connect. Try again or choose the location on the map.",
    );
  }
  if (!response.ok)
    throw new HttpError(
      503,
      "Campus search is temporarily unavailable. You can choose the location on the map.",
    );
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new HttpError(
      503,
      "Campus search returned an unreadable response. Choose the location on the map.",
    );
  }
  const places = z
    .array(
      z.object({
        display_name: z.string().max(1000),
        lat: z.coerce.number().min(-90).max(90),
        lon: z.coerce.number().min(-180).max(180),
      }),
    )
    .max(20)
    .safeParse(body);
  if (!places.success)
    throw new HttpError(
      503,
      "Campus search returned an unreadable response. Choose the location on the map.",
    );
  const results = places.data
    .slice(0, 5)
    .map((place) => ({
      name: place.display_name,
      latitude: place.lat,
      longitude: place.lon,
    }));
  await pool.query("DELETE FROM geocoder_cache WHERE expires_at<=now()");
  await pool.query(
    `INSERT INTO geocoder_cache(key,results,expires_at) VALUES($1,$2,now()+interval '1 day')
    ON CONFLICT(key) DO UPDATE SET results=excluded.results,expires_at=excluded.expires_at`,
    [key, JSON.stringify(results)],
  );
  return results;
}
