export interface Zone {
  id: string;
  zone_name: string;
  zone_geojson: string;
  created_at?: string;
  updated_at?: string;
}

export interface ZoneFormData {
  name: string;
}

export interface CreateZoneRequest {
  zone_name: string;
  zone_geojson: string; // WKT format: POLYGON ((lng1 lat1, lng2 lat2, ...))
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface DrawingState {
  isDrawing: boolean;
  isEditing: boolean;
  currentPoints: [number, number][];
  selectedZoneId: string | null;
}

export type DrawingMode = "none" | "drawing" | "editing";

export interface PolygonLayerOptions {
  id: string;
  sourceId: string;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}
