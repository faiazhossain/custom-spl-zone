import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCoordinates(coords: [number, number][]): string {
  if (coords.length < 3) return "";

  const coordsStr = coords.map(([lng, lat]) => `${lng} ${lat}`).join(", ");

  return `POLYGON ((${coordsStr}, ${coords[0][0]} ${coords[0][1]}))`;
}

export function parsePolygonFromWKT(wkt: string): [number, number][] | null {
  try {
    const match = wkt.match(/POLYGON\s*\(\((.*)\)\)/);
    if (!match) return null;

    const coordsStr = match[1];
    const pairs = coordsStr.split(",").map((s) => s.trim().split(/\s+/));

    return pairs
      .map(
        ([lng, lat]) => [parseFloat(lng), parseFloat(lat)] as [number, number],
      )
      .filter(([lng, lat]) => !isNaN(lng) && !isNaN(lat));
  } catch {
    return null;
  }
}

export function formatZoneGeojson(coords: [number, number][]): GeoJSON.Polygon {
  // Close the polygon if not already closed
  const closedCoords =
    coords.length > 0 &&
    (coords[0][0] !== coords[coords.length - 1][0] ||
      coords[0][1] !== coords[coords.length - 1][1])
      ? [...coords, coords[0]]
      : coords;

  return {
    type: "Polygon",
    coordinates: [closedCoords as [number, number][]],
  };
}
