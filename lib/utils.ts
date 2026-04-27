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
    const match = wkt.match(/POLYGON\s*\(\((.*?)\)\)/i);
    if (!match) return null;

    const coordsStr = match[1];
    const pairs = coordsStr.split(",").map((s) => s.trim().split(/\s+/));
    const coordinates = pairs
      .map(
        ([lng, lat]) => [parseFloat(lng), parseFloat(lat)] as [number, number],
      )
      .filter(([lng, lat]) => !isNaN(lng) && !isNaN(lat));

    if (coordinates.length > 0) {
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) {
        coordinates.pop();
      }
    }

    return coordinates.length >= 3 ? coordinates : null;
  } catch {
    return null;
  }
}

export function extractZoneCoordinates(
  zoneGeojson: string,
): [number, number][] | null {
  const geoString = zoneGeojson.trim();

  if (geoString.startsWith("{") || geoString.startsWith("[")) {
    try {
      const parsed = JSON.parse(geoString) as GeoJSON.Geometry;
      if (parsed.type === "Polygon") {
        const coords = parsed.coordinates[0].map(
          (point) => [point[0], point[1]] as [number, number],
        );

        if (coords.length > 0) {
          const first = coords[0];
          const last = coords[coords.length - 1];
          if (first[0] === last[0] && first[1] === last[1]) {
            coords.pop();
          }
        }

        return coords.length >= 3 ? coords : null;
      }
    } catch {
      // Fall through to WKT parsing
    }
  }

  return parsePolygonFromWKT(geoString);
}

export function toPolygonWkt(coordinates: [number, number][]): string {
  const closed = [...coordinates, coordinates[0]];
  return `POLYGON ((${closed.map(([lng, lat]) => `${lng} ${lat}`).join(", ")}))`;
}

export function toPolygonGeoJsonFeature(
  coordinates: [number, number][],
  properties?: Record<string, unknown>,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const closed = [...coordinates, coordinates[0]];
  return {
    type: "Feature",
    properties: properties ?? {},
    geometry: {
      type: "Polygon",
      coordinates: [closed],
    },
  };
}

export function toLngLatList(coordinates: [number, number][]): string {
  return coordinates.map(([lng, lat]) => `${lng},${lat}`).join("\n");
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
