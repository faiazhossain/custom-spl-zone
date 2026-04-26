import { ApiResponse, CreateZoneRequest, Zone } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_BARIKOI_API_URL;
const API_TOKEN = process.env.NEXT_PUBLIC_BARIKOI_API_TOKEN;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function extractMessage(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  if (typeof payload.message === "string") return payload.message;
  if (typeof payload.error === "string") return payload.error;
  return undefined;
}

function extractData(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  if ("data" in payload) return payload.data;
  if ("result" in payload) return payload.result;
  return payload;
}

function toZone(value: unknown): Zone | null {
  if (!isRecord(value)) return null;

  const rawId = value.id ?? value.zone_id;
  const rawName = value.zone_name ?? value.name;
  const rawGeo = value.zone_geojson ?? value.geojson;

  if (
    (typeof rawId !== "string" && typeof rawId !== "number") ||
    typeof rawName !== "string" ||
    typeof rawGeo !== "string"
  ) {
    return null;
  }

  return {
    id: String(rawId),
    zone_name: rawName,
    zone_geojson: rawGeo,
    created_at:
      typeof value.created_at === "string" ? value.created_at : undefined,
    updated_at:
      typeof value.updated_at === "string" ? value.updated_at : undefined,
  };
}

function toZones(value: unknown): Zone[] {
  const candidates = [
    value,
    isRecord(value) ? value.zones : undefined,
    isRecord(value) ? value.items : undefined,
    isRecord(value) ? value.results : undefined,
    isRecord(value) && isRecord(value.data) ? value.data.zones : undefined,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate
      .map((item) => toZone(item))
      .filter((zone): zone is Zone => zone !== null);
  }

  return [];
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  if (!API_URL) {
    return { error: "API URL is not configured" };
  }

  if (!API_TOKEN) {
    return { error: "API token is not configured" };
  }

  const isServer = typeof window === "undefined";

  try {
    let response: Response;

    if (isServer) {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
          ...options.headers,
        },
      });
    } else {
      const method = options.method || "GET";
      const basePath = process.env.NEXT_PUBLIC_BASEPATH || "";
      const url = `${basePath}/api/proxy?endpoint=${encodeURIComponent(endpoint)}`;
      response = await fetch(url, {
        ...options,
        method,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
    }

    const rawBody = await response.text();
    const payload = rawBody ? JSON.parse(rawBody) : null;
    const message = extractMessage(payload);

    if (!response.ok) {
      return {
        error: message || `Request failed with status ${response.status}`,
        message,
      };
    }

    return {
      data: extractData(payload) as T,
      message,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export const api = {
  async createZone(payload: CreateZoneRequest): Promise<ApiResponse<Zone>> {
    const response = await request<unknown>("/add-custom-zone-polygon", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (response.error) {
      return { error: response.error, message: response.message };
    }

    const normalized = toZone(response.data);
    return {
      data: normalized ?? {
        id: Date.now().toString(),
        zone_name: payload.zone_name,
        zone_geojson: payload.zone_geojson,
      },
      message: response.message,
    };
  },

  async updateZone(
    id: string,
    payload: CreateZoneRequest,
  ): Promise<ApiResponse<Zone>> {
    const response = await request<unknown>(`/edit-custom-zone-polygon/${id}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (response.error) {
      return { error: response.error, message: response.message };
    }

    const normalized = toZone(response.data);
    return {
      data: normalized ?? {
        id,
        zone_name: payload.zone_name,
        zone_geojson: payload.zone_geojson,
      },
      message: response.message,
    };
  },

  async deleteZone(id: string): Promise<ApiResponse<{ success: boolean }>> {
    const response = await request<unknown>(
      `/delete-custom-zone-polygon/${id}`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    if (response.error) {
      return { error: response.error, message: response.message };
    }

    return {
      data: { success: true },
      message: response.message,
    };
  },

  async getZones(): Promise<ApiResponse<Zone[]>> {
    const response = await request<unknown>("/get-custom-zone-polygon", {
      method: "GET",
    });

    if (response.error) {
      return { error: response.error, message: response.message };
    }

    return {
      data: toZones(response.data),
      message: response.message,
    };
  },
};
