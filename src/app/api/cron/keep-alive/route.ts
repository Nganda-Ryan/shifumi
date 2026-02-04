import { NextResponse } from "next/server";

// This endpoint is called by Vercel Cron to keep the Render.com server alive
// Render free tier spins down after 15 minutes of inactivity

export async function GET() {
  const wsServerUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
  // Convert WebSocket URL to HTTP URL for health check
  const healthUrl = wsServerUrl.replace("wss://", "https://").replace("ws://", "http://").replace(/\/$/, "") + "/health";

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Shi-Fu-Mi-KeepAlive-Cron",
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Keep-alive ping successful:", data);
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        serverStatus: data,
      });
    } else {
      console.error("Keep-alive ping failed:", response.status);
      return NextResponse.json(
        {
          success: false,
          timestamp: new Date().toISOString(),
          error: `Server returned ${response.status}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Keep-alive ping error:", error);
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
