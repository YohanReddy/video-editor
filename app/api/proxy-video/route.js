import { NextResponse } from "next/server";

export async function GET(request) {
  const url = new URL(request.url).searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`
      );
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      response.headers.get("content-type") || "video/mp4"
    );
    headers.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(response.body, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: `Failed to fetch video: ${error.message}` },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
