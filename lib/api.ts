import { Zone, CreateZoneRequest, ApiResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_BARIKOI_API_URL;
const API_TOKEN = process.env.NEXT_PUBLIC_BARIKOI_API_TOKEN;

if (!API_URL) {
  console.error("NEXT_PUBLIC_BARIKOI_API_URL is not defined");
}

if (!API_TOKEN) {
  console.error("NEXT_PUBLIC_BARIKOI_API_TOKEN is not defined");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.message || data.error || "An error occurred",
      };
    }

    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export const api = {
  async createZone(payload: CreateZoneRequest): Promise<ApiResponse<Zone>> {
    return request<Zone>("/add-custom-zone-polygon", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateZone(
    id: string,
    payload: CreateZoneRequest
  ): Promise<ApiResponse<Zone>> {
    return request<Zone>(`/zones/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteZone(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return request<{ success: boolean }>(`/zones/${id}`, {
      method: "DELETE",
    });
  },

  async getZones(): Promise<ApiResponse<Zone[]>> {
    return request<Zone[]>("/zones", {
      method: "GET",
    });
  },
};
