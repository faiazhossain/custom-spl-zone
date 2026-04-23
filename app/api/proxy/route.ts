import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_BARIKOI_API_URL;
const API_TOKEN = process.env.NEXT_PUBLIC_BARIKOI_API_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const url = new URL(request.url);
    const endpoint = url.searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint parameter" }, { status: 400 });
    }

    if (!API_URL || !API_TOKEN) {
      console.error("[PROXY] API not configured", { hasUrl: !!API_URL, hasToken: !!API_TOKEN });
      return NextResponse.json({ error: "API not configured" }, { status: 500 });
    }

    const targetUrl = `${API_URL}${endpoint}`;
    console.log("[PROXY] Forwarding POST request", { targetUrl, body });

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
      },
      body,
    });

    const rawBody = await response.text();
    console.log("[PROXY] Response", { status: response.status, body: rawBody });

    let data = null;
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = rawBody;
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[PROXY] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint parameter" }, { status: 400 });
  }

  if (!API_URL || !API_TOKEN) {
    return NextResponse.json({ error: "API not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        Accept: "application/json, text/plain, */*",
      },
    });

    const rawBody = await response.text();
    const data = rawBody ? JSON.parse(rawBody) : null;

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy error" },
      { status: 500 },
    );
  }
}
